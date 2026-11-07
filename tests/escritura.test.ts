import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { adjustHighlights, mergeHighlights, rangesUnder, wrapText } from '../src/lib/canvas/text'
import { detectStyle } from '../src/lib/handwriting'
import { myscriptHmac } from '../src/lib/recognize'
import type { TextEl } from '../src/lib/types'

const mono = (s: string) => s.length * 10

describe('estilo de letra', () => {
  it('mayúsculas', () => expect(detectStyle(8, 'HOLA AMIGA')).toBe('mayusculas'))
  it('cursiva: pocas líneas por letra', () => expect(detectStyle(2, 'hola mundo')).toBe('cursiva'))
  it('cursiva con t e i que suman trazos', () => expect(detectStyle(5, 'esta clase ti')).toBe('cursiva'))
  it('molde: un trazo o más por letra', () => expect(detectStyle(11, 'esta clase')).toBe('molde'))
  it('palabras muy cortas: molde', () => expect(detectStyle(1, 'yo')).toBe('molde'))
})

describe('partir texto en líneas', () => {
  it('guarda dónde empieza cada línea', () => {
    const { lines, starts } = wrapText('hola mundo bonito\nadios', 80, mono)
    expect(lines).toEqual(['hola', 'mundo', 'bonito', 'adios'])
    expect(starts).toEqual([0, 5, 11, 18])
  })
  it('parte palabras larguísimas por letras', () => {
    const { lines, starts } = wrapText('abcdefghijkl', 50, mono)
    expect(lines).toEqual(['abcde', 'fghij', 'kl'])
    expect(starts).toEqual([0, 5, 10])
  })
})

describe('resaltado', () => {
  it('lo nuevo tapa lo viejo y une vecinos del mismo color', () => {
    const r = mergeHighlights([{ start: 0, end: 10, color: 'a' }], [{ start: 3, end: 5, color: 'b' }, { start: 10, end: 12, color: 'a' }])
    expect(r).toEqual([
      { start: 0, end: 3, color: 'a' },
      { start: 3, end: 5, color: 'b' },
      { start: 5, end: 12, color: 'a' },
    ])
  })

  it('se recorre al escribir antes y se conserva al escribir después', () => {
    const hs = [{ start: 5, end: 10, color: 'a' }]
    expect(adjustHighlights('hola mundo', '¡hola mundo', hs)).toEqual([{ start: 6, end: 11, color: 'a' }])
    expect(adjustHighlights('hola mundo', 'hola mundo!!', hs)).toEqual(hs)
    expect(adjustHighlights('hola mundo', 'hola ', hs)).toEqual([])
  })

  it('el marcador cubre las letras por las que pasa, en su línea', () => {
    const el = { size: 20, w: 100, align: 'left' } as TextEl
    const layout = wrapText('hola mundo', 60, mono) // ['hola', 'mundo'], alto de línea 27
    // Pasa por la segunda línea (y ≈ 40), de x=0 a x=30 → "mun"
    const r = rangesUnder(el, layout, [0, 40, 15, 41, 30, 40], 'rosa', mono)
    expect(r).toEqual([{ start: 5, end: 8, color: 'rosa' }])
    // Un trazo lejos del texto no cuenta
    expect(rangesUnder(el, layout, [0, 300, 50, 300], 'rosa', mono)).toBeNull()
  })
})

describe('MyScript', () => {
  it('firma HMAC-SHA512 con llave = applicationKey + hmacKey', async () => {
    const expected = createHmac('sha512', 'appkeyhmackey').update('{"a":1}').digest('hex')
    expect(await myscriptHmac('{"a":1}', 'appkey', 'hmackey')).toBe(expected)
  })
})

describe('Gemini', () => {
  it('lee el JSON con texto y estilo', async () => {
    const { parseGemini } = await import('../src/lib/recognize')
    expect(parseGemini('{"texto":" Hola, bonita ","estilo":"cursiva"}')).toEqual({ text: 'Hola, bonita', style: 'cursiva' })
    expect(parseGemini('{"texto":"x","estilo":"rara"}')).toEqual({ text: 'x', style: undefined })
    expect(parseGemini('texto suelto')).toEqual({ text: 'texto suelto' })
  })
})
