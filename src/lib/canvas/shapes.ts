import type { LineEl, ShapeEl } from '../types'
import { distToSegment } from './geom'
import { uid } from '../util'

type Pt = [number, number]

/** Simplifica un trazo (Ramer–Douglas–Peucker): deja solo las "esquinas". */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice()
  let maxD = 0
  let idx = 0
  const [a, b] = [pts[0], pts[pts.length - 1]]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distToSegment(pts[i][0], pts[i][1], a[0], a[1], b[0], b[1])
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= eps) return [a, b]
  const left = simplify(pts.slice(0, idx + 1), eps)
  const right = simplify(pts.slice(idx), eps)
  return [...left.slice(0, -1), ...right]
}

/** Para figuras cerradas: parte el trazo en el punto más lejano del inicio y simplifica cada mitad. */
function closedCorners(pts: Pt[], eps: number): Pt[] {
  let far = 0
  let best = -1
  pts.forEach(([x, y], i) => {
    const d = Math.hypot(x - pts[0][0], y - pts[0][1])
    if (d > best) {
      best = d
      far = i
    }
  })
  const a = simplify(pts.slice(0, far + 1), eps)
  const b = simplify(pts.slice(far), eps)
  const corners = [...a.slice(0, -1), ...b.slice(0, -1)]
  // Quita esquinas casi rectas (ángulo muy abierto) que deja el temblor de la mano.
  return corners.filter((p, i) => {
    const prev = corners[(i - 1 + corners.length) % corners.length]
    const next = corners[(i + 1) % corners.length]
    const v1 = [prev[0] - p[0], prev[1] - p[1]]
    const v2 = [next[0] - p[0], next[1] - p[1]]
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1)
    return cos > -0.94
  })
}

export interface ShapeStyle {
  color: string
  width: number
}

/**
 * Reconoce una figura dibujada a mano: línea, círculo/óvalo, triángulo, rectángulo o rombo.
 * `points` son tripletas x, y, presión. Devuelve null si no se parece a ninguna.
 */
export function recognizeShape(points: number[], style: ShapeStyle): ShapeEl | LineEl | null {
  const pts: Pt[] = []
  for (let i = 0; i < points.length; i += 3) pts.push([points[i], points[i + 1]])
  if (pts.length < 6) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const w = maxX - minX
  const h = maxY - minY
  const diag = Math.hypot(w, h)
  if (diag < 24) return null
  const first = pts[0]
  const last = pts[pts.length - 1]
  const closed = Math.hypot(last[0] - first[0], last[1] - first[1]) < diag * 0.22

  if (!closed) {
    const maxDev = Math.max(...pts.map(([x, y]) => distToSegment(x, y, first[0], first[1], last[0], last[1])))
    if (maxDev > diag * 0.06) return null
    return { type: 'line', id: uid(), x1: first[0], y1: first[1], x2: last[0], y2: last[1], color: style.color, width: style.width, start: 'nada', end: 'nada', dashed: false }
  }

  const base = { id: uid(), x: minX, y: minY, w, h, rotation: 0, stroke: style.color, fill: null, strokeWidth: style.width }
  const cx = minX + w / 2
  const cy = minY + h / 2
  // ¿Qué tan parecido a un óvalo? (0 = perfecto)
  const ellipseDev = pts.reduce((s, [x, y]) => s + Math.abs(Math.hypot((x - cx) / (w / 2 || 1), (y - cy) / (h / 2 || 1)) - 1), 0) / pts.length
  const corners = closedCorners(pts, diag * 0.07)

  if (corners.length === 3) return { type: 'shape', shape: 'triangulo', ...base }
  if (corners.length === 4) {
    const near = (px: number, py: number) => corners.some(([x, y]) => Math.hypot(x - px, y - py) < diag * 0.2)
    const isRect = near(minX, minY) && near(maxX, minY) && near(maxX, maxY) && near(minX, maxY)
    const isDiamond = near(cx, minY) && near(maxX, cy) && near(cx, maxY) && near(minX, cy)
    if (isRect) return { type: 'shape', shape: 'rect', ...base }
    if (isDiamond) return { type: 'shape', shape: 'rombo', ...base }
  }
  if (ellipseDev < 0.14) return { type: 'shape', shape: 'elipse', ...base }
  return null
}
