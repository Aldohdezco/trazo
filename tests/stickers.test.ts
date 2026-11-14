import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BUILTIN_STICKERS, STICKER_CATEGORIES, TWEMOJI_CATEGORIES, builtinSticker } from '../src/lib/stickers'

/** Los 26 primeros: están guardados en notas de verdad, nunca deben desaparecer. */
const ORIGINAL_IDS = [
  'mono-rosa', 'mono-rojo', 'mono-lila', 'mono-crema', 'mono-perla',
  'corazon-rosa', 'corazon-rojo', 'corazon-brillo', 'corazones-tres',
  'flor-rosa', 'flor-blanca', 'ramito', 'cerezas', 'fresa',
  'brillo', 'brillos', 'estrella', 'perlas',
  'washi-vichy', 'washi-lunares', 'washi-rayas', 'washi-corazones',
  'marco-ondas', 'marco-lila', 'etiqueta', 'sobre', 'nube',
]

describe('biblioteca de stickers', () => {
  it('cada sección tiene al menos 30 stickers', () => {
    expect(STICKER_CATEGORIES.length).toBeGreaterThanOrEqual(12)
    for (const c of STICKER_CATEGORIES) expect(BUILTIN_STICKERS.filter((s) => s.category === c).length, c).toBeGreaterThanOrEqual(30)
  })

  it('los ids y los nombres no se repiten', () => {
    const ids = BUILTIN_STICKERS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const names = BUILTIN_STICKERS.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('siguen los stickers originales', () => {
    for (const id of ORIGINAL_IDS) expect(builtinSticker('builtin:' + id)?.id, id).toBe(id)
  })

  it('cada sticker tiene dibujo válido o archivo de Twemoji', () => {
    for (const s of BUILTIN_STICKERS) {
      expect(s.ratio, s.id).toBeGreaterThan(0)
      if (s.src) {
        expect(TWEMOJI_CATEGORIES).toContain(s.category)
        expect(existsSync('public/' + s.src), s.src).toBe(true)
        expect(readFileSync('public/' + s.src, 'utf8')).toMatch(/^<svg/)
      } else {
        expect(s.svg, s.id).toMatch(/^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"[^>]*>.*<\/svg>$/s)
        expect(s.svg, s.id).not.toMatch(/undefined|NaN/)
        const [w, h] = s.svg!.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.slice(1).map(Number)
        expect(s.ratio, s.id).toBeCloseTo(w / h, 2)
      }
    }
  })
})
