import type { El, HighlightStyle, LineEl, ShapeEl, StrokeEl } from '../types'
import { hitTest } from './geom'

/** Ángulo (radianes) bajo el cual el resaltado se vuelve perfectamente horizontal. */
const SNAP = (6 * Math.PI) / 180

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))]
}

interface LineGeometry {
  /** Origen y dirección del renglón. */
  sx: number
  sy: number
  angle: number
  ux: number
  uy: number
  uMin: number
  uMax: number
  /** Centro y alto de la letra en ese renglón (perpendicular a la dirección). */
  vCenter: number
  height: number
  /** Índices de los trazos de letra que tocó el marcador. */
  touched: number[]
  /** Pasa de coordenadas del renglón (u, v) a la hoja. */
  toWorld: (u: number, v: number) => [number, number]
}

/** Analiza por dónde pasó el marcador y qué letra a mano tocó. */
function measureLine(marker: StrokeEl, elements: El[]): LineGeometry | null {
  const p = marker.points
  const n = p.length / 3
  if (n < 2) return null
  let sx = p[0]
  let sy = p[1]
  let ex = p[(n - 1) * 3]
  let ey = p[(n - 1) * 3 + 1]
  // Siempre de izquierda a derecha.
  if (ex < sx) [sx, sy, ex, ey] = [ex, ey, sx, sy]
  if (Math.hypot(ex - sx, ey - sy) < marker.size * 1.2) return null

  let angle = Math.atan2(ey - sy, ex - sx)
  if (Math.abs(angle) < SNAP) angle = 0
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const toU = (x: number, y: number) => (x - sx) * ux + (y - sy) * uy
  const toV = (x: number, y: number) => -(x - sx) * uy + (y - sy) * ux

  let uMin = Infinity
  let uMax = -Infinity
  const mv: number[] = []
  for (let i = 0; i < p.length; i += 3) {
    const u = toU(p[i], p[i + 1])
    uMin = Math.min(uMin, u)
    uMax = Math.max(uMax, u)
    mv.push(toV(p[i], p[i + 1]))
  }
  mv.sort((a, b) => a - b)
  const vMid = percentile(mv, 0.5)
  const r = marker.size / 2

  // Letras a mano que el marcador tocó (no otros marcadores).
  const step = Math.max(1, Math.floor(n / 60))
  const touched: number[] = []
  elements.forEach((el, idx) => {
    if (el.type !== 'stroke' || el.tool === 'marcador') return
    for (let i = 0; i < n; i += step) {
      if (hitTest(el, p[i * 3], p[i * 3 + 1], r * 0.6)) {
        touched.push(idx)
        return
      }
    }
  })

  // Alto de la letra en ese renglón (sin los rabitos muy largos).
  let vCenter = vMid
  let height = marker.size
  if (touched.length) {
    const vs: number[] = []
    for (const idx of touched) {
      const s = elements[idx] as StrokeEl
      for (let i = 0; i < s.points.length; i += 3) {
        const u = toU(s.points[i], s.points[i + 1])
        const v = toV(s.points[i], s.points[i + 1])
        if (u >= uMin - r && u <= uMax + r && Math.abs(v - vMid) < marker.size * 2) vs.push(v)
      }
    }
    if (vs.length > 4) {
      vs.sort((a, b) => a - b)
      const lo = percentile(vs, 0.12)
      const hi = percentile(vs, 0.88)
      vCenter = (lo + hi) / 2
      height = Math.max(marker.size * 0.7, (hi - lo) * 1.35)
    }
  }
  const toWorld = (u: number, v: number): [number, number] => [sx + ux * u - uy * v, sy + uy * u + ux * v]
  return { sx, sy, angle, ux, uy, uMin, uMax, vCenter, height, touched, toWorld }
}

const round = (v: number) => Math.round(v * 100) / 100

/** Inserta elementos detrás de la letra que tocó (o al final si no tocó nada). */
function insertBehind(elements: El[], add: El[], touched: number[]): El[] {
  const at = touched.length ? Math.min(...touched) : elements.length
  return [...elements.slice(0, at), ...add, ...elements.slice(at)]
}

/**
 * Marcatextos mágico sobre letra a mano. Según el modo:
 * - fondo: franja recta y pareja del alto de la letra, detrás de ella.
 * - subrayado: línea recta pareja debajo del renglón.
 * - marco: recuadro redondeado alrededor del renglón (solo el borde).
 * - contorno: halo que sigue la forma de cada letra tocada.
 * Devuelve la lista de elementos ya resaltada, o null si el trazo es muy cortito.
 */
export function applyHighlighter(marker: StrokeEl, elements: El[], mode: HighlightStyle, newId: () => string): El[] | null {
  const g = measureLine(marker, elements)
  if (!g) return null

  if (mode === 'contorno' && g.touched.length) {
    const halo = Math.max(5, marker.size * 0.35)
    const copies: StrokeEl[] = g.touched.map((idx) => {
      const s = elements[idx] as StrokeEl
      return { ...s, id: newId(), tool: 'marcador', color: marker.color, size: round(s.size + halo * 2), pressure: false }
    })
    return insertBehind(elements, copies, g.touched)
  }

  if (mode === 'subrayado') {
    const v = g.vCenter + g.height / 2 + Math.max(2, g.height * 0.08)
    const [x1, y1] = g.toWorld(g.uMin, v)
    const [x2, y2] = g.toWorld(g.uMax, v)
    const line: LineEl = {
      type: 'line',
      id: newId(),
      x1: round(x1),
      y1: round(y1),
      x2: round(x2),
      y2: round(y2),
      color: marker.color,
      width: round(Math.max(3, marker.size * 0.22)),
      start: 'nada',
      end: 'nada',
      dashed: false,
    }
    return [...elements, line]
  }

  if (mode === 'marco') {
    const pad = Math.max(6, g.height * 0.2)
    const w = g.uMax - g.uMin + pad * 2
    const h = g.height + pad
    const [cx, cy] = g.toWorld((g.uMin + g.uMax) / 2, g.vCenter)
    const box: ShapeEl = {
      type: 'shape',
      id: newId(),
      shape: 'redondeado',
      x: round(cx - w / 2),
      y: round(cy - h / 2),
      w: round(w),
      h: round(h),
      rotation: g.angle,
      stroke: marker.color,
      fill: null,
      strokeWidth: round(Math.max(2.5, marker.size * 0.15)),
    }
    return [...elements, box]
  }

  // Fondo (y contorno cuando no hay letra debajo): franja recta y pareja.
  const points: number[] = []
  const count = Math.max(2, Math.ceil((g.uMax - g.uMin) / 4))
  for (let i = 0; i <= count; i++) {
    const [x, y] = g.toWorld(g.uMin + ((g.uMax - g.uMin) * i) / count, g.vCenter)
    points.push(round(x), round(y), 0.5)
  }
  const band: StrokeEl = { ...marker, id: newId(), tool: 'marcador', size: Math.round(g.height * 10) / 10, points, pressure: false }
  return insertBehind(elements, [band], g.touched)
}

/** Franja de fondo (el modo original del marcatextos mágico). */
export function straightenMarker(marker: StrokeEl, elements: El[], newId: () => string): El[] | null {
  return applyHighlighter(marker, elements, 'fondo', newId)
}
