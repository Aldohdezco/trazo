import { rememberBitmap } from './canvas/images'
import { putBlob } from './db'
import type { ImageEl } from './types'
import { uid } from './util'

/** Ancho de cada página en el lienzo (una hoja carta). */
export const PDF_PAGE_W = 816
const PAGE_GAP = 40
const MAX_PAGES = 80

/**
 * Convierte cada página de un PDF en una imagen fija (bloqueada) para escribir encima.
 * Las páginas quedan una debajo de otra empezando en (x, y).
 */
export async function pdfToPages(file: Blob, x: number, y: number, onProgress?: (done: number, total: number) => void): Promise<{ pages: ImageEl[]; skipped: number }> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  let doc
  try {
    doc = await task.promise
  } catch (err) {
    if ((err as Error).name === 'PasswordException') throw new Error('Ese PDF tiene contraseña. Ábrelo sin contraseña e inténtalo otra vez.')
    throw new Error('No se pudo leer el PDF.')
  }
  const total = Math.min(doc.numPages, MAX_PAGES)
  const pages: ImageEl[] = []
  let top = y
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i)
    const base = page.getViewport({ scale: 1 })
    // ~1700 px de ancho: se lee bien al acercar sin llenar la memoria del iPad.
    const scale = Math.min(3, 1700 / base.width)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo leer una página'))), 'image/jpeg', 0.9))
    const blobId = await putBlob(blob)
    rememberBitmap(blobId, await createImageBitmap(canvas))
    const w = PDF_PAGE_W
    const h = (PDF_PAGE_W * base.height) / base.width
    pages.push({ type: 'image', id: uid(), x, y: top, w, h, rotation: 0, blobId, locked: true })
    top += h + PAGE_GAP
    page.cleanup()
    canvas.width = canvas.height = 0
    onProgress?.(i, total)
  }
  const skipped = Math.max(0, doc.numPages - total)
  await task.destroy()
  return { pages, skipped }
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}
