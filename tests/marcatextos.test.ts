import { describe, expect, it } from 'vitest'
import { straightenMarker } from '../src/lib/canvas/magicMarker'
import type { El, StrokeEl } from '../src/lib/types'

const stroke = (id: string, pts: [number, number][], tool: StrokeEl['tool'] = 'pluma', size = 4): StrokeEl => ({
  type: 'stroke',
  id,
  tool,
  color: '#000',
  size,
  points: pts.flatMap(([x, y]) => [x, y, 0.5]),
  pressure: false,
})

/** Una "palabra" a mano entre y=100 y y=130, de x=100 a x=300, con una letra alta. */
const word: El[] = [
  stroke('w1', Array.from({ length: 30 }, (_, i) => [100 + i * 3, 115 + Math.sin(i) * 15] as [number, number])),
  stroke('w2', Array.from({ length: 30 }, (_, i) => [200 + i * 3, 115 + Math.cos(i) * 15] as [number, number])),
  stroke('alta', [[250, 60], [252, 130]]),
]

let n = 0
const id = () => 'band' + n++

describe('marcatextos mágico', () => {
  it('endereza el trazo, lo pone detrás de la letra y del alto del renglón', () => {
    const wobbly = stroke('m', Array.from({ length: 40 }, (_, i) => [95 + i * 5.5, 118 + Math.sin(i * 0.7) * 6] as [number, number]), 'marcador', 22)
    const out = straightenMarker(wobbly, [...word], id)!
    const band = out[0] as StrokeEl
    // Va primero: queda detrás de toda la palabra
    expect(band.tool).toBe('marcador')
    expect(out.slice(1).map((e) => e.id)).toEqual(['w1', 'w2', 'alta'])
    // Recta y horizontal: todas las y iguales
    const ys = band.points.filter((_, i) => i % 3 === 1)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.01)
    // Centrada en el renglón (≈115) y del alto de la letra (≈30), sin contar la letra alta completa
    expect(ys[0]).toBeGreaterThan(105)
    expect(ys[0]).toBeLessThan(125)
    expect(band.size).toBeGreaterThan(25)
    expect(band.size).toBeLessThan(60)
  })

  it('sin letra debajo, solo se endereza', () => {
    const wobbly = stroke('m', [[0, 500], [50, 506], [100, 497], [150, 503]], 'marcador', 20)
    const out = straightenMarker(wobbly, [...word], id)!
    const band = out[out.length - 1] as StrokeEl
    expect(band.size).toBe(20)
    const ys = band.points.filter((_, i) => i % 3 === 1)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.01)
  })

  it('respeta la inclinación si la letra va chueca a propósito', () => {
    const diagonal = stroke('m', Array.from({ length: 20 }, (_, i) => [i * 10, i * 5] as [number, number]), 'marcador', 20)
    const band = straightenMarker(diagonal, [], id)![0] as StrokeEl
    const [x0, y0] = band.points
    const x1 = band.points[band.points.length - 3]
    const y1 = band.points[band.points.length - 2]
    expect((y1 - y0) / (x1 - x0)).toBeCloseTo(0.5, 1)
  })

  it('un toquecito no cambia nada', () => {
    expect(straightenMarker(stroke('m', [[0, 0], [3, 1]], 'marcador', 20), [], id)).toBeNull()
  })
})

describe('modos del marcatextos mágico', () => {
  const wobbly = () => stroke('m', Array.from({ length: 40 }, (_, i) => [95 + i * 5.5, 118 + Math.sin(i * 0.7) * 6] as [number, number]), 'marcador', 22)

  it('subrayar: línea recta debajo del renglón', async () => {
    const { applyHighlighter } = await import('../src/lib/canvas/magicMarker')
    const out = applyHighlighter(wobbly(), [...word], 'subrayado', id)!
    const line = out[out.length - 1]
    expect(line).toMatchObject({ type: 'line' })
    if (line.type !== 'line') return
    expect(line.y1).toBeCloseTo(line.y2, 5)
    // Debajo de la parte baja de la letra (≈130)
    expect(line.y1).toBeGreaterThan(128)
    expect(line.x2 - line.x1).toBeGreaterThan(150)
  })

  it('marco: recuadro redondeado sin relleno alrededor del renglón', async () => {
    const { applyHighlighter } = await import('../src/lib/canvas/magicMarker')
    const out = applyHighlighter(wobbly(), [...word], 'marco', id)!
    const box = out[out.length - 1]
    expect(box).toMatchObject({ type: 'shape', shape: 'redondeado', fill: null, rotation: 0 })
    if (box.type !== 'shape') return
    expect(box.y).toBeLessThan(105)
    expect(box.y + box.h).toBeGreaterThan(125)
  })

  it('contorno: un halo por cada letra tocada, detrás de ella', async () => {
    const { applyHighlighter } = await import('../src/lib/canvas/magicMarker')
    const out = applyHighlighter(wobbly(), [...word], 'contorno', id)!
    const halos = out.slice(0, 3) as StrokeEl[]
    expect(halos.every((h) => h.tool === 'marcador')).toBe(true)
    expect(halos.map((h) => h.size)).toEqual([4 + 22 * 0.35 * 2, 4 + 22 * 0.35 * 2, 4 + 22 * 0.35 * 2].map((v) => Math.round(v * 100) / 100))
    expect(out.slice(3).map((e) => e.id)).toEqual(['w1', 'w2', 'alta'])
  })
})
