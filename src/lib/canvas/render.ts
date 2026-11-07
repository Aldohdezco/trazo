import { getStroke } from 'perfect-freehand'
import type { El, ImageEl, LineCap, LineEl, PenTool, Rect, ShapeEl, ShapeKind, StrokeEl, TextEl } from '../types'
import { getBitmap } from './images'
import { LINE_HEIGHT, fontString, layoutText } from './text'
import { boxOf, elBounds, rectsIntersect } from './geom'

// ---------- Trazos ----------

const STROKE_OPTS: Record<PenTool, Parameters<typeof getStroke>[1]> = {
  pluma: { thinning: 0.55, smoothing: 0.5, streamline: 0.45 },
  lapiz: { thinning: 0.25, smoothing: 0.35, streamline: 0.3 },
  pincel: { thinning: 0.8, smoothing: 0.7, streamline: 0.55, start: { taper: 30 }, end: { taper: 40 } },
  marcador: { thinning: 0, smoothing: 0.5, streamline: 0.6 },
}

export function strokeOutline(points: number[], tool: PenTool, size: number, realPressure: boolean, last: boolean): Path2D {
  const input: [number, number, number][] = []
  for (let i = 0; i < points.length; i += 3) input.push([points[i], points[i + 1], points[i + 2]])
  const outline = getStroke(input, {
    ...STROKE_OPTS[tool],
    size,
    simulatePressure: tool !== 'marcador' && !realPressure,
    last,
  })
  const path = new Path2D()
  if (!outline.length) return path
  // Curvas cuadráticas entre puntos medios: contorno suave.
  path.moveTo(outline[0][0], outline[0][1])
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % outline.length]
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  path.closePath()
  return path
}

const pathCache = new WeakMap<StrokeEl, Path2D>()

function strokePath(el: StrokeEl): Path2D {
  let p = pathCache.get(el)
  if (!p) {
    p = strokeOutline(el.points, el.tool, el.size, el.pressure, true)
    pathCache.set(el, p)
  }
  return p
}

const grainCache = new Map<string, CanvasPattern>()

/** Textura granulada para el lápiz. */
function pencilGrain(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | string {
  let pat = grainCache.get(color)
  if (pat) return pat
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = color
  for (let i = 0; i < 64 * 64; i++) {
    g.globalAlpha = 0.45 + Math.random() * 0.55
    g.fillRect(i % 64, Math.floor(i / 64), 1, 1)
  }
  pat = ctx.createPattern(c, 'repeat') ?? undefined
  if (!pat) return color
  grainCache.set(color, pat)
  return pat
}

export interface DrawOptions {
  /** El papel es oscuro: el marcador no puede multiplicar. */
  darkPaper: boolean
}

export function drawStroke(ctx: CanvasRenderingContext2D, el: StrokeEl, opts: DrawOptions, path = strokePath(el)) {
  ctx.save()
  if (el.tool === 'marcador') {
    ctx.globalAlpha = opts.darkPaper ? 0.45 : 0.75
    if (!opts.darkPaper) ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = el.color
  } else if (el.tool === 'lapiz') {
    ctx.globalAlpha = 0.92
    ctx.fillStyle = pencilGrain(ctx, el.color)
  } else {
    ctx.fillStyle = el.color
  }
  ctx.fill(path)
  ctx.restore()
}

// ---------- Figuras ----------

export function shapePath(kind: ShapeKind, w: number, h: number): Path2D {
  // Coordenadas locales centradas en (0, 0).
  const p = new Path2D()
  const hw = w / 2
  const hh = h / 2
  switch (kind) {
    case 'rect':
      p.rect(-hw, -hh, w, h)
      break
    case 'redondeado':
      p.roundRect(-hw, -hh, w, h, Math.min(w, h) * 0.18)
      break
    case 'elipse':
      p.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2)
      break
    case 'triangulo':
      p.moveTo(0, -hh)
      p.lineTo(hw, hh)
      p.lineTo(-hw, hh)
      p.closePath()
      break
    case 'rombo':
      p.moveTo(0, -hh)
      p.lineTo(hw, 0)
      p.lineTo(0, hh)
      p.lineTo(-hw, 0)
      p.closePath()
      break
    case 'estrella':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 === 0 ? 1 : 0.45
        const x = Math.cos(a) * hw * r
        const y = Math.sin(a) * hh * r + hh * 0.1
        if (i === 0) p.moveTo(x, y)
        else p.lineTo(x, y)
      }
      p.closePath()
      break
    case 'corazon':
      p.moveTo(0, hh)
      p.bezierCurveTo(-hw * 1.1, hh * 0.2, -hw * 1.05, -hh * 0.95, -hw * 0.5, -hh * 0.95)
      p.bezierCurveTo(-hw * 0.15, -hh * 0.95, 0, -hh * 0.7, 0, -hh * 0.45)
      p.bezierCurveTo(0, -hh * 0.7, hw * 0.15, -hh * 0.95, hw * 0.5, -hh * 0.95)
      p.bezierCurveTo(hw * 1.05, -hh * 0.95, hw * 1.1, hh * 0.2, 0, hh)
      p.closePath()
      break
  }
  return p
}

function withBoxTransform(ctx: CanvasRenderingContext2D, r: Rect, rotation: number, fn: () => void) {
  ctx.save()
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2)
  if (rotation) ctx.rotate(rotation)
  fn()
  ctx.restore()
}

function drawShape(ctx: CanvasRenderingContext2D, el: ShapeEl) {
  withBoxTransform(ctx, el, el.rotation, () => {
    const p = shapePath(el.shape, Math.abs(el.w), Math.abs(el.h))
    if (el.fill) {
      ctx.fillStyle = el.fill
      ctx.fill(p)
    }
    if (el.strokeWidth > 0) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = el.strokeWidth
      ctx.strokeStyle = el.stroke
      ctx.stroke(p)
    }
  })
}

// ---------- Líneas ----------

function drawCap(ctx: CanvasRenderingContext2D, cap: LineCap, x: number, y: number, angle: number, width: number) {
  if (cap === 'nada') return
  const size = Math.max(10, width * 4)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.setLineDash([])
  if (cap === 'flecha') {
    ctx.beginPath()
    ctx.moveTo(-size, -size * 0.6)
    ctx.lineTo(0, 0)
    ctx.lineTo(-size, size * 0.6)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, Math.max(3, width * 1.6), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawLine(ctx: CanvasRenderingContext2D, el: LineEl) {
  ctx.save()
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (el.dashed) ctx.setLineDash([el.width * 2.5, el.width * 2.5])
  ctx.beginPath()
  ctx.moveTo(el.x1, el.y1)
  ctx.lineTo(el.x2, el.y2)
  ctx.stroke()
  const a = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
  drawCap(ctx, el.end, el.x2, el.y2, a, el.width)
  drawCap(ctx, el.start, el.x1, el.y1, a + Math.PI, el.width)
  ctx.restore()
}

// ---------- Texto ----------

function drawText(ctx: CanvasRenderingContext2D, el: TextEl) {
  const box = boxOf(el)
  const { lines, starts } = layoutText(el)
  withBoxTransform(ctx, box, el.rotation, () => {
    ctx.font = fontString(el)
    const lh = el.size * LINE_HEIGHT
    const top = -box.h / 2
    const left = -box.w / 2

    // Fondo pintado con el marcador, detrás de las letras.
    if (el.highlights?.length) {
      lines.forEach((line, i) => {
        const s = starts[i]
        const lineW = ctx.measureText(line).width
        const ax = left + (el.align === 'left' ? 0 : el.align === 'center' ? (box.w - lineW) / 2 : box.w - lineW)
        for (const h of el.highlights!) {
          const a = Math.max(h.start, s) - s
          const b = Math.min(h.end, s + line.length) - s
          if (b <= a) continue
          const x0 = ax + ctx.measureText(line.slice(0, a)).width
          const x1 = ax + ctx.measureText(line.slice(0, b)).width
          const pad = el.size * 0.12
          ctx.fillStyle = h.color
          ctx.globalAlpha = 0.85
          ctx.beginPath()
          ctx.roundRect(x0 - pad, top + lh * i + lh * 0.1, x1 - x0 + pad * 2, lh * 0.82, el.size * 0.18)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      })
    }

    ctx.fillStyle = el.color
    ctx.textBaseline = 'middle'
    ctx.textAlign = el.align
    const ax = el.align === 'left' ? left : el.align === 'right' ? box.w / 2 : 0
    lines.forEach((line, i) => ctx.fillText(line, ax, top + lh * (i + 0.5)))
  })
}

// ---------- Imágenes ----------

function drawImage(ctx: CanvasRenderingContext2D, el: ImageEl) {
  const bmp = getBitmap(el.blobId)
  withBoxTransform(ctx, el, el.rotation, () => {
    if (bmp) ctx.drawImage(bmp, -el.w / 2, -el.h / 2, el.w, el.h)
    else {
      ctx.fillStyle = 'rgba(232, 137, 166, 0.15)'
      ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h)
    }
  })
}

// ---------- Escena ----------

export function drawElement(ctx: CanvasRenderingContext2D, el: El, opts: DrawOptions) {
  switch (el.type) {
    case 'stroke':
      return drawStroke(ctx, el, opts)
    case 'shape':
      return drawShape(ctx, el)
    case 'line':
      return drawLine(ctx, el)
    case 'text':
      return drawText(ctx, el)
    case 'image':
      return drawImage(ctx, el)
  }
}

/** Dibuja los elementos que caen dentro de `visible` (coordenadas del mundo). */
export function drawElements(ctx: CanvasRenderingContext2D, els: El[], visible: Rect | null, opts: DrawOptions, skip?: Set<string>) {
  for (const el of els) {
    if (skip?.has(el.id)) continue
    if (visible && !rectsIntersect(elBounds(el), visible)) continue
    drawElement(ctx, el, opts)
  }
}
