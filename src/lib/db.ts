import Dexie, { type Table } from 'dexie'
import type { Background, BlobRecord, Cover, El, Note, NoteContent, Notebook, Settings } from './types'
import { uid } from './util'

interface SettingRow {
  key: string
  value: unknown
}

export class TrazoDB extends Dexie {
  notebooks!: Table<Notebook, string>
  notes!: Table<Note, string>
  contents!: Table<NoteContent, string>
  blobs!: Table<BlobRecord, string>
  settings!: Table<SettingRow, string>

  constructor(name = 'trazo') {
    super(name)
    this.version(1).stores({
      notebooks: 'id, order',
      notes: 'id, notebookId, updatedAt',
      contents: 'noteId',
      blobs: 'id',
      settings: 'key',
    })
  }
}

export const db = new TrazoDB()

// ---------- Ajustes ----------

export const DEFAULT_SETTINGS: Settings = {
  soloLapiz: false,
  tema: 'auto',
  recordatorioDias: 7,
  ultimoRespaldo: null,
  coloresFavoritos: [],
  hojaPdf: 'carta',
}

export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const s: Settings = { ...DEFAULT_SETTINGS }
  for (const r of rows) {
    if (r.key in s) (s as unknown as Record<string, unknown>)[r.key] = r.value
  }
  return s
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value })
}

// ---------- Cuadernos ----------

export async function listNotebooks(includeDeleted = false): Promise<Notebook[]> {
  const all = await db.notebooks.orderBy('order').toArray()
  return all.filter((n) => (includeDeleted ? n.deletedAt !== null : n.deletedAt === null))
}

export async function getNotebook(id: string) {
  return db.notebooks.get(id)
}

export async function createNotebook(name: string, cover: Cover, background: Background): Promise<Notebook> {
  const last = await db.notebooks.orderBy('order').last()
  const now = Date.now()
  const nb: Notebook = {
    id: uid(),
    name: name.trim() || 'Mi cuaderno',
    cover: $plain(cover),
    background: $plain(background),
    order: (last?.order ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.notebooks.add(nb)
  return nb
}

export async function updateNotebook(id: string, changes: Partial<Notebook>) {
  await db.notebooks.update(id, { ...$plain(changes), updatedAt: Date.now() })
}

export async function trashNotebook(id: string) {
  await db.notebooks.update(id, { deletedAt: Date.now() })
}

export async function restoreNotebook(id: string) {
  await db.notebooks.update(id, { deletedAt: null })
}

export async function deleteNotebookForever(id: string) {
  await db.transaction('rw', db.notebooks, db.notes, db.contents, async () => {
    const notes = await db.notes.where('notebookId').equals(id).primaryKeys()
    await db.contents.bulkDelete(notes)
    await db.notes.bulkDelete(notes)
    await db.notebooks.delete(id)
  })
  await collectGarbage()
}

/** Intercambia el orden de un cuaderno con su vecino. */
export async function moveNotebook(id: string, dir: -1 | 1) {
  const list = await listNotebooks()
  const i = list.findIndex((n) => n.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  const a = list[i]
  const b = list[j]
  await db.transaction('rw', db.notebooks, async () => {
    await db.notebooks.update(a.id, { order: b.order })
    await db.notebooks.update(b.id, { order: a.order })
  })
}

export async function duplicateNotebook(id: string): Promise<Notebook | undefined> {
  const src = await db.notebooks.get(id)
  if (!src) return
  const copy = await createNotebook(src.name + ' (copia)', src.cover, src.background)
  const notes = await listNotes(id)
  for (const n of notes) await duplicateNote(n.id, copy.id, n.title)
  return copy
}

// ---------- Notas ----------

export async function listNotes(notebookId: string, includeDeleted = false): Promise<Note[]> {
  const all = await db.notes.where('notebookId').equals(notebookId).toArray()
  return all
    .filter((n) => (includeDeleted ? n.deletedAt !== null : n.deletedAt === null))
    .sort((a, b) => a.order - b.order)
}

export async function listTrashedNotes(): Promise<Note[]> {
  const all = await db.notes.toArray()
  return all.filter((n) => n.deletedAt !== null)
}

export async function getNote(id: string) {
  return db.notes.get(id)
}

export async function createNote(notebookId: string, title: string, background: Background): Promise<Note> {
  const siblings = await db.notes.where('notebookId').equals(notebookId).toArray()
  const now = Date.now()
  const note: Note = {
    id: uid(),
    notebookId,
    title: title.trim() || 'Nota sin título',
    background: $plain(background),
    order: Math.max(0, ...siblings.map((s) => s.order)) + 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    thumb: null,
    view: null,
  }
  await db.transaction('rw', db.notes, db.contents, db.notebooks, async () => {
    await db.notes.add(note)
    await db.contents.add({ noteId: note.id, elements: [] })
    await db.notebooks.update(notebookId, { updatedAt: now })
  })
  return note
}

export async function updateNote(id: string, changes: Partial<Note>) {
  await db.notes.update(id, { ...$plain(changes), updatedAt: Date.now() })
}

export async function trashNote(id: string) {
  await db.notes.update(id, { deletedAt: Date.now() })
}

export async function restoreNote(id: string) {
  const note = await db.notes.get(id)
  if (!note) return
  await db.notes.update(id, { deletedAt: null })
  // Si su cuaderno estaba en la papelera, también vuelve.
  await db.notebooks.update(note.notebookId, { deletedAt: null })
}

export async function deleteNoteForever(id: string) {
  await db.transaction('rw', db.notes, db.contents, async () => {
    await db.contents.delete(id)
    await db.notes.delete(id)
  })
  await collectGarbage()
}

export async function duplicateNote(id: string, targetNotebookId?: string, title?: string): Promise<Note | undefined> {
  const src = await db.notes.get(id)
  if (!src) return
  const content = await db.contents.get(id)
  const copy = await createNote(targetNotebookId ?? src.notebookId, title ?? src.title + ' (copia)', src.background)
  await db.contents.put({ noteId: copy.id, elements: structuredClone(content?.elements ?? []) })
  await db.notes.update(copy.id, { thumb: src.thumb, view: src.view })
  return copy
}

export async function loadContent(noteId: string): Promise<El[]> {
  return (await db.contents.get(noteId))?.elements ?? []
}

export async function saveContent(noteId: string, elements: El[]) {
  const now = Date.now()
  await db.transaction('rw', db.contents, db.notes, db.notebooks, async () => {
    await db.contents.put({ noteId, elements: $plain(elements) })
    const note = await db.notes.get(noteId)
    await db.notes.update(noteId, { updatedAt: now })
    if (note) await db.notebooks.update(note.notebookId, { updatedAt: now })
  })
}

/** Quita proxies reactivos de Svelte antes de guardar en IndexedDB (no se pueden clonar). */
function $plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

// ---------- Archivos (imágenes) ----------

export async function putBlob(blob: Blob): Promise<string> {
  const id = uid()
  await db.blobs.put({ id, type: blob.type, data: await blob.arrayBuffer() })
  return id
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const r = await db.blobs.get(id)
  return r ? new Blob([r.data], { type: r.type }) : undefined
}

/** Borra archivos que ya ninguna nota usa (incluidas las de la papelera). */
export async function collectGarbage() {
  const used = new Set<string>()
  await db.contents.each((c) => {
    for (const el of c.elements) if (el.type === 'image') used.add(el.blobId)
  })
  const ids = await db.blobs.toCollection().primaryKeys()
  const unused = ids.filter((id) => !used.has(id))
  if (unused.length) await db.blobs.bulkDelete(unused)
}

export async function hasAnyData(): Promise<boolean> {
  return (await db.notebooks.count()) > 0
}
