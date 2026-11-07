import { getBlob } from '../db'

const bitmaps = new Map<string, ImageBitmap>()
const pending = new Map<string, Promise<ImageBitmap | undefined>>()
const listeners = new Set<() => void>()

/** Avisa cuando una imagen termina de cargar (para volver a dibujar). */
export function onImageLoaded(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getBitmap(blobId: string): ImageBitmap | undefined {
  const bmp = bitmaps.get(blobId)
  if (!bmp) void loadBitmap(blobId)
  return bmp
}

export function loadBitmap(blobId: string): Promise<ImageBitmap | undefined> {
  const ready = bitmaps.get(blobId)
  if (ready) return Promise.resolve(ready)
  let p = pending.get(blobId)
  if (!p) {
    p = getBlob(blobId)
      .then((blob) => (blob ? createImageBitmap(blob) : undefined))
      .then((bmp) => {
        if (bmp) {
          bitmaps.set(blobId, bmp)
          listeners.forEach((fn) => fn())
        }
        return bmp
      })
      .catch(() => undefined)
      .finally(() => pending.delete(blobId))
    pending.set(blobId, p)
  }
  return p
}

export function rememberBitmap(blobId: string, bmp: ImageBitmap) {
  bitmaps.set(blobId, bmp)
}

/** Reduce imágenes enormes para no llenar el almacenamiento de la tablet. */
export async function prepareImage(file: Blob, maxSide = 2400): Promise<{ blob: Blob; bitmap: ImageBitmap }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 4_000_000) return { blob: file, bitmap }
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  const isPng = file.type === 'image/png'
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen'))), isPng ? 'image/png' : 'image/jpeg', 0.9),
  )
  bitmap.close()
  return { blob, bitmap: await createImageBitmap(blob) }
}
