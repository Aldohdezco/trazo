/**
 * Recortar el sujeto de una foto (quitar el fondo) en el propio dispositivo.
 * Modelo: RMBG-1.4 de BRIA (uso no comercial), corrido con transformers.js.
 * La primera vez descarga ~44 MB; después queda guardado y funciona sin internet.
 */

const MODEL = 'briaai/RMBG-1.4'
/** Umbrales de la máscara (0–255): debajo de LOW es fondo, arriba de HIGH es sujeto. */
const LOW = 70
const HIGH = 190

type Loaded = {
  model: (inputs: Record<string, unknown>) => Promise<{ output: { mul: (n: number) => { to: (t: string) => unknown } }[] }>
  processor: (image: unknown) => Promise<{ pixel_values: unknown }>
  RawImage: typeof import('@huggingface/transformers').RawImage
}

let loading: Promise<Loaded> | null = null

export type Progress = (percent: number | null) => void

function load(onProgress?: Progress): Promise<Loaded> {
  loading ??= (async () => {
    const tf = await import('@huggingface/transformers')
    tf.env.allowLocalModels = false
    const files = new Map<string, { loaded: number; total: number }>()
    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== 'progress' || !p.file) return
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
      let loaded = 0
      let total = 0
      for (const f of files.values()) {
        loaded += f.loaded
        total += f.total
      }
      onProgress?.(total ? Math.round((loaded / total) * 100) : null)
    }
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator
    const model = await tf.AutoModel.from_pretrained(MODEL, {
      config: { model_type: 'custom' } as never,
      dtype: hasWebGPU ? 'fp16' : 'q8',
      device: hasWebGPU ? 'webgpu' : 'wasm',
      progress_callback,
    }).catch(() =>
      // Si WebGPU falla en este dispositivo, la versión ligera en el procesador.
      tf.AutoModel.from_pretrained(MODEL, { config: { model_type: 'custom' } as never, dtype: 'q8', device: 'wasm', progress_callback }),
    )
    const processor = await tf.AutoProcessor.from_pretrained(MODEL, {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: 'ImageFeatureExtractor',
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    } as never)
    return { model: model as unknown as Loaded['model'], processor: processor as unknown as Loaded['processor'], RawImage: tf.RawImage }
  })().catch((err) => {
    loading = null
    throw err
  })
  return loading
}

/**
 * Borra las "islitas" sueltas del fondo: se queda con las manchas grandes conectadas
 * (el sujeto) y apaga todo lo demás. Trabaja en una cuadrícula pequeña para ser rápido.
 * Devuelve el rectángulo de lo que quedó, o null si no quedó nada.
 */
export function keepMainShapes(rgba: Uint8ClampedArray, W: number, H: number) {
  const s = Math.max(1, Math.ceil(Math.max(W, H) / 320))
  const gw = Math.ceil(W / s)
  const gh = Math.ceil(H / s)
  const solid = new Uint8Array(gw * gh)
  const sum = new Float32Array(gw * gh)
  const cnt = new Uint16Array(gw * gh)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = ((y / s) | 0) * gw + ((x / s) | 0)
      sum[c] += rgba[(y * W + x) * 4 + 3]
      cnt[c]++
    }
  }
  for (let c = 0; c < solid.length; c++) solid[c] = sum[c] / cnt[c] > 128 ? 1 : 0

  // Manchas conectadas (vecinos arriba/abajo/izquierda/derecha)
  const label = new Int32Array(gw * gh).fill(-1)
  const areas: number[] = []
  const queue = new Int32Array(gw * gh)
  for (let start = 0; start < solid.length; start++) {
    if (!solid[start] || label[start] >= 0) continue
    const id = areas.length
    let head = 0
    let tail = 0
    queue[tail++] = start
    label[start] = id
    let area = 0
    while (head < tail) {
      const c = queue[head++]
      area++
      const cx = c % gw
      const cy = (c / gw) | 0
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const n = ny * gw + nx
        if (solid[n] && label[n] < 0) {
          label[n] = id
          queue[tail++] = n
        }
      }
    }
    areas.push(area)
  }
  if (!areas.length) return null
  const biggest = Math.max(...areas)
  // Se quedan las manchas de al menos 8 % de la más grande (p. ej. dos personas).
  const keepCell = new Uint8Array(gw * gh)
  for (let c = 0; c < label.length; c++) if (label[c] >= 0 && areas[label[c]] >= biggest * 0.08) keepCell[c] = 1
  // Un poquito de margen para no cortar la orilla suave
  const near = keepCell.slice()
  for (let c = 0; c < keepCell.length; c++) {
    if (!keepCell[c]) continue
    const cx = c % gw
    const cy = (c / gw) | 0
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) near[ny * gw + nx] = 1
      }
  }

  // Celdas interiores: sujeto por los cuatro lados (no son orilla).
  const inner = new Uint8Array(gw * gh)
  for (let c = 0; c < keepCell.length; c++) {
    const cx = c % gw
    const cy = (c / gw) | 0
    if (keepCell[c] && cx > 0 && cy > 0 && cx < gw - 1 && cy < gh - 1 && keepCell[c - 1] && keepCell[c + 1] && keepCell[c - gw] && keepCell[c + gw]) inner[c] = 1
  }

  let minX = W
  let minY = H
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4 + 3
      const c = ((y / s) | 0) * gw + ((x / s) | 0)
      if (!near[c]) rgba[i] = 0
      else if (inner[c]) rgba[i] = 255 // huequitos dentro del sujeto: sólidos
      if (rgba[i] > 128) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY }
}

/**
 * Devuelve el sujeto recortado (PNG transparente, ya sin bordes vacíos)
 * y qué parte de la foto original ocupa (en proporción 0–1), para ponerlo encima.
 */
export async function cutSubject(
  photo: Blob,
  onProgress?: Progress,
): Promise<{ blob: Blob; box: { x: number; y: number; w: number; h: number }; width: number; height: number }> {
  let loaded: Loaded
  try {
    loaded = await load(onProgress)
  } catch {
    throw new Error('No se pudo descargar el recortador. La primera vez necesita internet.')
  }
  const image = await loaded.RawImage.fromBlob(photo)
  const { pixel_values } = await loaded.processor(image)
  const { output } = await loaded.model({ input: pixel_values })
  const mask = await loaded.RawImage.fromTensor(output[0].mul(255).to('uint8') as never).resize(image.width, image.height)

  // Foto + máscara como transparencia
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(await createImageBitmap(photo), 0, 0, image.width, image.height)
  const px = ctx.getImageData(0, 0, image.width, image.height)
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1
  for (let i = 0; i < mask.data.length; i++) {
    // Limpia la máscara: restos muy tenues del fondo fuera, casi sólido = sólido, orilla suave.
    const a = Math.max(0, Math.min(255, Math.round(((mask.data[i] - LOW) * 255) / (HIGH - LOW))))
    px.data[i * 4 + 3] = a
    if (a > 128) {
      const x = i % image.width
      const y = (i / image.width) | 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new Error('No encontré ningún sujeto en esa foto.')
  const kept = keepMainShapes(px.data, image.width, image.height)
  if (!kept) throw new Error('No encontré ningún sujeto en esa foto.')
  ;({ minX, minY, maxX, maxY } = kept)
  ctx.putImageData(px, 0, 0)

  // Recorta lo vacío alrededor
  const pad = 4
  const x = Math.max(0, minX - pad)
  const y = Math.max(0, minY - pad)
  const w = Math.min(image.width, maxX + pad + 1) - x
  const h = Math.min(image.height, maxY + pad + 1) - y
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')!.drawImage(canvas, x, y, w, h, 0, 0, w, h)
  const blob = await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo recortar'))), 'image/png'))
  return { blob, box: { x: x / image.width, y: y / image.height, w: w / image.width, h: h / image.height }, width: w, height: h }
}
