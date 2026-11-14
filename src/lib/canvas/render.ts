import { getStroke } from 'perfect-freehand'
import type { El, ImageEl, LineCap, LineEl, PenTool, Rect, ShapeEl, ShapeKind, StrokeEl, TextEl } from '../types'
import { drawDeco } from './deco'
import { getBitmap } from './images'
import { LINE_HEIGHT, fontString, layoutText } from './text'
import { boxOf, elBounds, rectsIntersect } from './geom'

// ---------- Trazos ----------

const STROKE_OPTS: Record<PenTool, Parameters<typeof getStroke>[1]> = {
  pluma: { thinning: 0.55, smoothing: 0.5, streamline: 0.45 },
  fino: { thinning: 0, smoothing: 0.5, streamline: 0.5 },
  lapiz: { thinning: 0.25, smoothing: 0.35, streamline: 0.3 },
  crayon: { thinning: 0.1, smoothing: 0.3, streamline: 0.3 },
  pincel: { thinning: 0.8, smoothing: 0.7, streamline: 0.55, start: { taper: 30 }, end: { taper: 40 } },
  caligrafia: {},
  acuarela: { thinning: 0.6, smoothing: 0.8, streamline: 0.6, start: { taper: 20 }, end: { taper: 30 } },
  neon: { thinning: 0, smoothing: 0.6, streamline: 0.55 },
  brillos: { thinning: 0.2, smoothing: 0.6, streamline: 0.5 },
  marcador: { thinning: 0, smoothing: 0.5, streamline: 0.6 },
}

/** Herramientas de trazo parejo (no simulan presión). */
const CONSTANT_WIDTH = new Set<PenTool>(['marcador', 'fino', 'neon'])

/**
 * Caligrafía: punta biselada a 45°. Cada tramo es un paralelogramo; todos con el mismo
 * sentido de giro para que al encimarse no queden huecos.
 */
function calligraphyPath(points: number[], size: number): Path2D {
  const p = new Path2D()
  const nx = Math.cos(-Math.PI / 4) * (size / 2)
  const ny = Math.sin(-Math.PI / 4) * (size / 2)
  const n = points.length / 3
  for (let i = 0; i < n; i++) {
    const x0 = points[Math.max(0, i - 1) * 3]
    const y0 = points[Math.max(0, i - 1) * 3 + 1]
    const x1 = points[i * 3]
    const y1 = points[i * 3 + 1]
    let quad = [
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny],
    ]
    let area = 0
    for (let k = 0; k < 4; k++) area += quad[k][0] * quad[(k + 1) % 4][1] - quad[(k + 1) % 4][0] * quad[k][1]
    if (area < 0) quad = quad.reverse()
    p.moveTo(quad[0][0], quad[0][1])
    for (let k = 1; k < 4; k++) p.lineTo(quad[k][0], quad[k][1])
    p.closePath()
  }
  return p
}

export function strokeOutline(points: number[], tool: PenTool, size: number, realPressure: boolean, last: boolean): Path2D {
  if (tool === 'caligrafia') return calligraphyPath(points, size)
  const input: [number, number, number][] = []
  for (let i = 0; i < points.length; i += 3) input.push([points[i], points[i + 1], points[i + 2]])
  const outline = getStroke(input, {
    ...STROKE_OPTS[tool],
    size,
    simulatePressure: !CONSTANT_WIDTH.has(tool) && !realPressure,
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

/** Textura granulada: fina para el lápiz, gruesa y con huequitos para el crayón. */
function grain(ctx: CanvasRenderingContext2D, color: string, coarse = false): CanvasPattern | string {
  const key = color + (coarse ? ':c' : '')
  let pat = grainCache.get(key)
  if (pat) return pat
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = color
  const cell = coarse ? 2 : 1
  for (let y = 0; y < 64; y += cell) {
    for (let x = 0; x < 64; x += cell) {
      const r = Math.random()
      if (coarse && r < 0.12) continue // huequitos del papel
      g.globalAlpha = coarse ? 0.6 + r * 0.4 : 0.45 + r * 0.55
      g.fillRect(x, y, cell, cell)
    }
  }
  pat = ctx.createPattern(c, 'repeat') ?? undefined
  if (!pat) return color
  grainCache.set(key, pat)
  return pat
}

const coreCache = new WeakMap<StrokeEl, Path2D>()

/** Brillitos repartidos a lo largo del trazo (siempre en los mismos lugares). */
function drawGlitter(ctx: CanvasRenderingContext2D, el: StrokeEl) {
  const p = el.points
  let seed = 0
  for (const ch of el.id) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const step = Math.max(3, Math.round(el.size * 0.5))
  for (let i = 0; i < p.length; i += 3 * step) {
    const r = el.size * (0.12 + rnd() * 0.18)
    const x = p[i] + (rnd() - 0.5) * el.size * 0.7
    const y = p[i + 1] + (rnd() - 0.5) * el.size * 0.7
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#ffe08a'
    ctx.globalAlpha = 0.75 + rnd() * 0.25
    ctx.beginPath()
    // Estrellita de 4 puntas
    ctx.moveTo(x, y - r * 1.6)
    ctx.quadraticCurveTo(x, y, x + r * 1.6, y)
    ctx.quadraticCurveTo(x, y, x, y + r * 1.6)
    ctx.quadraticCurveTo(x, y, x - r * 1.6, y)
    ctx.quadraticCurveTo(x, y, x, y - r * 1.6)
    ctx.fill()
  }
}

export interface DrawOptions {
  /** El papel es oscuro: el marcador no puede multiplicar. */
  darkPaper: boolean
}

export function drawStroke(ctx: CanvasRenderingContext2D, el: StrokeEl, opts: DrawOptions, path = strokePath(el)) {
  ctx.save()
  switch (el.tool) {
    case 'marcador':
      ctx.globalAlpha = opts.darkPaper ? 0.45 : 0.75
      if (!opts.darkPaper) ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = el.color
      ctx.fill(path)
      break
    case 'lapiz':
      ctx.globalAlpha = 0.92
      ctx.fillStyle = grain(ctx, el.color)
      ctx.fill(path)
      break
    case 'crayon':
      ctx.globalAlpha = 0.95
      ctx.fillStyle = grain(ctx, el.color, true)
      ctx.fill(path)
      break
    case 'acuarela':
      // Pintura aguada: transparente y con la orilla difuminada.
      ctx.globalAlpha = opts.darkPaper ? 0.5 : 0.4
      if (!opts.darkPaper) ctx.globalCompositeOperation = 'multiply'
      ctx.shadowColor = el.color
      ctx.shadowBlur = el.size * 0.8
      ctx.fillStyle = el.color
      ctx.fill(path)
      ctx.shadowBlur = 0
      ctx.globalAlpha *= 0.6
      ctx.fill(path)
      break
    case 'neon': {
      // Resplandor del color y centro clarito.
      ctx.shadowColor = el.color
      ctx.shadowBlur = el.size * 1.8
      ctx.fillStyle = el.color
      ctx.fill(path)
      ctx.shadowBlur = 0
      let core = coreCache.get(el)
      if (!core || !el.id) {
        core = strokeOutline(el.points, 'neon', el.size * 0.35, false, true)
        if (el.id) coreCache.set(el, core)
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.fill(core)
      break
    }
    case 'brillos':
      ctx.fillStyle = el.color
      ctx.globalAlpha = 0.9
      ctx.fill(path)
      drawGlitter(ctx, el)
      break
    default:
      ctx.fillStyle = el.color
      ctx.fill(path)
  }
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

    // Resaltados del marcador, detrás de las letras (fondo, subrayado, marco o contorno).
    if (el.highlights?.length) {
      lines.forEach((line, i) => {
        const s = starts[i]
        const lineW = ctx.measureText(line).width
        const ax = left + (el.align === 'left' ? 0 : el.align === 'center' ? (box.w - lineW) / 2 : box.w - lineW)
        const midY = top + lh * (i + 0.5)
        for (const h of el.highlights!) {
          const a = Math.max(h.start, s) - s
          const b = Math.min(h.end, s + line.length) - s
          if (b <= a) continue
          const x0 = ax + ctx.measureText(line.slice(0, a)).width
          const x1 = ax + ctx.measureText(line.slice(0, b)).width
          const pad = el.size * 0.12
          ctx.save()
          ctx.fillStyle = h.color
          ctx.strokeStyle = h.color
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          switch (h.style ?? 'fondo') {
            case 'fondo':
              ctx.globalAlpha = 0.85
              ctx.beginPath()
              ctx.roundRect(x0 - pad, top + lh * i + lh * 0.1, x1 - x0 + pad * 2, lh * 0.82, el.size * 0.18)
              ctx.fill()
              break
            case 'subrayado':
              ctx.lineWidth = Math.max(2, el.size * 0.09)
              ctx.beginPath()
              ctx.moveTo(x0, midY + el.size * 0.5)
              ctx.lineTo(x1, midY + el.size * 0.5)
              ctx.stroke()
              break
            case 'marco':
              ctx.lineWidth = Math.max(2, el.size * 0.07)
              ctx.beginPath()
              ctx.roundRect(x0 - pad * 1.5, top + lh * i + lh * 0.04, x1 - x0 + pad * 3, lh * 0.92, el.size * 0.3)
              ctx.stroke()
              break
            case 'contorno':
              // Halo que sigue la forma de cada letra.
              ctx.lineWidth = el.size * 0.3
              ctx.textBaseline = 'middle'
              ctx.textAlign = 'left'
              ctx.strokeText(line.slice(a, b), x0, midY)
              break
          }
          ctx.restore()
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
    if (el.locked) {
      // Página de PDF: sombrita de hoja para que se distinga del papel.
      ctx.save()
      ctx.shadowColor = 'rgba(90, 40, 60, 0.18)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetY = 4
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(-el.w / 2, -el.h / 2, el.w, el.h)
      ctx.restore()
    }
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
    case 'deco':
      return drawDeco(ctx, el)
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
