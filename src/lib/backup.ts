import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type { TrazoDB } from './db'
import type { BlobRecord, Note, NoteContent, Notebook, Settings } from './types'

export const BACKUP_VERSION = 1

interface BackupData {
  app: 'trazo'
  version: number
  createdAt: number
  notebooks: Notebook[]
  notes: (Omit<Note, 'thumb'> & { thumb: { type: string; file: string } | null })[]
  contents: NoteContent[]
  blobs: { id: string; type: string; file: string }[]
  settings: Partial<Settings>
}

/** Crea el archivo .trazo con todo: cuadernos, notas, imágenes y ajustes. */
export async function createBackup(db: TrazoDB): Promise<Uint8Array> {
  const [notebooks, notes, contents, blobs, settingRows] = await Promise.all([
    db.notebooks.toArray(),
    db.notes.toArray(),
    db.contents.toArray(),
    db.blobs.toArray(),
    db.settings.toArray(),
  ])
  const files: Record<string, Uint8Array> = {}
  const data: BackupData = {
    app: 'trazo',
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    notebooks,
    notes: notes.map((n) => {
      if (!n.thumb) return { ...n, thumb: null }
      const file = `miniaturas/${n.id}`
      files[file] = new Uint8Array(n.thumb.data)
      return { ...n, thumb: { type: n.thumb.type, file } }
    }),
    contents,
    blobs: blobs.map((b) => {
      const file = `archivos/${b.id}`
      files[file] = new Uint8Array(b.data)
      return { id: b.id, type: b.type, file }
    }),
    // El "último respaldo" es de este dispositivo, no se copia.
    settings: Object.fromEntries(settingRows.filter((r) => r.key !== 'ultimoRespaldo').map((r) => [r.key, r.value])),
  }
  files['trazo.json'] = strToU8(JSON.stringify(data))
  // Las imágenes ya vienen comprimidas: no vale la pena volver a comprimirlas.
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: k === 'trazo.json' ? 6 : 0 }]])) as never,
  )
}

export interface RestoreResult {
  notebooks: number
  notes: number
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

/**
 * Restaura un respaldo.
 * - reemplazar: borra todo lo que hay y deja exactamente lo del archivo.
 * - combinar: agrega lo del archivo; si algo existe en los dos, gana la versión más reciente.
 */
export async function restoreBackup(db: TrazoDB, bytes: Uint8Array, mode: 'reemplazar' | 'combinar'): Promise<RestoreResult> {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('El archivo no es un respaldo de Trazo.')
  }
  const raw = files['trazo.json']
  if (!raw) throw new Error('El archivo no es un respaldo de Trazo.')
  const data = JSON.parse(strFromU8(raw)) as BackupData
  if (data.app !== 'trazo') throw new Error('El archivo no es un respaldo de Trazo.')
  if (data.version > BACKUP_VERSION) throw new Error('Este respaldo es de una versión más nueva de Trazo. Actualiza la app.')

  const notes: Note[] = data.notes.map((n) => ({
    ...n,
    thumb: n.thumb && files[n.thumb.file] ? { type: n.thumb.type, data: toArrayBuffer(files[n.thumb.file]) } : null,
  }))
  const blobs: BlobRecord[] = data.blobs
    .filter((b) => files[b.file])
    .map((b) => ({ id: b.id, type: b.type, data: toArrayBuffer(files[b.file]) }))

  await db.transaction('rw', [db.notebooks, db.notes, db.contents, db.blobs, db.settings], async () => {
    if (mode === 'reemplazar') {
      await Promise.all([db.notebooks.clear(), db.notes.clear(), db.contents.clear(), db.blobs.clear()])
      await db.notebooks.bulkPut(data.notebooks)
      await db.notes.bulkPut(notes)
      await db.contents.bulkPut(data.contents)
      await db.blobs.bulkPut(blobs)
      await db.settings.bulkPut(Object.entries(data.settings).map(([key, value]) => ({ key, value })))
      return
    }
    const existingNb = new Map((await db.notebooks.toArray()).map((n) => [n.id, n]))
    await db.notebooks.bulkPut(data.notebooks.filter((n) => !existingNb.has(n.id) || existingNb.get(n.id)!.updatedAt < n.updatedAt))
    const existingNotes = new Map((await db.notes.toArray()).map((n) => [n.id, n]))
    const newer = notes.filter((n) => !existingNotes.has(n.id) || existingNotes.get(n.id)!.updatedAt < n.updatedAt)
    const newerIds = new Set(newer.map((n) => n.id))
    await db.notes.bulkPut(newer)
    await db.contents.bulkPut(data.contents.filter((c) => newerIds.has(c.noteId)))
    await db.blobs.bulkPut(blobs)
  })
  return { notebooks: data.notebooks.length, notes: notes.length }
}
