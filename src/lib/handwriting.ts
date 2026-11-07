import { contentBounds } from './canvas/geom'
import { LINE_HEIGHT, naturalWidth } from './canvas/text'
import type { FontId, HandStyle, StrokeEl, TextEl } from './types'
import { clamp, uid } from './util'

/** Letras que suman trazos sueltos aunque se escriba en cursiva (puntos, rayitas, acentos). */
const EXTRA_STROKES = /[ijtxáéíóúüñ¿¡!?ÁÉÍÓÚÜÑ]/

/**
 * Adivina el estilo de letra a partir del texto reconocido y de cuántos trazos se usaron.
 * - Mayúsculas: casi todas las letras son mayúsculas.
 * - Cursiva: las letras van unidas, así que hay muy pocos trazos por letra.
 * - Molde: cada letra lleva al menos un trazo.
 */
export function detectStyle(strokeCount: number, text: string): HandStyle {
  const letters = [...text].filter((c) => /\p{L}/u.test(c))
  if (!letters.length) return 'molde'
  const upper = letters.filter((c) => c !== c.toLowerCase()).length
  if (letters.length >= 2 && upper / letters.length > 0.8) return 'mayusculas'
  if (letters.length < 3) return 'molde'
  const extras = letters.filter((c) => EXTRA_STROKES.test(c)).length
  const ratio = Math.max(0, strokeCount - extras) / letters.length
  return ratio < 0.5 ? 'cursiva' : 'molde'
}

/** Arma la caja de texto que reemplaza a los trazos, en el mismo lugar y de tamaño parecido. */
export function textFromStrokes(strokes: StrokeEl[], text: string, font: FontId): TextEl {
  const b = contentBounds(strokes)!
  const lines = Math.max(1, text.split('\n').length)
  const size = clamp(Math.round((b.h / lines) * 0.9), 12, 220)
  const el: TextEl = {
    type: 'text',
    id: uid(),
    x: b.x,
    y: 0,
    w: 10_000,
    rotation: 0,
    text,
    font,
    size,
    color: strokes[0].color,
    bold: false,
    italic: false,
    align: 'left',
  }
  const w = Math.ceil(naturalWidth(el)) + 6
  const h = lines * size * LINE_HEIGHT
  return { ...el, w, y: b.y + (b.h - h) / 2 }
}
