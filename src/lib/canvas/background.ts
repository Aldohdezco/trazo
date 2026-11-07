import type { Background, View } from '../types'
import { isDark, mix } from '../util'

/** Tamaño de "hoja" (carta a 96 ppp) para los papeles que se repiten por página. */
export const PAGE_W = 816
export const PAGE_H = 1056

const RULE = 34
const GRID = 26
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Notas']

export function paperInk(bg: Background) {
  const dark = isDark(bg.color)
  return {
    line: dark ? mix(bg.color, '#ffffff', 0.2) : mix(bg.color, '#c98aa0', 0.38),
    accent: dark ? mix(bg.color, '#f29bb5', 0.55) : mix(bg.color, '#e0607f', 0.55),
    label: dark ? mix(bg.color, '#ffffff', 0.55) : mix(bg.color, '#9a4f68', 0.75),
    dark,
  }
}

/**
 * Dibuja el papel en coordenadas de pantalla.
 * `ctx` ya debe tener aplicada la escala de densidad de píxeles.
 */
export function drawPaper(ctx: CanvasRenderingContext2D, bg: Background, view: View, width: number, height: number) {
  const { zoom } = view
  ctx.save()
  ctx.fillStyle = bg.color
  ctx.fillRect(0, 0, width, height)
  const ink = paperInk(bg)
  const x0 = view.x
  const y0 = view.y
  const x1 = view.x + width / zoom
  const y1 = view.y + height / zoom
  const sx = (x: number) => (x - x0) * zoom
  const sy = (y: number) => (y - y0) * zoom
  ctx.lineWidth = 1
  ctx.strokeStyle = ink.line

  /** Paso mínimo para que las líneas no se amontonen al alejar. */
  const stepFor = (base: number) => {
    let step = base
    while (step * zoom < 6) step *= 2
    return step
  }

  const hLines = (spacing: number, offset = 0) => {
    const step = stepFor(spacing)
    ctx.beginPath()
    for (let y = Math.floor((y0 - offset) / step) * step + offset; y <= y1; y += step) {
      const py = Math.round(sy(y)) + 0.5
      ctx.moveTo(0, py)
      ctx.lineTo(width, py)
    }
    ctx.stroke()
  }
  const vLines = (spacing: number) => {
    const step = stepFor(spacing)
    ctx.beginPath()
    for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
      const px = Math.round(sx(x)) + 0.5
      ctx.moveTo(px, 0)
      ctx.lineTo(px, height)
    }
    ctx.stroke()
  }

  switch (bg.paper) {
    case 'rayado':
      hLines(RULE)
      break
    case 'cuadricula':
      hLines(GRID)
      vLines(GRID)
      break
    case 'punteado': {
      const step = stepFor(GRID)
      const r = Math.max(1, Math.min(2.2, 1.6 * zoom))
      ctx.fillStyle = ink.line
      for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
        for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
          ctx.beginPath()
          ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'pentagrama': {
      const period = 120
      const gap = 11
      ctx.beginPath()
      for (let g = Math.floor(y0 / period) * period; g <= y1; g += period) {
        for (let i = 0; i < 5; i++) {
          const py = Math.round(sy(g + 40 + i * gap)) + 0.5
          ctx.moveTo(0, py)
          ctx.lineTo(width, py)
        }
      }
      ctx.stroke()
      break
    }
    case 'cornell':
      hLines(RULE)
      eachPage(x0, y0, x1, y1, (px, py) => {
        ctx.strokeStyle = ink.accent
        ctx.lineWidth = Math.max(1, 1.5 * zoom)
        ctx.beginPath()
        // Columna de pistas y franja de resumen
        ctx.moveTo(sx(px + 210), sy(py))
        ctx.lineTo(sx(px + 210), sy(py + PAGE_H - 220))
        ctx.moveTo(sx(px), sy(py + PAGE_H - 220))
        ctx.lineTo(sx(px + PAGE_W), sy(py + PAGE_H - 220))
        ctx.stroke()
        pageEdge(ctx, sx(px), sy(py), PAGE_W * zoom, PAGE_H * zoom, ink.line)
      })
      break
    case 'semanal':
      eachPage(x0, y0, x1, y1, (px, py) => {
        const pad = 40
        const cw = (PAGE_W - pad * 2) / 2
        const ch = (PAGE_H - pad * 2) / 4
        ctx.lineWidth = Math.max(1, 1.2 * zoom)
        for (let i = 0; i < 8; i++) {
          const cx = px + pad + (i % 2) * cw
          const cy = py + pad + Math.floor(i / 2) * ch
          ctx.strokeStyle = ink.line
          roundRect(ctx, sx(cx + 6), sy(cy + 6), (cw - 12) * zoom, (ch - 12) * zoom, 14 * zoom)
          ctx.stroke()
          if (zoom > 0.25) {
            ctx.fillStyle = ink.label
            ctx.font = `600 ${15 * zoom}px "Playfair Display", serif`
            ctx.fillText(DAYS[i], sx(cx + 22), sy(cy + 34))
          }
        }
        pageEdge(ctx, sx(px), sy(py), PAGE_W * zoom, PAGE_H * zoom, ink.line)
      })
      break
  }
  ctx.restore()
}

function eachPage(x0: number, y0: number, x1: number, y1: number, fn: (px: number, py: number) => void) {
  for (let py = Math.floor(y0 / PAGE_H) * PAGE_H; py <= y1; py += PAGE_H) {
    for (let px = Math.floor(x0 / PAGE_W) * PAGE_W; px <= x1; px += PAGE_W) fn(px, py)
  }
}

function pageEdge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.save()
  ctx.setLineDash([4, 6])
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h)
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}
