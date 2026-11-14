import { fontFamily } from '../catalog'
import type { Highlight, HighlightStyle, TextEl } from '../types'

export const LINE_HEIGHT = 1.35

let measureCtx: CanvasRenderingContext2D | null = null
function ctx(): CanvasRenderingContext2D {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!
  return measureCtx
}

export function fontString(el: Pick<TextEl, 'italic' | 'bold' | 'size' | 'font'>, size = el.size): string {
  return `${el.italic ? 'italic ' : ''}${el.bold ? 700 : 400} ${size}px "${fontFamily(el.font)}", Nunito, sans-serif`
}

export interface TextLayout {
  lines: string[]
  /** Posición en `text` donde empieza cada línea. */
  starts: number[]
  height: number
}

let cache = new WeakMap<TextEl, TextLayout>()

/** Llamar cuando terminan de cargar las fuentes: las medidas cambian. */
export function invalidateTextCache() {
  cache = new WeakMap()
}

/** Parte el texto en líneas que caben en el ancho de la caja. */
export function wrapText(text: string, maxW: number, measure: (s: string) => number): { lines: string[]; starts: number[] } {
  const lines: string[] = []
  const starts: number[] = []
  let offset = 0
  for (const para of text.split('\n')) {
    const paraStart = offset
    offset += para.length + 1
    let line = ''
    let lineStart = paraStart
    let wrapped = false
    const re = /\S+|\s+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(para))) {
      const word = m[0]
      const wStart = paraStart + m.index
      const isSpace = /^\s/.test(word)
      if (line === '') {
        // Los espacios al inicio de una línea partida no se dibujan.
        if (wrapped && isSpace) continue
        lineStart = wStart
        if (!isSpace && measure(word) > maxW) {
          // Una palabra más ancha que la caja se parte por letras.
          let chunk = ''
          let chunkStart = wStart
          for (const ch of word) {
            if (chunk && measure(chunk + ch) > maxW) {
              lines.push(chunk)
              starts.push(chunkStart)
              chunkStart += chunk.length
              chunk = ch
            } else chunk += ch
          }
          line = chunk
          lineStart = chunkStart
          wrapped = true
        } else line = word
        continue
      }
      if (measure(line + word) <= maxW) {
        line += word
        continue
      }
      lines.push(line.trimEnd())
      starts.push(lineStart)
      line = ''
      wrapped = true
      re.lastIndex = m.index // vuelve a procesar esta palabra en la línea nueva
    }
    lines.push(line)
    starts.push(lineStart)
  }
  return { lines, starts }
}

export function layoutText(el: TextEl): TextLayout {
  const hit = cache.get(el)
  if (hit) return hit
  const c = ctx()
  c.font = fontString(el)
  const { lines, starts } = wrapText(el.text, Math.max(el.w, el.size), (s) => c.measureText(s).width)
  const layout = { lines, starts, height: Math.max(1, lines.length) * el.size * LINE_HEIGHT }
  cache.set(el, layout)
  return layout
}

/** Ancho que ocupa el texto más largo (para ajustar cajas nuevas). */
export function naturalWidth(el: TextEl): number {
  const c = ctx()
  c.font = fontString(el)
  return Math.max(...el.text.split('\n').map((l) => c.measureText(l).width), el.size)
}

/** Ancho de un pedazo de texto con la fuente del elemento. */
export function measureWith(el: TextEl, s: string): number {
  const c = ctx()
  c.font = fontString(el)
  return c.measureText(s).width
}

// ---------- Resaltado ----------

/** Agrega rangos resaltados: lo nuevo tapa lo viejo y los rangos vecinos del mismo color se unen. */
export function mergeHighlights(existing: Highlight[], added: Highlight[]): Highlight[] {
  // Cada modo (fondo, subrayado, marco, contorno) se combina por separado: pueden convivir.
  const styles = new Set([...existing, ...added].map((h) => h.style ?? 'fondo'))
  if (styles.size > 1) {
    return [...styles].flatMap((st) =>
      mergeSameStyle(
        existing.filter((h) => (h.style ?? 'fondo') === st),
        added.filter((h) => (h.style ?? 'fondo') === st),
      ),
    )
  }
  return mergeSameStyle(existing, added)
}

function mergeSameStyle(existing: Highlight[], added: Highlight[]): Highlight[] {
  let out = existing.slice()
  for (const h of added) {
    const next: Highlight[] = []
    for (const o of out) {
      if (o.end <= h.start || o.start >= h.end) next.push(o)
      else {
        if (o.start < h.start) next.push({ ...o, end: h.start })
        if (o.end > h.end) next.push({ ...o, start: h.end })
      }
    }
    next.push(h)
    out = next
  }
  out.sort((a, b) => a.start - b.start)
  const merged: Highlight[] = []
  for (const h of out) {
    const last = merged[merged.length - 1]
    if (last && last.color === h.color && last.end >= h.start) last.end = Math.max(last.end, h.end)
    else merged.push({ ...h })
  }
  return merged
}

/** Recorre los resaltados cuando cambia el texto (se edita la parte que cambió). */
export function adjustHighlights(oldText: string, newText: string, hs: Highlight[]): Highlight[] {
  if (oldText === newText || !hs.length) return hs
  let p = 0
  while (p < oldText.length && p < newText.length && oldText[p] === newText[p]) p++
  let s = 0
  while (s < oldText.length - p && s < newText.length - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++
  const oldEnd = oldText.length - s
  const newEnd = newText.length - s
  const delta = newEnd - oldEnd
  const map = (i: number, isEnd: boolean) => (i <= p ? i : i >= oldEnd ? i + delta : isEnd ? newEnd : p)
  return hs.map((h) => ({ ...h, start: map(h.start, false), end: map(h.end, true) })).filter((h) => h.end > h.start)
}

/**
 * Qué partes del texto cubre un trazo de marcador.
 * `local` son puntos [x, y, ...] relativos a la esquina de la caja, ya sin rotación.
 * Devuelve null si el trazo casi no pasa por encima del texto.
 */
export function rangesUnder(
  el: TextEl,
  layout: Pick<TextLayout, 'lines' | 'starts'>,
  local: number[],
  color: string,
  measure: (s: string) => number,
  style?: HighlightStyle,
): Highlight[] | null {
  const lh = el.size * LINE_HEIGHT
  const h = layout.lines.length * lh
  const n = local.length / 2
  let inside = 0
  for (let i = 0; i < local.length; i += 2) {
    const x = local[i]
    const y = local[i + 1]
    if (x >= -lh * 0.3 && x <= el.w + lh * 0.3 && y >= -lh * 0.3 && y <= h + lh * 0.3) inside++
  }
  if (!n || inside / n < 0.6) return null

  const out: Highlight[] = []
  layout.lines.forEach((line, li) => {
    let minX = Infinity
    let maxX = -Infinity
    for (let i = 0; i < local.length; i += 2) {
      const y = local[i + 1]
      if (y >= li * lh && y < (li + 1) * lh) {
        minX = Math.min(minX, local[i])
        maxX = Math.max(maxX, local[i])
      }
    }
    if (maxX - minX < el.size * 0.3) return
    const lineW = measure(line)
    const ax = el.align === 'left' ? 0 : el.align === 'center' ? (el.w - lineW) / 2 : el.w - lineW
    let x = ax
    let first = -1
    let last = -1
    for (let k = 0; k < line.length; k++) {
      const cw = measure(line[k])
      const center = x + cw / 2
      if (center >= minX && center <= maxX) {
        if (first < 0) first = k
        last = k
      }
      x += cw
    }
    if (first >= 0) out.push({ start: layout.starts[li] + first, end: layout.starts[li] + last + 1, color, ...(style && style !== 'fondo' ? { style } : {}) })
  })
  return out.length ? out : null
}
