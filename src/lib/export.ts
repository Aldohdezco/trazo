import { drawPaper } from './canvas/background'
import { contentBounds } from './canvas/geom'
import { loadBitmap } from './canvas/images'
import { drawElements } from './canvas/render'
import type { Background, El, Rect } from './types'
import { isDark, safeFileName } from './util'

async function preloadImages(els: El[]) {
  await Promise.all(els.filter((e) => e.type === 'image').map((e) => loadBitmap(e.blobId)))
  if (document.fonts) await document.fonts.ready
}

/** Dibuja una región del mundo en un canvas nuevo. */
export function renderRegion(els: El[], bg: Background, region: Rect, scale: number, transparent = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(region.w * scale))
  canvas.height = Math.max(1, Math.round(region.h * scale))
  const ctx = canvas.getContext('2d')!
  const view = { x: region.x, y: region.y, zoom: scale }
  if (!transparent) drawPaper(ctx, bg, view, canvas.width, canvas.height)
  ctx.setTransform(scale, 0, 0, scale, -region.x * scale, -region.y * scale)
  drawElements(ctx, els, region, { darkPaper: isDark(bg.color) })
  return canvas
}

function padded(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }
}

function toBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la imagen'))), type, quality))
}

/** Límite de píxeles de canvas en Safari de iPad (~16 MP); nos quedamos debajo. */
function safeScale(r: Rect, wanted: number, maxPixels = 14_000_000): number {
  return Math.min(wanted, Math.sqrt(maxPixels / Math.max(1, r.w * r.h)))
}

export async function exportPng(els: El[], bg: Background, onlyIds?: Set<string>): Promise<Blob> {
  const subset = onlyIds ? els.filter((e) => onlyIds.has(e.id)) : els
  await preloadImages(subset)
  const b = contentBounds(subset)
  const region = padded(b ?? { x: 0, y: 0, w: 816, h: 1056 }, 32)
  const canvas = renderRegion(subset, bg, region, safeScale(region, 2), !!onlyIds)
  return toBlob(canvas)
}

const SHEETS = {
  carta: { w: 612, h: 792 },
  a4: { w: 595.28, h: 841.89 },
}

/**
 * Corta el contenido en hojas del tamaño elegido.
 * El ancho de la hoja cubre todo el ancho del contenido (mínimo una hoja carta),
 * y el contenido se reparte hacia abajo en tantas hojas como haga falta.
 */
export function pageRegions(content: Rect | null, sheet: 'carta' | 'a4'): Rect[] {
  const { w: pw, h: ph } = SHEETS[sheet]
  const ratio = ph / pw
  const base = content ? padded(content, 40) : { x: 0, y: 0, w: 816, h: 816 * ratio }
  const width = Math.max(base.w, 816)
  const height = width * ratio
  const x = base.x - (width - base.w) / 2
  const count = Math.max(1, Math.ceil(base.h / height - 0.02))
  return Array.from({ length: count }, (_, i) => ({ x, y: base.y + i * height, w: width, h: height }))
}

export async function exportPdf(pages: { els: El[]; bg: Background }[], sheet: 'carta' | 'a4'): Promise<Blob> {
  // pdf-lib es pesada: se carga solo al exportar.
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const { w: pw, h: ph } = SHEETS[sheet]
  for (const { els, bg } of pages) {
    await preloadImages(els)
    for (const region of pageRegions(contentBounds(els), sheet)) {
      // ~200 ppp: nítido al imprimir sin hacer archivos enormes.
      const scale = safeScale(region, (pw / region.w) * (200 / 72))
      const canvas = renderRegion(els, bg, region, scale)
      const jpg = await toBlob(canvas, 'image/jpeg', 0.92)
      const img = await pdf.embedJpg(await jpg.arrayBuffer())
      pdf.addPage([pw, ph]).drawImage(img, { x: 0, y: 0, width: pw, height: ph })
    }
  }
  const bytes = await pdf.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

export async function makeThumbnail(els: El[], bg: Background): Promise<Blob | null> {
  const b = contentBounds(els)
  if (!b) return null
  await preloadImages(els)
  // Desde la esquina superior izquierda del contenido, en proporción 3:4.
  const w = Math.max(b.w + 48, 500)
  const region = { x: b.x - 24, y: b.y - 24, w, h: (w * 4) / 3 }
  const canvas = renderRegion(els, bg, region, 360 / region.w)
  return toBlob(canvas, 'image/webp', 0.8).catch(() => toBlob(canvas, 'image/png'))
}

/** Descarga o comparte un archivo (en iPad, compartir funciona mejor que descargar). */
export async function saveFile(blob: Blob, name: string) {
  const fileName = safeFileName(name)
  const file = new File([blob], fileName, { type: blob.type })
  const isTouch = matchMedia('(pointer: coarse)').matches
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
