import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createBackup, restoreBackup } from '../src/lib/backup'
import { TrazoDB } from '../src/lib/db'
import type { Note, Notebook } from '../src/lib/types'

const nb: Notebook = {
  id: 'nb1',
  name: 'Clases',
  cover: { template: 'mono', color: '#f6c6d2' },
  background: { paper: 'rayado', color: '#fff' },
  order: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
}
const note: Note = {
  id: 'n1',
  notebookId: 'nb1',
  title: 'Química',
  background: nb.background,
  order: 1,
  createdAt: 1,
  updatedAt: 5,
  deletedAt: null,
  thumb: { type: 'image/png', data: new Uint8Array([1, 2, 3]).buffer },
  view: null,
}

async function seed(name: string) {
  const db = new TrazoDB(name)
  await db.notebooks.put(nb)
  await db.notes.put(note)
  await db.contents.put({ noteId: 'n1', elements: [{ type: 'image', id: 'i', x: 0, y: 0, w: 1, h: 1, rotation: 0, blobId: 'b1' }] })
  await db.blobs.put({ id: 'b1', type: 'image/png', data: new Uint8Array([9, 8, 7]).buffer })
  await db.settings.put({ key: 'tema', value: 'oscuro' })
  return db
}

describe('respaldo', () => {
  it('ida y vuelta reemplazando todo', async () => {
    const src = await seed('a')
    const bytes = await createBackup(src)
    const dst = new TrazoDB('b')
    await dst.notebooks.put({ ...nb, id: 'otro', name: 'Se borra' })
    const r = await restoreBackup(dst, bytes, 'reemplazar')
    expect(r).toEqual({ notebooks: 1, notes: 1 })
    expect(await dst.notebooks.toArray()).toEqual([nb])
    const n = await dst.notes.get('n1')
    expect(new Uint8Array(n!.thumb!.data)).toEqual(new Uint8Array([1, 2, 3]))
    const blob = await dst.blobs.get('b1')
    expect(new Uint8Array(blob!.data)).toEqual(new Uint8Array([9, 8, 7]))
    expect((await dst.settings.get('tema'))?.value).toBe('oscuro')
  })

  it('combinar conserva lo propio y gana lo más reciente', async () => {
    const src = await seed('c')
    const bytes = await createBackup(src)
    const dst = new TrazoDB('d')
    await dst.notebooks.put({ ...nb, id: 'mio', name: 'Mío' })
    await dst.notes.put({ ...note, title: 'Más nueva', updatedAt: 99 })
    await restoreBackup(dst, bytes, 'combinar')
    expect((await dst.notebooks.toArray()).map((n) => n.id).sort()).toEqual(['mio', 'nb1'])
    expect((await dst.notes.get('n1'))!.title).toBe('Más nueva')
  })

  it('rechaza archivos que no son respaldos', async () => {
    await expect(restoreBackup(new TrazoDB('e'), new Uint8Array([1, 2, 3]), 'combinar')).rejects.toThrow('respaldo de Trazo')
  })
})
