import { describe, expect, it } from 'vitest'
import { recognizeShape } from '../src/lib/canvas/shapes'

const style = { color: '#000', width: 3 }

/** Une puntos con pasos cortos y un poco de temblor, como una mano. */
function hand(path: [number, number][], wobble = 2): number[] {
  const out: number[] = []
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2 * wobble
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i]
    const [x1, y1] = path[i + 1]
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6))
    for (let k = 0; k < n; k++) out.push(x0 + ((x1 - x0) * k) / n + rnd(), y0 + ((y1 - y0) * k) / n + rnd(), 0.5)
  }
  const [lx, ly] = path[path.length - 1]
  out.push(lx, ly, 0.5)
  return out
}

const circle = (cx: number, cy: number, rx: number, ry: number) =>
  Array.from({ length: 41 }, (_, i) => [cx + Math.cos((i / 40) * Math.PI * 2) * rx, cy + Math.sin((i / 40) * Math.PI * 2) * ry] as [number, number])

describe('figuras a mano', () => {
  it('línea recta', () => {
    expect(recognizeShape(hand([[0, 0], [200, 100]]), style)).toMatchObject({ type: 'line', x1: expect.closeTo(0, -1), x2: 200, y2: 100 })
  })
  it('círculo y óvalo', () => {
    expect(recognizeShape(hand(circle(100, 100, 80, 80)), style)).toMatchObject({ type: 'shape', shape: 'elipse' })
    expect(recognizeShape(hand(circle(100, 100, 150, 60)), style)).toMatchObject({ type: 'shape', shape: 'elipse' })
  })
  it('rectángulo', () => {
    const r = recognizeShape(hand([[0, 0], [200, 0], [200, 120], [0, 120], [2, 3]]), style)
    expect(r).toMatchObject({ type: 'shape', shape: 'rect', w: expect.closeTo(200, -1), h: expect.closeTo(120, -1) })
  })
  it('triángulo', () => {
    expect(recognizeShape(hand([[100, 0], [200, 170], [0, 170], [98, 4]]), style)).toMatchObject({ type: 'shape', shape: 'triangulo' })
  })
  it('rombo', () => {
    expect(recognizeShape(hand([[100, 0], [200, 100], [100, 200], [0, 100], [98, 3]]), style)).toMatchObject({ type: 'shape', shape: 'rombo' })
  })
  it('garabatos y letras no se convierten', () => {
    const zigzag = hand([[0, 0], [40, 80], [80, 0], [120, 80], [160, 0]])
    expect(recognizeShape(zigzag, style)).toBeNull()
    expect(recognizeShape(hand([[0, 0], [3, 3]]), style)).toBeNull()
  })
})
