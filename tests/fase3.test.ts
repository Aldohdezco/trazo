import 'fake-indexeddb/auto'
import { parse } from 'opentype.js'
import { describe, expect, it } from 'vitest'
import { createBackup, restoreBackup } from '../src/lib/backup'
import { $plain, TrazoDB } from '../src/lib/db'
import { GUIDES, buildFont, glyphOutlines } from '../src/lib/fontgen'
import type { CustomFont, Notebook } from '../src/lib/types'

/** Una "l": un trazo vertical del alto al renglón. */
const ele = [[400, GUIDES.alto, 0.5, 402, 400, 0.5, 404, GUIDES.renglon, 0.5]]
/** Una "o": un círculo en la zona de minúsculas. */
const o = [
  Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2
    return [500 + Math.cos(a) * 180, (GUIDES.x + GUIDES.renglon) / 2 + Math.sin(a) * 200, 0.5]
  }).flat(),
]

const font: CustomFont = { id: 'f1', name: 'Mi letra', glyphs: { l: ele, o, x: [] }, createdAt: 1, updatedAt: 1 }

describe('fuente hecha a mano', () => {
  it('genera un archivo de fuente válido con las letras dibujadas', () => {
    const parsed = parse(buildFont(font).toArrayBuffer())
    expect(parsed.getEnglishName('fontFamily')).toBe('Mi letra')
    const l = parsed.charToGlyph('l')
    expect(l.unicode).toBe('l'.codePointAt(0))
    expect(l.path.commands.length).toBeGreaterThan(5)
    // La "l" llega del renglón (y=0) hasta casi el alto
    const box = l.getBoundingBox()
    expect(box.y1).toBeLessThan(40)
    expect(box.y2).toBeGreaterThan(GUIDES.renglon - GUIDES.alto - 60)
    // Las letras sin dibujar no entran; el espacio sí
    expect(parsed.charToGlyph('x').index).toBe(0)
    expect(parsed.charToGlyph(' ').advanceWidth).toBe(300)
  })

  it('todos los contornos giran en el mismo sentido (para que no queden huecos)', () => {
    const area = (p: [number, number][]) => p.reduce((a, [x, y], i) => a + (p[(i + p.length - 1) % p.length][0] - x) * (p[(i + p.length - 1) % p.length][1] + y), 0)
    const signs = glyphOutlines([...ele, ...o]).map((p) => Math.sign(area(p)))
    expect(new Set(signs).size).toBe(1)
  })
})

describe('copias limpias para guardar', () => {
  it('conserva datos binarios y quita lo indefinido', () => {
    const buf = new Uint8Array([1, 2, 3]).buffer
    const out = $plain({ a: 1, b: undefined, c: { image: { type: 'image/png', data: buf } }, d: [1, { e: 2 }] })
    expect(out).toEqual({ a: 1, c: { image: { type: 'image/png', data: buf } }, d: [1, { e: 2 }] })
    expect(out.c.image.data).toBe(buf)
  })
})

describe('respaldo de la fase 3', () => {
  it('guarda portadas propias, stickers y fuentes', async () => {
    const src = new TrazoDB('f3a')
    const nb: Notebook = {
      id: 'nb',
      name: 'Diario',
      cover: { template: 'propia', color: '#f6c6d2', noteId: 'n-portada', image: { type: 'image/webp', data: new Uint8Array([7, 7, 7]).buffer } },
      background: { paper: 'liso', color: '#fff' },
      order: 1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    }
    await src.notebooks.put(nb)
    await src.blobs.put({ id: 'b-st', type: 'image/png', data: new Uint8Array([5]).buffer })
    await src.stickers.put({ id: 's1', blobId: 'b-st', w: 100, h: 80, createdAt: 3 })
    await src.fonts.put(font)

    const dst = new TrazoDB('f3b')
    await restoreBackup(dst, await createBackup(src), 'reemplazar')
    const back = (await dst.notebooks.get('nb'))!
    expect(back.cover.noteId).toBe('n-portada')
    expect(new Uint8Array(back.cover.image!.data)).toEqual(new Uint8Array([7, 7, 7]))
    expect(await dst.stickers.toArray()).toEqual([{ id: 's1', blobId: 'b-st', w: 100, h: 80, createdAt: 3 }])
    expect((await dst.fonts.get('f1'))?.glyphs.l).toEqual(ele)
    expect(new Uint8Array((await dst.blobs.get('b-st'))!.data)).toEqual(new Uint8Array([5]))
  })
})
