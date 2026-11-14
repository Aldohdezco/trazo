import type { DecoEl, El, ImageEl, LineEl, Rect, ShapeEl, StrokeEl, TextEl } from '../types'
import { layoutText } from './text'

export type BoxEl = ShapeEl | TextEl | ImageEl | DecoEl

export function isBoxEl(el: El): el is BoxEl {
  return el.type === 'shape' || el.type === 'text' || el.type === 'image' || el.type === 'deco'
}

/** Caja sin rotar de un elemento de caja. */
export function boxOf(el: BoxEl): Rect {
  if (el.type === 'text') return { x: el.x, y: el.y, w: el.w, h: layoutText(el).height }
  return { x: el.x, y: el.y, w: el.w, h: el.h }
}

export function rotatePoint(x: number, y: number, cx: number, cy: number, a: number): [number, number] {
  if (!a) return [x, y]
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

/** Esquinas (rotadas) de un elemento de caja, como [x0,y0,x1,y1,...]. */
export function boxCorners(el: BoxEl): number[] {
  const b = boxOf(el)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const pts = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.h],
    [b.x, b.y + b.h],
  ]
  return pts.flatMap(([x, y]) => rotatePoint(x, y, cx, cy, el.rotation))
}

function boundsOfPoints(flat: number[], stride: number, pad: number): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < flat.length; i += stride) {
    const x = flat[i]
    const y = flat[i + 1]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

const boundsCache = new WeakMap<El, Rect>()

export function elBounds(el: El): Rect {
  const hit = boundsCache.get(el)
  if (hit) return hit
  let r: Rect
  switch (el.type) {
    case 'stroke':
      r = boundsOfPoints(el.points, 3, el.size)
      break
    case 'line':
      r = boundsOfPoints([el.x1, el.y1, el.x2, el.y2], 2, el.width * 3)
      break
    case 'shape':
      r = boundsOfPoints(boxCorners(el), 2, el.strokeWidth / 2)
      break
    default:
      r = boundsOfPoints(boxCorners(el), 2, 0)
  }
  // Las medidas del texto dependen de las fuentes cargadas: no se guardan en caché.
  if (el.type !== 'text') boundsCache.set(el, r)
  return r
}

export function unionRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function contentBounds(els: El[]): Rect | null {
  return unionRects(els.map(elBounds))
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

/** Punto dentro de un polígono plano [x0,y0,x1,y1,...] (regla par-impar). */
export function pointInPolygon(x: number, y: number, poly: number[]): boolean {
  let inside = false
  const n = poly.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2]
    const yi = poly[i * 2 + 1]
    const xj = poly[j * 2]
    const yj = poly[j * 2 + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function strokeDistance(el: StrokeEl, x: number, y: number): number {
  const p = el.points
  if (p.length <= 3) return Math.hypot(x - p[0], y - p[1])
  let best = Infinity
  for (let i = 3; i < p.length; i += 3) {
    const d = distToSegment(x, y, p[i - 3], p[i - 2], p[i], p[i + 1])
    if (d < best) best = d
  }
  return best
}

/** ¿El punto (x, y) toca el elemento, con tolerancia tol (en unidades del mundo)? */
export function hitTest(el: El, x: number, y: number, tol: number): boolean {
  const b = elBounds(el)
  if (!pointInRect(x, y, { x: b.x - tol, y: b.y - tol, w: b.w + tol * 2, h: b.h + tol * 2 })) return false
  switch (el.type) {
    case 'stroke':
      return strokeDistance(el, x, y) <= el.size / 2 + tol
    case 'line':
      return distToSegment(x, y, el.x1, el.y1, el.x2, el.y2) <= el.width / 2 + tol
    default: {
      const box = boxOf(el)
      const [lx, ly] = rotatePoint(x, y, box.x + box.w / 2, box.y + box.h / 2, -el.rotation)
      return lx >= box.x - tol && lx <= box.x + box.w + tol && ly >= box.y - tol && ly <= box.y + box.h + tol
    }
  }
}

/** ¿El lazo (polígono plano) atrapa el elemento? */
export function lassoSelects(el: El, poly: number[]): boolean {
  switch (el.type) {
    case 'stroke': {
      const p = el.points
      const total = p.length / 3
      const step = Math.max(1, Math.floor(total / 40))
      let inside = 0
      let sampled = 0
      for (let i = 0; i < total; i += step) {
        sampled++
        if (pointInPolygon(p[i * 3], p[i * 3 + 1], poly)) inside++
      }
      return inside / sampled >= 0.5
    }
    case 'line':
      return pointInPolygon((el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2, poly)
    default: {
      const b = boxOf(el)
      return pointInPolygon(b.x + b.w / 2, b.y + b.h / 2, poly)
    }
  }
}

// ---------- Transformaciones (devuelven elementos nuevos) ----------

export function translateEl<T extends El>(el: T, dx: number, dy: number): T {
  switch (el.type) {
    case 'stroke': {
      const points = el.points.slice()
      for (let i = 0; i < points.length; i += 3) {
        points[i] += dx
        points[i + 1] += dy
      }
      return { ...el, points }
    }
    case 'line':
      return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
    default:
      return { ...el, x: (el as BoxEl).x + dx, y: (el as BoxEl).y + dy }
  }
}

/** Escala uniforme alrededor de (cx, cy). */
export function scaleEl<T extends El>(el: T, cx: number, cy: number, s: number): T {
  const sx = (x: number) => cx + (x - cx) * s
  const sy = (y: number) => cy + (y - cy) * s
  switch (el.type) {
    case 'stroke': {
      const points = el.points.slice()
      for (let i = 0; i < points.length; i += 3) {
        points[i] = sx(points[i])
        points[i + 1] = sy(points[i + 1])
      }
      return { ...el, points, size: el.size * s }
    }
    case 'line':
      return { ...el, x1: sx(el.x1), y1: sy(el.y1), x2: sx(el.x2), y2: sy(el.y2), width: el.width * s }
    case 'text': {
      const b = boxOf(el)
      const ncx = sx(b.x + b.w / 2)
      const ncy = sy(b.y + b.h / 2)
      const w = el.w * s
      const h = b.h * s
      return { ...el, x: ncx - w / 2, y: ncy - h / 2, w, size: el.size * s }
    }
    case 'shape': {
      const ncx = sx(el.x + el.w / 2)
      const ncy = sy(el.y + el.h / 2)
      const w = el.w * s
      const h = el.h * s
      return { ...el, x: ncx - w / 2, y: ncy - h / 2, w, h, strokeWidth: el.strokeWidth * s }
    }
    case 'deco': {
      const ncx = sx(el.x + el.w / 2)
      const ncy = sy(el.y + el.h / 2)
      const w = el.w * s
      const h = el.h * s
      return { ...el, x: ncx - w / 2, y: ncy - h / 2, w, h, size: el.size * s }
    }
    default: {
      const b = el as ImageEl
      const ncx = sx(b.x + b.w / 2)
      const ncy = sy(b.y + b.h / 2)
      const w = b.w * s
      const h = b.h * s
      return { ...el, x: ncx - w / 2, y: ncy - h / 2, w, h }
    }
  }
}

export function rotateEl<T extends El>(el: T, cx: number, cy: number, a: number): T {
  switch (el.type) {
    case 'stroke': {
      const points = el.points.slice()
      for (let i = 0; i < points.length; i += 3) {
        const [x, y] = rotatePoint(points[i], points[i + 1], cx, cy, a)
        points[i] = x
        points[i + 1] = y
      }
      return { ...el, points }
    }
    case 'line': {
      const [x1, y1] = rotatePoint(el.x1, el.y1, cx, cy, a)
      const [x2, y2] = rotatePoint(el.x2, el.y2, cx, cy, a)
      return { ...el, x1, y1, x2, y2 }
    }
    default: {
      const box = el as BoxEl
      const b = boxOf(box)
      const [ncx, ncy] = rotatePoint(b.x + b.w / 2, b.y + b.h / 2, cx, cy, a)
      return { ...el, x: ncx - b.w / 2, y: ncy - b.h / 2, rotation: box.rotation + a }
    }
  }
}

// ---------- Borrador ----------

export function strokeTouches(el: StrokeEl, x: number, y: number, r: number): boolean {
  return hitTest(el, x, y, r)
}

/**
 * Borrado parcial: quita los puntos dentro del círculo y parte el trazo en pedazos.
 * Devuelve null si el borrador no tocó el trazo.
 */
export function eraseStroke(el: StrokeEl, x: number, y: number, r: number, newId: () => string): StrokeEl[] | null {
  const reach = r + el.size / 2
  const p = el.points
  const segments: number[][] = []
  let current: number[] = []
  let touched = false
  for (let i = 0; i < p.length; i += 3) {
    if (Math.hypot(p[i] - x, p[i + 1] - y) <= reach) {
      touched = true
      if (current.length) segments.push(current)
      current = []
    } else current.push(p[i], p[i + 1], p[i + 2])
  }
  if (current.length) segments.push(current)
  if (!touched) return null
  return segments
    .filter((s) => s.length >= 6)
    .map((points, i) => ({ ...el, id: i === 0 ? el.id : newId(), points }))
}
