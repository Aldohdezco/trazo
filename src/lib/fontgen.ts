import { Font, Glyph, Path } from 'opentype.js'
import { getStroke } from 'perfect-freehand'
import type { CustomFont } from './types'

/**
 * La plantilla de cada letra es un cuadro de 1000×1000 (y hacia abajo).
 * Guías: alto de mayúsculas, alto de minúsculas, renglón y bajada.
 */
export const PAD = 1000
export const GUIDES = { alto: 150, x: 330, renglon: 760, bajada: 940 }
/** Grosor del trazo dentro de la fuente. */
export const PEN = 64

export const CHARSET: string[] = [
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'ñÑáéíóúüÁÉÍÓÚÜ',
  ...'0123456789',
  ...'.,;:¿?¡!\'"()-_/@#&%$+=*',
]

/** Contorno del trazo (polígono) en coordenadas de la plantilla. */
export function strokeOutline(points: number[]): [number, number][] {
  const input: [number, number, number][] = []
  for (let i = 0; i < points.length; i += 3) input.push([points[i], points[i + 1], points[i + 2] ?? 0.5])
  if (input.length === 1) input.push([input[0][0] + 0.5, input[0][1] + 0.5, input[0][2]])
  return getStroke(input, { size: PEN, thinning: 0.45, smoothing: 0.6, streamline: 0.4, simulatePressure: true, last: true }) as [number, number][]
}

function signedArea(poly: [number, number][]): number {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1])
  return a / 2
}

/** Contorno suave: curvas entre puntos medios (igual que en el lienzo). */
function smoothPath(poly: [number, number][], moveTo: (x: number, y: number) => void, quadTo: (cx: number, cy: number, x: number, y: number) => void) {
  const n = poly.length
  const mid = (i: number): [number, number] => [(poly[i % n][0] + poly[(i + 1) % n][0]) / 2, (poly[i % n][1] + poly[(i + 1) % n][1]) / 2]
  const start = mid(n - 1)
  moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const [mx, my] = mid(i)
    quadTo(poly[i][0], poly[i][1], mx, my)
  }
}

/** Contornos de una letra, todos girando en el mismo sentido (si no, al cruzarse dejarían huecos). */
export function glyphOutlines(strokes: number[][]): [number, number][][] {
  return strokes
    .map(strokeOutline)
    .filter((p) => p.length > 2)
    .map((p) => (signedArea(p) < 0 ? p.slice().reverse() : p))
}

/** Dibujo de la letra para mostrarlo en SVG (coordenadas de la plantilla). */
export function glyphSvgPath(strokes: number[][]): string {
  let d = ''
  for (const poly of glyphOutlines(strokes)) {
    smoothPath(
      poly,
      (x, y) => (d += `M${x.toFixed(1)} ${y.toFixed(1)}`),
      (cx, cy, x, y) => (d += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`),
    )
    d += 'Z'
  }
  return d
}

const SIDE = 50

export function buildFont(font: CustomFont): Font {
  const glyphs: Glyph[] = [
    new Glyph({ name: '.notdef', unicode: 0, advanceWidth: 500, path: new Path() }),
    new Glyph({ name: 'space', unicode: 32, advanceWidth: 300, path: new Path() }),
  ]
  for (const [ch, strokes] of Object.entries(font.glyphs)) {
    if (!strokes?.length || ch === ' ') continue
    const outlines = glyphOutlines(strokes)
    if (!outlines.length) continue
    let minX = Infinity
    let maxX = -Infinity
    for (const p of outlines) for (const [x] of p) (minX = Math.min(minX, x)), (maxX = Math.max(maxX, x))
    const dx = SIDE - minX
    const path = new Path()
    // En la fuente "y" va hacia arriba y el renglón es 0.
    const fy = (y: number) => Math.round(GUIDES.renglon - y)
    const fx = (x: number) => Math.round(x + dx)
    for (const poly of outlines) {
      smoothPath(
        poly.map(([x, y]) => [fx(x), fy(y)] as [number, number]),
        (x, y) => path.moveTo(x, y),
        (cx, cy, x, y) => path.quadraticCurveTo(cx, cy, x, y),
      )
      path.close()
    }
    const code = ch.codePointAt(0)!
    glyphs.push(new Glyph({ name: 'uni' + code.toString(16).toUpperCase().padStart(4, '0'), unicode: code, advanceWidth: Math.round(maxX - minX + SIDE * 2), path }))
  }
  return new Font({
    familyName: font.name.trim() || 'Mi letra',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 850,
    descender: -250,
    glyphs,
  })
}

export function fontBinary(font: CustomFont): ArrayBuffer {
  return buildFont(font).toArrayBuffer() as ArrayBuffer
}

export function customFamily(id: string): string {
  return 'trazo-' + id
}

const faces = new Map<string, FontFace>()

/** Registra (o actualiza) la fuente en el navegador para usarla en el lienzo. */
export async function registerFont(font: CustomFont) {
  const family = customFamily(font.id)
  const face = new FontFace(family, fontBinary(font))
  await face.load()
  const old = faces.get(font.id)
  if (old) document.fonts.delete(old)
  document.fonts.add(face)
  faces.set(font.id, face)
}

export function unregisterFont(id: string) {
  const old = faces.get(id)
  if (old) document.fonts.delete(old)
  faces.delete(id)
}

export function drawnCount(font: CustomFont): number {
  return CHARSET.filter((c) => font.glyphs[c]?.length).length
}
