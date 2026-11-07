import { describe, expect, it } from 'vitest'
import { elBounds, eraseStroke, hitTest, lassoSelects, pointInPolygon, rotateEl, scaleEl, translateEl } from '../src/lib/canvas/geom'
import type { LineEl, ShapeEl, StrokeEl } from '../src/lib/types'

const stroke = (pts: [number, number][]): StrokeEl => ({
  type: 'stroke',
  id: 's',
  tool: 'pluma',
  color: '#000',
  size: 4,
  points: pts.flatMap(([x, y]) => [x, y, 0.5]),
  pressure: false,
})

const square: ShapeEl = { type: 'shape', id: 'q', shape: 'rect', x: 0, y: 0, w: 100, h: 50, rotation: 0, stroke: '#000', fill: null, strokeWidth: 2 }

describe('geometría', () => {
  it('punto en polígono', () => {
    const poly = [0, 0, 10, 0, 10, 10, 0, 10]
    expect(pointInPolygon(5, 5, poly)).toBe(true)
    expect(pointInPolygon(15, 5, poly)).toBe(false)
  })

  it('toca un trazo cerca de la línea y no lejos', () => {
    const s = stroke([[0, 0], [100, 0]])
    expect(hitTest(s, 50, 3, 1)).toBe(true)
    expect(hitTest(s, 50, 20, 1)).toBe(false)
  })

  it('toca una figura girada en su caja local', () => {
    const r = { ...square, rotation: Math.PI / 2 }
    // Girada 90°, la caja de 100×50 queda de 50×100 alrededor del centro (50, 25).
    expect(hitTest(r, 50, -20, 0)).toBe(true)
    expect(hitTest(r, 95, 25, 0)).toBe(false)
  })

  it('el lazo atrapa un trazo si la mayoría queda dentro', () => {
    const s = stroke([[10, 10], [20, 10], [30, 10], [40, 10], [200, 10]])
    expect(lassoSelects(s, [0, 0, 50, 0, 50, 50, 0, 50])).toBe(true)
    expect(lassoSelects(s, [0, 0, 15, 0, 15, 50, 0, 50])).toBe(false)
  })

  it('mover, escalar y girar', () => {
    const line: LineEl = { type: 'line', id: 'l', x1: 0, y1: 0, x2: 10, y2: 0, color: '#000', width: 2, start: 'nada', end: 'nada', dashed: false }
    expect(translateEl(line, 5, 5)).toMatchObject({ x1: 5, y1: 5, x2: 15, y2: 5 })
    expect(scaleEl(line, 0, 0, 2)).toMatchObject({ x2: 20, width: 4 })
    const r = rotateEl(line, 0, 0, Math.PI / 2)
    expect(r.x2).toBeCloseTo(0)
    expect(r.y2).toBeCloseTo(10)
    const sq = scaleEl(square, 0, 0, 2)
    expect(sq).toMatchObject({ x: 0, y: 0, w: 200, h: 100, strokeWidth: 4 })
  })

  it('el borrador parcial parte el trazo en dos', () => {
    const pts: [number, number][] = Array.from({ length: 21 }, (_, i) => [i * 5, 0])
    const s = stroke(pts)
    let n = 0
    const parts = eraseStroke(s, 50, 0, 6, () => 'n' + n++)
    expect(parts).toHaveLength(2)
    expect(parts![0].id).toBe('s')
    expect(eraseStroke(s, 50, 100, 6, () => 'x')).toBeNull()
  })

  it('caja de un trazo incluye el grosor', () => {
    const b = elBounds(stroke([[0, 0], [10, 10]]))
    expect(b).toEqual({ x: -4, y: -4, w: 18, h: 18 })
  })
})
