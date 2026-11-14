import type { CoverTemplate, FontId, Paper, PenTool, ShapeKind } from './types'

export const PAPERS: { id: Paper; name: string }[] = [
  { id: 'liso', name: 'Liso' },
  { id: 'rayado', name: 'Rayado' },
  { id: 'cuadricula', name: 'Cuadrícula' },
  { id: 'punteado', name: 'Punteado' },
  { id: 'cornell', name: 'Cornell' },
  { id: 'semanal', name: 'Planner semanal' },
  { id: 'pentagrama', name: 'Pentagrama' },
]

export const PAPER_COLORS: { id: string; name: string }[] = [
  { id: '#ffffff', name: 'Blanco' },
  { id: '#fdf6ec', name: 'Crema' },
  { id: '#fdecef', name: 'Rosa' },
  { id: '#f1eafb', name: 'Lila' },
  { id: '#e9f7f0', name: 'Menta' },
  { id: '#e8f3fb', name: 'Celeste' },
  { id: '#2b2328', name: 'Negro' },
]

export const COVER_TEMPLATES: { id: CoverTemplate; name: string }[] = [
  { id: 'mono', name: 'Moño' },
  { id: 'perlas', name: 'Perlas' },
  { id: 'corazones', name: 'Corazones' },
  { id: 'vichy', name: 'Vichy' },
  { id: 'flores', name: 'Flores' },
  { id: 'encaje', name: 'Encaje' },
  { id: 'propia', name: 'La diseño yo ✏️' },
]

export const COVER_COLORS: { id: string; name: string }[] = [
  { id: '#f6c6d2', name: 'Rosa' },
  { id: '#f3e3d3', name: 'Crema' },
  { id: '#d9c8ef', name: 'Lila' },
  { id: '#c8e8d8', name: 'Menta' },
  { id: '#c7def2', name: 'Celeste' },
  { id: '#f8d2bd', name: 'Durazno' },
  { id: '#a8435f', name: 'Vino' },
  { id: '#3a2b33', name: 'Negro' },
]

/** Paleta de tinta: primero los básicos, luego los tonos lindos. */
export const INK_COLORS = [
  '#2b2328',
  '#6b4a57',
  '#c9577a',
  '#e889a6',
  '#b88ee0',
  '#7aa7e0',
  '#6cc4a4',
  '#f2b25c',
  '#e46a5e',
  '#ffffff',
]

export const MARKER_COLORS = ['#ffd1dc', '#ffe7a3', '#d8f5c6', '#cfe8ff', '#e6d6ff', '#ffd9bf']

export const FONTS: { id: FontId; name: string; family: string }[] = [
  { id: 'nunito', name: 'Redondita', family: 'Nunito' },
  { id: 'quicksand', name: 'Suave', family: 'Quicksand' },
  { id: 'playfair', name: 'Elegante', family: 'Playfair Display' },
  { id: 'dancing', name: 'Cursiva', family: 'Dancing Script' },
  { id: 'greatvibes', name: 'Caligrafía', family: 'Great Vibes' },
  { id: 'caveat', name: 'A mano', family: 'Caveat' },
  { id: 'tinos', name: 'Clásica', family: 'Tinos' },
  { id: 'specialelite', name: 'Máquina', family: 'Special Elite' },
]

export function fontFamily(id: FontId): string {
  // Las fuentes propias se registran como "trazo-<id>" (ver fontgen.ts).
  if (id.startsWith('custom:')) return 'trazo-' + id.slice(7)
  return FONTS.find((f) => f.id === id)?.family ?? 'Nunito'
}

export const PEN_TOOLS: { id: PenTool; name: string; defaultSize: number; min: number; max: number }[] = [
  { id: 'pluma', name: 'Pluma', defaultSize: 4, min: 1, max: 30 },
  { id: 'fino', name: 'Pluma fina', defaultSize: 2, min: 1, max: 12 },
  { id: 'lapiz', name: 'Lápiz', defaultSize: 3, min: 1, max: 20 },
  { id: 'crayon', name: 'Crayón', defaultSize: 10, min: 3, max: 40 },
  { id: 'pincel', name: 'Pincel', defaultSize: 12, min: 2, max: 60 },
  { id: 'caligrafia', name: 'Caligrafía', defaultSize: 10, min: 3, max: 40 },
  { id: 'acuarela', name: 'Acuarela', defaultSize: 24, min: 6, max: 80 },
  { id: 'neon', name: 'Neón', defaultSize: 6, min: 2, max: 24 },
  { id: 'brillos', name: 'Brillitos', defaultSize: 10, min: 4, max: 40 },
  { id: 'marcador', name: 'Marcador', defaultSize: 22, min: 6, max: 60 },
]

export const SHAPES: { id: ShapeKind; name: string }[] = [
  { id: 'rect', name: 'Rectángulo' },
  { id: 'redondeado', name: 'Redondeado' },
  { id: 'elipse', name: 'Círculo' },
  { id: 'triangulo', name: 'Triángulo' },
  { id: 'rombo', name: 'Rombo' },
  { id: 'estrella', name: 'Estrella' },
  { id: 'corazon', name: 'Corazón' },
]
