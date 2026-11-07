export type Paper = 'liso' | 'rayado' | 'cuadricula' | 'punteado' | 'cornell' | 'semanal' | 'pentagrama'

export interface Background {
  paper: Paper
  color: string
}

export type CoverTemplate = 'mono' | 'perlas' | 'corazones' | 'vichy' | 'flores' | 'encaje'

export interface Cover {
  template: CoverTemplate
  color: string
}

export interface Notebook {
  id: string
  name: string
  cover: Cover
  background: Background
  order: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface StoredBlob {
  type: string
  data: ArrayBuffer
}

export interface View {
  /** Coordenada del mundo que queda en la esquina superior izquierda de la pantalla. */
  x: number
  y: number
  zoom: number
}

export interface Note {
  id: string
  notebookId: string
  title: string
  background: Background
  order: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  thumb: StoredBlob | null
  view: View | null
  /** Texto de la nota (cajas de texto), para buscar. */
  searchText?: string
}

export type PenTool = 'pluma' | 'lapiz' | 'pincel' | 'marcador'

export interface StrokeEl {
  type: 'stroke'
  id: string
  tool: PenTool
  color: string
  size: number
  /** Tripletas planas x, y, presión. */
  points: number[]
  /** true si la presión viene del lápiz; si no, se simula por velocidad. */
  pressure: boolean
}

export type ShapeKind = 'rect' | 'redondeado' | 'elipse' | 'triangulo' | 'rombo' | 'estrella' | 'corazon'

export interface ShapeEl {
  type: 'shape'
  id: string
  shape: ShapeKind
  x: number
  y: number
  w: number
  h: number
  rotation: number
  stroke: string
  fill: string | null
  strokeWidth: number
}

export type LineCap = 'nada' | 'flecha' | 'punto'

export interface LineEl {
  type: 'line'
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width: number
  start: LineCap
  end: LineCap
  dashed: boolean
}

export type FontId =
  | 'nunito'
  | 'quicksand'
  | 'playfair'
  | 'dancing'
  | 'greatvibes'
  | 'caveat'
  | 'tinos'
  | 'specialelite'

export interface Highlight {
  /** Rango de caracteres [start, end) dentro de `text`. */
  start: number
  end: number
  color: string
}

export interface TextEl {
  type: 'text'
  id: string
  x: number
  y: number
  w: number
  rotation: number
  text: string
  font: FontId
  size: number
  color: string
  bold: boolean
  italic: boolean
  align: 'left' | 'center' | 'right'
  /** Fondo pintado con el marcador sobre partes del texto. */
  highlights?: Highlight[]
}

export interface ImageEl {
  type: 'image'
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  blobId: string
}

export type El = StrokeEl | ShapeEl | LineEl | TextEl | ImageEl

export interface NoteContent {
  noteId: string
  elements: El[]
}

export interface BlobRecord extends StoredBlob {
  id: string
}

export type Theme = 'auto' | 'claro' | 'oscuro'

export type HandStyle = 'cursiva' | 'molde' | 'mayusculas'

export interface Recognition {
  proveedor: 'ninguno' | 'myscript' | 'google'
  myscriptApp: string
  myscriptHmac: string
  googleKey: string
}

export interface Settings {
  soloLapiz: boolean
  tema: Theme
  recordatorioDias: number
  ultimoRespaldo: number | null
  coloresFavoritos: string[]
  hojaPdf: 'a4' | 'carta'
  reconocimiento: Recognition
  fuentesEstilo: Record<HandStyle, FontId>
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
