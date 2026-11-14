import type { El, StrokeEl } from '../types'
import { hitTest } from './geom'

/** Ángulo (radianes) bajo el cual la franja se vuelve perfectamente horizontal. */
const SNAP = (6 * Math.PI) / 180

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))]
}

/**
 * Marcatextos mágico: convierte un trazo de marcador en una franja recta y pareja,
 * del alto de la letra que tocó, y la pone DETRÁS de esa letra.
 * Devuelve la lista de elementos ya con la franja, o null si el trazo es muy cortito.
 */
export function straightenMarker(marker: StrokeEl, elements: El[], newId: () => string): El[] | null {
  const p = marker.points
  const n = p.length / 3
  if (n < 2) return null
  let sx = p[0]
  let sy = p[1]
  let ex = p[(n - 1) * 3]
  let ey = p[(n - 1) * 3 + 1]
  // Siempre de izquierda a derecha.
  if (ex < sx) [sx, sy, ex, ey] = [ex, ey, sx, sy]
  const len = Math.hypot(ex - sx, ey - sy)
  if (len < marker.size * 1.2) return null

  let angle = Math.atan2(ey - sy, ex - sx)
  if (Math.abs(angle) < SNAP) angle = 0
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  // u: a lo largo de la franja; v: perpendicular (hacia abajo)
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

  // Alto de la franja: lo que ocupa la letra en ese renglón (sin los rabitos muy largos).
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

  // Línea central recta con puntos cada pocas unidades (el marcador no adelgaza: queda pareja).
  const points: number[] = []
  const count = Math.max(2, Math.ceil((uMax - uMin) / 4))
  for (let i = 0; i <= count; i++) {
    const u = uMin + ((uMax - uMin) * i) / count
    const x = sx + ux * u - uy * vCenter
    const y = sy + uy * u + ux * vCenter
    points.push(Math.round(x * 100) / 100, Math.round(y * 100) / 100, 0.5)
  }
  const band: StrokeEl = { ...marker, id: newId(), size: Math.round(height * 10) / 10, points, pressure: false }
  const at = touched.length ? Math.min(...touched) : elements.length
  return [...elements.slice(0, at), band, ...elements.slice(at)]
}
