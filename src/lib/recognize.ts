import { strokeOutline } from './canvas/render'
import { contentBounds } from './canvas/geom'
import type { Recognition, StrokeEl } from './types'

export class RecognitionError extends Error {}

/** Firma HMAC-SHA512 que pide MyScript (llave = applicationKey + hmacKey, resultado en hex). */
export async function myscriptHmac(message: string, applicationKey: string, hmacKey: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(applicationKey + hmacKey), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** MyScript reconoce directamente los trazos (tinta digital), sin pasar por una imagen. */
async function viaMyScript(strokes: StrokeEl[], cfg: Recognition): Promise<string> {
  if (!cfg.myscriptApp || !cfg.myscriptHmac) throw new RecognitionError('Falta configurar las llaves de MyScript en Ajustes.')
  let t = 0
  const data = {
    configuration: {
      lang: 'es_ES',
      text: { guides: { enable: false } },
      export: { jiix: { 'bounding-box': false, strokes: false, text: { chars: false, words: false } } },
    },
    scaleX: 0.265,
    scaleY: 0.265,
    contentType: 'Text',
    strokes: strokes.map((s, i) => {
      const x: number[] = []
      const y: number[] = []
      const ts: number[] = []
      const p: number[] = []
      for (let k = 0; k < s.points.length; k += 3) {
        x.push(Math.round(s.points[k] * 10) / 10)
        y.push(Math.round(s.points[k + 1] * 10) / 10)
        ts.push((t += 8))
        p.push(Math.round(s.points[k + 2] * 100) / 100)
      }
      t += 120
      return { id: 's' + i, pointerType: 'pen', x, y, t: ts, p }
    }),
  }
  const body = JSON.stringify(data)
  const res = await fetch('https://cloud.myscript.com/api/v4.0/iink/recognize', {
    method: 'POST',
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json',
      applicationKey: cfg.myscriptApp,
      hmac: await myscriptHmac(body, cfg.myscriptApp, cfg.myscriptHmac),
    },
    body,
    credentials: 'omit',
  })
  if (res.status === 401 || res.status === 403) throw new RecognitionError('MyScript rechazó las llaves. Revísalas en Ajustes.')
  if (!res.ok) throw new RecognitionError(`MyScript respondió con un error (${res.status}).`)
  return (await res.text()).trim()
}

/** Dibuja los trazos en negro sobre blanco para mandarlos como imagen. */
function strokesToPng(strokes: StrokeEl[]): Promise<Blob> {
  const b = contentBounds(strokes)!
  const pad = 24
  // Letras de unos 60 px: tamaño cómodo para el OCR, sin imágenes enormes.
  const scale = Math.min(4, Math.max(0.5, 1600 / Math.max(b.w, b.h, 1)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((b.w + pad * 2) * scale)
  canvas.height = Math.ceil((b.h + pad * 2) * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(scale, 0, 0, scale, (pad - b.x) * scale, (pad - b.y) * scale)
  ctx.fillStyle = '#000'
  for (const s of strokes) ctx.fill(strokeOutline(s.points, 'pluma', Math.max(3, Math.min(s.size, 8)), s.pressure, true))
  return new Promise((res, rej) => canvas.toBlob((bl) => (bl ? res(bl) : rej(new RecognitionError('No se pudo preparar la imagen.'))), 'image/png'))
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Google Cloud Vision: OCR de escritura a mano sobre una imagen de los trazos. */
async function viaGoogle(strokes: StrokeEl[], cfg: Recognition): Promise<string> {
  if (!cfg.googleKey) throw new RecognitionError('Falta configurar la llave de Google en Ajustes.')
  const content = await blobToBase64(await strokesToPng(strokes))
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(cfg.googleKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ image: { content }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], imageContext: { languageHints: ['es'] } }],
    }),
  })
  if (res.status === 400 || res.status === 403) throw new RecognitionError('Google rechazó la llave. Revísala en Ajustes.')
  if (!res.ok) throw new RecognitionError(`Google respondió con un error (${res.status}).`)
  const json = await res.json()
  const err = json.responses?.[0]?.error
  if (err) throw new RecognitionError('Google: ' + err.message)
  return (json.responses?.[0]?.fullTextAnnotation?.text ?? '').trim()
}

export function recognitionReady(cfg: Recognition): boolean {
  return (cfg.proveedor === 'myscript' && !!cfg.myscriptApp && !!cfg.myscriptHmac) || (cfg.proveedor === 'google' && !!cfg.googleKey)
}

/** Convierte trazos a texto con el servicio configurado. */
export async function recognize(strokes: StrokeEl[], cfg: Recognition): Promise<string> {
  if (!strokes.length) return ''
  if (cfg.proveedor === 'ninguno') throw new RecognitionError('Para convertir tu letra, elige un servicio de reconocimiento en Ajustes.')
  if (!navigator.onLine) throw new RecognitionError('Sin internet no se puede convertir la letra. Tus trazos se quedan como están ♡')
  const run = cfg.proveedor === 'myscript' ? viaMyScript : viaGoogle
  try {
    return await run(strokes, cfg)
  } catch (err) {
    if (err instanceof RecognitionError) throw err
    throw new RecognitionError('No se pudo conectar con el servicio de reconocimiento.')
  }
}
