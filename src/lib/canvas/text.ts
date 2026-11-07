import { fontFamily } from '../catalog'
import type { TextEl } from '../types'

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
  height: number
}

let cache = new WeakMap<TextEl, TextLayout>()

/** Llamar cuando terminan de cargar las fuentes: las medidas cambian. */
export function invalidateTextCache() {
  cache = new WeakMap()
}

export function layoutText(el: TextEl): TextLayout {
  const hit = cache.get(el)
  if (hit) return hit
  const c = ctx()
  c.font = fontString(el)
  const maxW = Math.max(el.w, el.size)
  const lines: string[] = []
  for (const para of el.text.split('\n')) {
    if (para === '') {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of para.split(/(\s+)/)) {
      const candidate = line + word
      if (c.measureText(candidate).width <= maxW || line === '') {
        // Una palabra más ancha que la caja se parte por letras.
        if (line === '' && c.measureText(word).width > maxW) {
          let chunk = ''
          for (const ch of word) {
            if (c.measureText(chunk + ch).width > maxW && chunk) {
              lines.push(chunk)
              chunk = ch
            } else chunk += ch
          }
          line = chunk
        } else line = candidate
      } else {
        lines.push(line.trimEnd())
        line = word.trimStart()
      }
    }
    lines.push(line)
  }
  const layout = { lines, height: Math.max(1, lines.length) * el.size * LINE_HEIGHT }
  cache.set(el, layout)
  return layout
}

/** Ancho que ocupa el texto más largo (para ajustar cajas nuevas). */
export function naturalWidth(el: TextEl): number {
  const c = ctx()
  c.font = fontString(el)
  return Math.max(...el.text.split('\n').map((l) => c.measureText(l).width), el.size)
}
