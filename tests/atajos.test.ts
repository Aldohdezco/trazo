import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createNotebook, createQuickNote, listRecentNotes, QUICK_NOTEBOOK, listNotebooks, saveContent, titleFromContent, trashNotebook } from '../src/lib/db'
import type { El } from '../src/lib/types'

const text = (t: string, y: number, x = 0): El => ({ type: 'text', id: t, x, y, w: 300, rotation: 0, text: t, font: 'nunito', size: 20, color: '#000', bold: false, italic: false, align: 'left' })

describe('título automático', () => {
  it('usa la primera línea del texto que está más arriba', () => {
    expect(titleFromContent([text('Tarea', 300), text('Biología\ncapítulo 3', 100)])).toBe('Biología')
  })
  it('recorta títulos muy largos', () => {
    const t = titleFromContent([text('Resumen de la clase de historia sobre la independencia de México', 0)])!
    expect(t.length).toBeLessThanOrEqual(40)
    expect(t.endsWith('…')).toBe(true)
  })
  it('sin texto no inventa nada', () => {
    expect(titleFromContent([])).toBeNull()
    expect(titleFromContent([text('   ', 0)])).toBeNull()
  })
})

describe('nota rápida y recientes', () => {
  it('la nota rápida va al cuaderno "Notas rápidas" (se crea una sola vez)', async () => {
    const a = await createQuickNote()
    const b = await createQuickNote()
    const books = (await listNotebooks()).filter((n) => n.name === QUICK_NOTEBOOK)
    expect(books).toHaveLength(1)
    expect(a.notebookId).toBe(books[0].id)
    expect(b.notebookId).toBe(books[0].id)
    expect(a.title).toMatch(/^Nota rápida · /)
  })

  it('recientes: lo último editado primero, sin cuadernos en la papelera', async () => {
    const nb = await createNotebook('Escuela', { template: 'mono', color: '#f6c6d2' }, { paper: 'liso', color: '#fff' })
    const quick = await createQuickNote()
    await new Promise((r) => setTimeout(r, 5))
    await saveContent(quick.id, [text('hola', 0)])
    const recents = await listRecentNotes()
    expect(recents[0].id).toBe(quick.id)
    expect(recents[0].notebookName).toBe(QUICK_NOTEBOOK)
    await trashNotebook(recents[0].notebookId)
    expect((await listRecentNotes()).some((n) => n.notebookId === quick.notebookId)).toBe(false)
    expect(nb.name).toBe('Escuela')
  })
})
