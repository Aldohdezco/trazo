import type { Background, DecoEl, El, FontId, HighlightStyle, LineCap, LineEl, PenTool, Rect, ShapeEl, ShapeKind, StrokeEl, TextEl, View } from '../types'
import { clamp, isDark, uid } from '../util'
import { drawPaper } from './background'
import { boxOf, contentBounds, elBounds, eraseStroke, hitTest, lassoSelects, rectsIntersect, rotateEl, rotatePoint, scaleEl, translateEl, unionRects } from './geom'
import { layoutText, measureWith, mergeHighlights, rangesUnder } from './text'
import { onImageLoaded } from './images'
import { drawElement, drawElements, drawLine, drawStroke, shapePath, strokeOutline } from './render'
import { recognizeShape } from './shapes'
import { applyHighlighter } from './magicMarker'

export type Tool = 'mano' | 'lazo' | 'magica' | 'resaltador' | PenTool | 'borrador' | 'figura' | 'linea' | 'texto'

export interface ToolOptions {
  tool: Tool
  color: string
  markerColor: string
  /** Marcatextos mágico: color, grosor y modo. */
  highlightColor: string
  highlighterSize: number
  highlighterMode: HighlightStyle
  /** Último lápiz del estuche que se usó (el botón "Lápices" vuelve a él). */
  lastPen: PenTool
  /** Letra del Lápiz mágico: 'auto' detecta el estilo; si no, siempre esa fuente. */
  magicFont: FontId | 'auto'
  sizes: Record<PenTool, number>
  eraserSize: number
  eraserMode: 'trazo' | 'parcial'
  shape: ShapeKind
  shapeFill: string | null
  shapeStrokeWidth: number
  lineWidth: number
  lineStart: LineCap
  lineEnd: LineCap
  lineDashed: boolean
  font: FontId
  textSize: number
}

export interface EngineCallbacks {
  /** Cambio que entra al historial (deshacer). */
  commit(els: El[]): void
  selection(ids: string[]): void
  view(v: View): void
  editText(el: TextEl, isNew: boolean): void
  /** Se llama antes de procesar cualquier toque (p. ej. para cerrar la edición de texto). */
  pointerDown?(): void
  /** Doble toque en una nota decorada: abrir su editor. */
  editDeco?(el: DecoEl): void
  /** Trazo hecho con el Lápiz mágico (ya está en el lienzo; se convertirá a texto). */
  magicStroke?(el: StrokeEl): void
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

const PEN_TOOLS: Tool[] = ['pluma', 'fino', 'lapiz', 'crayon', 'pincel', 'caligrafia', 'acuarela', 'neon', 'brillos', 'marcador', 'magica', 'resaltador']
const HANDLE_RADIUS = 20
const ROTATE_OFFSET = 34

type Gesture =
  | { kind: 'none' }
  | { kind: 'ignore' }
  | { kind: 'pan'; pointerId: number; last: [number, number] }
  | { kind: 'pinch'; startDist: number; startZoom: number; anchor: [number, number] }
  | {
      kind: 'draw'
      pointerId: number
      points: number[]
      tool: PenTool
      pressure: boolean
      start: number
      magic: boolean
      /** Trazo del marcatextos mágico. */
      hl: boolean
      color: string
      size: number
      /** Figura reconocida al dejar el lápiz quieto: reemplaza al trazo. */
      snapped?: ShapeEl | LineEl | null
    }
  | { kind: 'erase'; pointerId: number; before: El[]; changed: boolean; last: [number, number] | null }
  | { kind: 'lasso'; pointerId: number; poly: number[] }
  | {
      kind: 'transform'
      pointerId: number
      mode: 'move' | 'scale' | 'rotate'
      start: [number, number]
      before: El[]
      originals: El[]
      box: Rect
      moved: boolean
    }
  | { kind: 'shape'; pointerId: number; start: [number, number]; cur: [number, number] }
  | { kind: 'line'; pointerId: number; start: [number, number]; cur: [number, number] }

export class Engine {
  elements: El[] = []
  view: View = { x: -40, y: -40, zoom: 1 }
  bg: Background
  opts: ToolOptions
  soloLapiz = false
  selected = new Set<string>()
  hidden = new Set<string>()
  /** Zona de la portada: lo de afuera se ve tapado. */
  frame: Rect | null = null

  private base: HTMLCanvasElement
  private overlay: HTMLCanvasElement
  private bctx: CanvasRenderingContext2D
  private octx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private gesture: Gesture = { kind: 'none' }
  private pointers = new Map<number, { x: number; y: number; type: string }>()
  private hover: [number, number] | null = null
  private spaceDown = false
  private lastTap: { id: string; time: number } | null = null
  private raf = 0
  private holdTimer: ReturnType<typeof setTimeout> | undefined
  private holdAnchor: [number, number] = [0, 0]
  private dirtyBase = false
  private dirtyOverlay = false
  private cleanup: (() => void)[] = []

  constructor(
    private container: HTMLElement,
    bg: Background,
    opts: ToolOptions,
    private cb: EngineCallbacks,
  ) {
    this.bg = bg
    this.opts = opts
    this.base = document.createElement('canvas')
    this.overlay = document.createElement('canvas')
    for (const c of [this.base, this.overlay]) {
      c.style.position = 'absolute'
      c.style.inset = '0'
      c.style.width = '100%'
      c.style.height = '100%'
      container.appendChild(c)
    }
    this.bctx = this.base.getContext('2d')!
    this.octx = this.overlay.getContext('2d')!

    const ro = new ResizeObserver(() => this.resize())
    ro.observe(container)
    this.cleanup.push(() => ro.disconnect())

    const on = <K extends keyof HTMLElementEventMap>(t: K, fn: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions) => {
      container.addEventListener(t, fn as EventListener, o)
      this.cleanup.push(() => container.removeEventListener(t, fn as EventListener, o))
    }
    on('pointerdown', (e) => this.onDown(e))
    on('pointermove', (e) => this.onMove(e))
    on('pointerup', (e) => this.onUp(e))
    on('pointercancel', (e) => this.onUp(e, true))
    on('pointerleave', () => {
      this.hover = null
      this.requestRender(false, true)
    })
    on('wheel', (e) => this.onWheel(e), { passive: false })
    on('contextmenu', (e) => e.preventDefault())

    const keyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e)) {
        this.spaceDown = true
        container.style.cursor = 'grab'
      }
    }
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spaceDown = false
        this.updateCursor()
      }
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    this.cleanup.push(() => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    })
    this.cleanup.push(onImageLoaded(() => this.requestRender(true, false)))
    if (document.fonts) {
      const fontsDone = () => this.requestRender(true, true)
      document.fonts.addEventListener('loadingdone', fontsDone)
      window.addEventListener('trazo-fuentes', fontsDone)
      this.cleanup.push(() => {
        document.fonts.removeEventListener('loadingdone', fontsDone)
        window.removeEventListener('trazo-fuentes', fontsDone)
      })
    }
    this.resize()
    this.updateCursor()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.cleanup.forEach((fn) => fn())
    this.base.remove()
    this.overlay.remove()
  }

  // ---------- API pública ----------

  setElements(els: El[]) {
    this.elements = els
    const ids = new Set(els.map((e) => e.id))
    const before = this.selected.size
    for (const id of [...this.selected]) if (!ids.has(id)) this.selected.delete(id)
    if (before !== this.selected.size) this.cb.selection([...this.selected])
    this.requestRender(true, true)
  }

  setBackground(bg: Background) {
    this.bg = bg
    this.requestRender(true, false)
  }

  setOptions(opts: ToolOptions) {
    const toolChanged = opts.tool !== this.opts.tool
    this.opts = opts
    if (toolChanged && opts.tool !== 'lazo') this.select([])
    this.updateCursor()
    this.requestRender(false, true)
  }

  setView(v: View, notify = true) {
    this.view = { x: v.x, y: v.y, zoom: clamp(v.zoom, MIN_ZOOM, MAX_ZOOM) }
    if (notify) this.cb.view(this.view)
    this.requestRender(true, true)
  }

  setHidden(ids: string[]) {
    this.hidden = new Set(ids)
    this.requestRender(true, true)
  }

  select(ids: string[]) {
    this.selected = new Set(ids)
    this.cb.selection(ids)
    this.requestRender(false, true)
  }

  zoomBy(factor: number, sx = this.w / 2, sy = this.h / 2) {
    const z = clamp(this.view.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    const [wx, wy] = this.toWorld(sx, sy)
    this.setView({ x: wx - sx / z, y: wy - sy / z, zoom: z })
  }

  zoomTo(z: number) {
    this.zoomBy(z / this.view.zoom)
  }

  /** Muestra todo el contenido. `maxZoom` evita agrandar de más una nota con poquito. */
  fitContent(maxZoom = 2) {
    const b = this.frame ?? contentBounds(this.elements)
    if (!b) return this.setView({ x: -40, y: -40, zoom: 1 })
    this.fitRect(b, maxZoom)
  }

  /** Ajusta al ancho de un rectángulo y muestra su parte de arriba (para páginas de PDF). */
  fitWidth(b: Rect, maxZoom = 2) {
    const pad = 24
    const z = clamp((this.w - pad * 2) / b.w, MIN_ZOOM, maxZoom)
    this.setView({ x: b.x + b.w / 2 - this.w / 2 / z, y: b.y - pad / z, zoom: z })
  }

  /** Centra y ajusta el zoom para que se vea completo un rectángulo del lienzo. */
  fitRect(b: Rect, maxZoom = 2) {
    const pad = 60
    const z = clamp(Math.min(this.w / (b.w + pad * 2), this.h / (b.h + pad * 2)), MIN_ZOOM, maxZoom)
    this.setView({ x: b.x + b.w / 2 - this.w / 2 / z, y: b.y + b.h / 2 - this.h / 2 / z, zoom: z })
  }

  /** Centro visible, en coordenadas del mundo. */
  viewCenter(): [number, number] {
    return this.toWorld(this.w / 2, this.h / 2)
  }

  viewSize(): [number, number] {
    return [this.w / this.view.zoom, this.h / this.view.zoom]
  }

  toWorld(sx: number, sy: number): [number, number] {
    return [this.view.x + sx / this.view.zoom, this.view.y + sy / this.view.zoom]
  }

  toScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.view.x) * this.view.zoom, (wy - this.view.y) * this.view.zoom]
  }

  selectionBounds(): Rect | null {
    if (!this.selected.size) return null
    return unionRects(this.elements.filter((e) => this.selected.has(e.id)).map(elBounds))
  }

  /** Caja de la selección en pantalla, para colocar la barra de acciones. */
  selectionScreenRect(): Rect | null {
    const b = this.selectionBounds()
    if (!b) return null
    const [x, y] = this.toScreen(b.x, b.y)
    return { x, y, w: b.w * this.view.zoom, h: b.h * this.view.zoom }
  }

  // ---------- Tamaño y render ----------

  private resize() {
    const r = this.container.getBoundingClientRect()
    this.w = r.width
    this.h = r.height
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    for (const c of [this.base, this.overlay]) {
      c.width = Math.max(1, Math.round(this.w * this.dpr))
      c.height = Math.max(1, Math.round(this.h * this.dpr))
    }
    this.renderBase()
    this.renderOverlay()
  }

  requestRender(base: boolean, overlay: boolean) {
    this.dirtyBase ||= base
    this.dirtyOverlay ||= overlay
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      if (this.dirtyBase) this.renderBase()
      if (this.dirtyOverlay) this.renderOverlay()
      this.dirtyBase = this.dirtyOverlay = false
    })
  }

  private worldTransform(ctx: CanvasRenderingContext2D) {
    const z = this.view.zoom * this.dpr
    ctx.setTransform(z, 0, 0, z, -this.view.x * z, -this.view.y * z)
  }

  private visibleRect(): Rect {
    return { x: this.view.x, y: this.view.y, w: this.w / this.view.zoom, h: this.h / this.view.zoom }
  }

  private renderBase() {
    const ctx = this.bctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    drawPaper(ctx, this.bg, this.view, this.w, this.h)
    this.worldTransform(ctx)
    drawElements(ctx, this.elements, this.visibleRect(), { darkPaper: isDark(this.bg.color) }, this.hidden)
    if (this.frame) {
      const f = this.frame
      const v = this.visibleRect()
      ctx.save()
      ctx.fillStyle = 'rgba(90, 40, 60, 0.35)'
      ctx.beginPath()
      ctx.rect(v.x, v.y, v.w, v.h)
      ctx.rect(f.x + f.w, f.y, -f.w, f.h)
      ctx.fill('evenodd')
      ctx.setLineDash([8 / this.view.zoom, 6 / this.view.zoom])
      ctx.lineWidth = 2 / this.view.zoom
      ctx.strokeStyle = '#d9668a'
      ctx.strokeRect(f.x, f.y, f.w, f.h)
      ctx.restore()
    }
  }

  private renderOverlay() {
    const ctx = this.octx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height)
    const g = this.gesture
    const darkPaper = isDark(this.bg.color)
    this.worldTransform(ctx)

    if (g.kind === 'draw' && g.snapped) {
      drawElement(ctx, g.snapped, { darkPaper })
    } else if (g.kind === 'draw' && g.points.length) {
      const size = g.size
      const path = strokeOutline(g.points, g.tool, size, g.pressure, false)
      const live: StrokeEl = { type: 'stroke', id: '', tool: g.tool, color: g.color, size, points: g.points, pressure: g.pressure }
      // En el lienzo de encima no hay "multiplicar" contra el papel: solo transparencia.
      ctx.save()
      if (g.tool === 'marcador') ctx.globalAlpha = 0.6
      drawStroke(ctx, live, { darkPaper: true }, path)
      ctx.restore()
    }

    if (g.kind === 'shape') {
      const el = this.shapeFrom(g.start, g.cur)
      ctx.save()
      ctx.translate(el.x + el.w / 2, el.y + el.h / 2)
      const p = shapePath(el.shape, el.w, el.h)
      if (el.fill) {
        ctx.fillStyle = el.fill
        ctx.fill(p)
      }
      ctx.lineWidth = el.strokeWidth
      ctx.strokeStyle = el.stroke
      ctx.lineJoin = 'round'
      ctx.stroke(p)
      ctx.restore()
    }

    if (g.kind === 'line') drawLine(ctx, this.lineFrom(g.start, g.cur))

    // Lo demás se dibuja en coordenadas de pantalla.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    if (g.kind === 'lasso' && g.poly.length > 2) {
      ctx.save()
      ctx.beginPath()
      for (let i = 0; i < g.poly.length; i += 2) {
        const [x, y] = this.toScreen(g.poly[i], g.poly[i + 1])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(233, 137, 166, 0.10)'
      ctx.fill()
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#d9668a'
      ctx.stroke()
      ctx.restore()
    }

    const sel = this.selectionScreenRect()
    if (sel && g.kind !== 'lasso') {
      ctx.save()
      const pad = 8
      ctx.setLineDash([6, 5])
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#d9668a'
      ctx.strokeRect(sel.x - pad, sel.y - pad, sel.w + pad * 2, sel.h + pad * 2)
      ctx.setLineDash([])
      const handles = this.handlePositions()!
      // Girar
      ctx.beginPath()
      ctx.moveTo(handles.rotate[0], handles.rotate[1] + 10)
      ctx.lineTo(handles.rotate[0], sel.y - pad)
      ctx.stroke()
      for (const [hx, hy, kind] of [
        [...handles.rotate, 'r'],
        [...handles.scale, 's'],
      ] as [number, number, string][]) {
        ctx.beginPath()
        ctx.arc(hx, hy, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#d9668a'
        ctx.stroke()
        ctx.fillStyle = '#d9668a'
        ctx.beginPath()
        if (kind === 'r') ctx.arc(hx, hy, 3.5, 0, Math.PI * 2)
        else ctx.rect(hx - 3.5, hy - 3.5, 7, 7)
        ctx.fill()
      }
      ctx.restore()
    }

    // Círculo del borrador
    const eraserAt = g.kind === 'erase' && g.last ? this.toScreen(g.last[0], g.last[1]) : this.opts.tool === 'borrador' ? this.hover : null
    if (eraserAt) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(eraserAt[0], eraserAt[1], this.opts.eraserSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = darkPaper ? 'rgba(255,255,255,0.12)' : 'rgba(217, 102, 138, 0.10)'
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#d9668a'
      ctx.stroke()
      ctx.restore()
    }
  }

  private handlePositions(): { rotate: [number, number]; scale: [number, number] } | null {
    const sel = this.selectionScreenRect()
    if (!sel) return null
    const pad = 8
    return {
      rotate: [sel.x + sel.w / 2, sel.y - pad - ROTATE_OFFSET],
      scale: [sel.x + sel.w + pad, sel.y + sel.h + pad],
    }
  }

  private updateCursor() {
    const t = this.opts.tool
    this.container.style.cursor =
      t === 'mano' ? 'grab' : t === 'lazo' ? 'default' : t === 'texto' ? 'text' : t === 'borrador' ? 'none' : 'crosshair'
  }

  // ---------- Entrada ----------

  private local(e: PointerEvent | WheelEvent | { clientX: number; clientY: number }): [number, number] {
    const r = this.container.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  private touchPoints(): [number, number][] {
    return [...this.pointers.values()].filter((p) => p.type === 'touch').map((p) => [p.x, p.y])
  }

  private onDown(e: PointerEvent) {
    // Los botones flotantes viven dentro del mismo contenedor: solo el lienzo dibuja.
    if (e.target !== this.overlay) return
    // Evita que el toque le quite el foco al texto que se acaba de abrir.
    e.preventDefault()
    this.cb.pointerDown?.()
    const [sx, sy] = this.local(e)
    this.pointers.set(e.pointerId, { x: sx, y: sy, type: e.pointerType })
    try {
      this.container.setPointerCapture(e.pointerId)
    } catch {
      /* algunos navegadores no dejan capturar */
    }

    if (e.pointerType === 'touch') {
      const touches = this.touchPoints()
      if (touches.length >= 2) {
        const g = this.gesture
        // Un trazo largo no se cancela por un roce de la palma.
        const busy = g.kind === 'draw' && (performance.now() - g.start > 300 || g.points.length > 30) && this.pointers.get(g.pointerId)?.type !== 'touch'
        if (busy) return
        this.cancelGesture()
        const [a, b] = touches
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        this.gesture = { kind: 'pinch', startDist: Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1])), startZoom: this.view.zoom, anchor: this.toWorld(mid[0], mid[1]) }
        return
      }
      if (this.gesture.kind === 'ignore') return
      if (this.soloLapiz) {
        this.gesture = { kind: 'pan', pointerId: e.pointerId, last: [sx, sy] }
        return
      }
    }
    if (this.gesture.kind !== 'none') return
    if (e.pointerType === 'mouse' && e.button === 2) return

    if (e.button === 1 || this.spaceDown || this.opts.tool === 'mano') {
      this.gesture = { kind: 'pan', pointerId: e.pointerId, last: [sx, sy] }
      this.container.style.cursor = 'grabbing'
      return
    }
    this.startTool(e, sx, sy)
  }

  private startTool(e: PointerEvent, sx: number, sy: number) {
    const [wx, wy] = this.toWorld(sx, sy)
    const tool = this.opts.tool
    const id = e.pointerId

    if (PEN_TOOLS.includes(tool)) {
      const pressure = e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5
      const magic = tool === 'magica'
      const hl = tool === 'resaltador'
      const penTool: PenTool = magic ? 'pluma' : hl ? 'marcador' : (tool as PenTool)
      this.gesture = {
        kind: 'draw',
        pointerId: id,
        points: [wx, wy, pressure ? e.pressure : 0.5],
        tool: penTool,
        pressure,
        start: performance.now(),
        magic,
        hl,
        color: hl ? this.opts.highlightColor : this.strokeColor(penTool),
        size: hl ? this.opts.highlighterSize : this.opts.sizes[penTool],
      }
      this.armHold(sx, sy)
      this.requestRender(false, true)
      return
    }
    switch (tool) {
      case 'borrador':
        this.gesture = { kind: 'erase', pointerId: id, before: this.elements, changed: false, last: null }
        this.eraseAt(wx, wy)
        return
      case 'lazo': {
        const h = this.handlePositions()
        const b = this.selectionBounds()
        if (h && b) {
          const mode = Math.hypot(sx - h.rotate[0], sy - h.rotate[1]) < HANDLE_RADIUS
            ? 'rotate'
            : Math.hypot(sx - h.scale[0], sy - h.scale[1]) < HANDLE_RADIUS
              ? 'scale'
              : null
          const pad = 8 / this.view.zoom
          const inside = wx >= b.x - pad && wx <= b.x + b.w + pad && wy >= b.y - pad && wy <= b.y + b.h + pad
          if (mode || inside) {
            this.gesture = {
              kind: 'transform',
              pointerId: id,
              mode: mode ?? 'move',
              start: [wx, wy],
              before: this.elements,
              originals: this.elements.filter((el) => this.selected.has(el.id)),
              box: b,
              moved: false,
            }
            return
          }
        }
        this.gesture = { kind: 'lasso', pointerId: id, poly: [wx, wy] }
        return
      }
      case 'figura':
        this.gesture = { kind: 'shape', pointerId: id, start: [wx, wy], cur: [wx, wy] }
        return
      case 'linea':
        this.gesture = { kind: 'line', pointerId: id, start: [wx, wy], cur: [wx, wy] }
        return
      case 'texto': {
        const tol = 6 / this.view.zoom
        const hit = [...this.elements].reverse().find((el) => el.type === 'text' && hitTest(el, wx, wy, tol)) as TextEl | undefined
        if (hit) {
          this.cb.editText(hit, false)
          return
        }
        const size = this.opts.textSize
        this.cb.editText(
          {
            type: 'text',
            id: uid(),
            x: wx,
            y: wy - size * 0.7,
            w: Math.max(240, Math.min(520, this.w / this.view.zoom - (wx - this.view.x) - 24)),
            rotation: 0,
            text: '',
            font: this.opts.font,
            size,
            color: this.opts.color,
            bold: false,
            italic: false,
            align: 'left',
          },
          true,
        )
        return
      }
    }
  }

  private onMove(e: PointerEvent) {
    const [sx, sy] = this.local(e)
    const p = this.pointers.get(e.pointerId)
    if (p) {
      p.x = sx
      p.y = sy
    }
    const g = this.gesture

    if (g.kind === 'none' || (g.kind !== 'pinch' && 'pointerId' in g && g.pointerId !== e.pointerId)) {
      if (e.pointerType !== 'touch') {
        this.hover = [sx, sy]
        if (this.opts.tool === 'borrador') this.requestRender(false, true)
      }
      return
    }

    switch (g.kind) {
      case 'pinch': {
        const t = this.touchPoints()
        if (t.length < 2) return
        const [a, b] = t
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const z = clamp((g.startZoom * Math.hypot(a[0] - b[0], a[1] - b[1])) / g.startDist, MIN_ZOOM, MAX_ZOOM)
        this.setView({ x: g.anchor[0] - mid[0] / z, y: g.anchor[1] - mid[1] / z, zoom: z })
        return
      }
      case 'pan': {
        const dx = (sx - g.last[0]) / this.view.zoom
        const dy = (sy - g.last[1]) / this.view.zoom
        g.last = [sx, sy]
        this.setView({ ...this.view, x: this.view.x - dx, y: this.view.y - dy })
        return
      }
      case 'draw': {
        // Ya se convirtió en figura: lo que siga moviéndose no cuenta.
        if (g.snapped) return
        if (Math.hypot(sx - this.holdAnchor[0], sy - this.holdAnchor[1]) > 6) this.armHold(sx, sy)
        const events = e.getCoalescedEvents?.() ?? [e]
        const minDist = 0.6 / this.view.zoom
        for (const ce of events.length ? events : [e]) {
          const [x, y] = this.toWorld(...this.local(ce))
          const n = g.points.length
          if (Math.hypot(x - g.points[n - 3], y - g.points[n - 2]) < minDist) continue
          g.points.push(x, y, g.pressure ? ce.pressure || 0.5 : 0.5)
        }
        this.requestRender(false, true)
        return
      }
      case 'erase': {
        const [wx, wy] = this.toWorld(sx, sy)
        this.eraseAt(wx, wy)
        return
      }
      case 'lasso': {
        const [wx, wy] = this.toWorld(sx, sy)
        g.poly.push(wx, wy)
        this.requestRender(false, true)
        return
      }
      case 'transform': {
        const [wx, wy] = this.toWorld(sx, sy)
        g.moved = true
        let fn: (el: El) => El
        const cx = g.box.x + g.box.w / 2
        const cy = g.box.y + g.box.h / 2
        if (g.mode === 'move') {
          const dx = wx - g.start[0]
          const dy = wy - g.start[1]
          fn = (el) => translateEl(el, dx, dy)
        } else if (g.mode === 'scale') {
          // Escala desde la esquina opuesta (arriba a la izquierda).
          const ax = g.box.x
          const ay = g.box.y
          const d0 = Math.hypot(g.start[0] - ax, g.start[1] - ay)
          const s = clamp(Math.hypot(wx - ax, wy - ay) / Math.max(1, d0), 0.05, 50)
          fn = (el) => scaleEl(el, ax, ay, s)
        } else {
          let a = Math.atan2(wy - cy, wx - cx) - Math.atan2(g.start[1] - cy, g.start[0] - cx)
          // Imán a múltiplos de 15°
          const snap = Math.PI / 12
          const near = Math.round(a / snap) * snap
          if (Math.abs(a - near) < 0.05) a = near
          fn = (el) => rotateEl(el, cx, cy, a)
        }
        const moved = new Map(g.originals.map((el) => [el.id, fn(el)]))
        this.elements = g.before.map((el) => moved.get(el.id) ?? el)
        this.requestRender(true, true)
        return
      }
      case 'shape':
      case 'line':
        g.cur = this.toWorld(sx, sy)
        if (e.shiftKey && g.kind === 'shape') {
          const d = Math.max(Math.abs(g.cur[0] - g.start[0]), Math.abs(g.cur[1] - g.start[1]))
          g.cur = [g.start[0] + Math.sign(g.cur[0] - g.start[0] || 1) * d, g.start[1] + Math.sign(g.cur[1] - g.start[1] || 1) * d]
        }
        this.requestRender(false, true)
        return
    }
  }

  private onUp(e: PointerEvent, cancelled = false) {
    this.pointers.delete(e.pointerId)
    const g = this.gesture

    if (g.kind === 'pinch') {
      if (this.touchPoints().length < 2) this.gesture = this.touchPoints().length ? { kind: 'ignore' } : { kind: 'none' }
      return
    }
    if (g.kind === 'ignore') {
      if (!this.touchPoints().length) this.gesture = { kind: 'none' }
      return
    }
    if (g.kind === 'none' || ('pointerId' in g && g.pointerId !== e.pointerId)) return
    this.gesture = { kind: 'none' }
    clearTimeout(this.holdTimer)
    if (cancelled) {
      this.revert(g)
      this.requestRender(true, true)
      return
    }

    switch (g.kind) {
      case 'pan':
        this.updateCursor()
        break
      case 'draw': {
        if (g.snapped) {
          this.commit([...this.elements, g.snapped])
          break
        }
        const points = g.points.length === 3 ? [...g.points, g.points[0] + 0.1, g.points[1] + 0.1, g.points[2]] : g.points
        const el: StrokeEl = {
          type: 'stroke',
          id: uid(),
          tool: g.tool,
          color: g.color,
          size: g.size,
          points: points.map((v) => Math.round(v * 100) / 100),
          pressure: g.pressure,
        }
        // Marcatextos mágico: sobre texto resalta las letras; sobre letra a mano se acomoda parejito.
        if (g.hl) {
          const mode = this.opts.highlighterMode
          const done = this.highlightTexts(el, mode) ?? applyHighlighter(el, this.elements, mode, uid)
          if (done) {
            this.commit(done)
            break
          }
        }
        this.commit([...this.elements, el])
        if (g.magic) this.cb.magicStroke?.(el)
        break
      }
      case 'erase':
        if (g.changed) this.cb.commit(this.elements)
        break
      case 'lasso':
        this.finishLasso(g.poly)
        break
      case 'transform':
        if (g.moved) this.cb.commit(this.elements)
        else this.tapSelect(g.start[0], g.start[1])
        break
      case 'shape': {
        const el = this.shapeFrom(g.start, g.cur, true)
        this.commit([...this.elements, el])
        break
      }
      case 'line': {
        const len = Math.hypot(g.cur[0] - g.start[0], g.cur[1] - g.start[1]) * this.view.zoom
        if (len > 6) this.commit([...this.elements, this.lineFrom(g.start, g.cur)])
        break
      }
    }
    this.requestRender(true, true)
  }

  private revert(g: Gesture) {
    if (g.kind === 'erase' || g.kind === 'transform') this.elements = g.before
  }

  /** Si el lápiz se queda quieto un momento al final de un trazo, intenta enderezarlo como figura. */
  private armHold(sx: number, sy: number) {
    clearTimeout(this.holdTimer)
    this.holdAnchor = [sx, sy]
    this.holdTimer = setTimeout(() => this.trySnap(), 650)
  }

  private trySnap() {
    const g = this.gesture
    if (g.kind !== 'draw' || g.magic || g.hl || g.tool === 'marcador' || g.snapped) return
    const shape = recognizeShape(g.points, { color: g.color, width: Math.max(2, g.size * 0.8) })
    if (!shape) return
    g.snapped = shape
    navigator.vibrate?.(12)
    this.requestRender(false, true)
  }

  private cancelGesture() {
    clearTimeout(this.holdTimer)
    this.revert(this.gesture)
    this.gesture = { kind: 'none' }
    this.requestRender(true, true)
  }

  private onWheel(e: WheelEvent) {
    if (e.target !== this.overlay) return
    e.preventDefault()
    const [sx, sy] = this.local(e)
    const scale = e.deltaMode === 1 ? 16 : 1
    if (e.ctrlKey || e.metaKey) {
      this.zoomBy(Math.exp(-e.deltaY * scale * 0.0025 * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 3 : 1)), sx, sy)
    } else {
      const dx = (e.shiftKey ? e.deltaY : e.deltaX) * scale
      const dy = e.shiftKey ? 0 : e.deltaY * scale
      this.setView({ ...this.view, x: this.view.x + dx / this.view.zoom, y: this.view.y + dy / this.view.zoom })
    }
  }

  // ---------- Herramientas ----------

  private commit(els: El[]) {
    this.elements = els
    this.cb.commit(els)
  }

  private highlightTexts(stroke: StrokeEl, style: HighlightStyle): El[] | null {
    const sb = elBounds(stroke)
    let changed = false
    const els = this.elements.map((el) => {
      if (el.type !== 'text' || !rectsIntersect(elBounds(el), sb)) return el
      const box = boxOf(el)
      const cx = box.x + box.w / 2
      const cy = box.y + box.h / 2
      const local: number[] = []
      for (let i = 0; i < stroke.points.length; i += 3) {
        const [lx, ly] = rotatePoint(stroke.points[i], stroke.points[i + 1], cx, cy, -el.rotation)
        local.push(lx - box.x, ly - box.y)
      }
      const ranges = rangesUnder(el, layoutText(el), local, stroke.color, (s) => measureWith(el, s), style)
      if (!ranges) return el
      changed = true
      return { ...el, highlights: mergeHighlights(el.highlights ?? [], ranges) }
    })
    return changed ? els : null
  }

  private strokeColor(tool: PenTool): string {
    return tool === 'marcador' ? this.opts.markerColor : this.opts.color
  }

  private eraseAt(wx: number, wy: number) {
    const g = this.gesture
    if (g.kind !== 'erase') return
    const r = this.opts.eraserSize / 2 / this.view.zoom
    // Interpola para no saltarse trazos si el dedo se mueve rápido.
    const samples: [number, number][] = []
    if (g.last) {
      const d = Math.hypot(wx - g.last[0], wy - g.last[1])
      const n = Math.max(1, Math.ceil(d / (r * 0.7)))
      for (let i = 1; i <= n; i++) samples.push([g.last[0] + ((wx - g.last[0]) * i) / n, g.last[1] + ((wy - g.last[1]) * i) / n])
    } else samples.push([wx, wy])
    g.last = [wx, wy]

    let els = this.elements
    for (const [x, y] of samples) {
      const next: El[] = []
      let changed = false
      for (const el of els) {
        if (this.opts.eraserMode === 'parcial') {
          if (el.type !== 'stroke') {
            next.push(el)
            continue
          }
          const parts = eraseStroke(el, x, y, r, uid)
          if (parts) {
            changed = true
            next.push(...parts)
          } else next.push(el)
        } else if (!isLocked(el) && hitTest(el, x, y, r)) changed = true
        else next.push(el)
      }
      if (changed) {
        els = next
        g.changed = true
      }
    }
    if (els !== this.elements) {
      this.elements = els
      this.requestRender(true, true)
    } else this.requestRender(false, true)
  }

  private finishLasso(poly: number[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let i = 0; i < poly.length; i += 2) {
      minX = Math.min(minX, poly[i])
      maxX = Math.max(maxX, poly[i])
      minY = Math.min(minY, poly[i + 1])
      maxY = Math.max(maxY, poly[i + 1])
    }
    const small = Math.max(maxX - minX, maxY - minY) * this.view.zoom < 8
    if (small || poly.length < 6) return this.tapSelect(poly[0], poly[1])
    this.select(this.elements.filter((el) => !isLocked(el) && lassoSelects(el, poly)).map((el) => el.id))
  }

  /** Un toque con el lazo selecciona lo que esté debajo; doble toque en un texto lo edita. */
  private tapSelect(wx: number, wy: number) {
    const tol = 10 / this.view.zoom
    const hit = [...this.elements].reverse().find((el) => !isLocked(el) && hitTest(el, wx, wy, tol))
    if (!hit) {
      // Las páginas de PDF están fijas: se eligen con doble toque.
      const page = [...this.elements].reverse().find((el) => isLocked(el) && hitTest(el, wx, wy, tol))
      const now = performance.now()
      if (page && this.lastTap?.id === page.id && now - this.lastTap.time < 450) {
        this.lastTap = null
        return this.select([page.id])
      }
      this.lastTap = page ? { id: page.id, time: now } : null
      return this.select([])
    }
    const now = performance.now()
    if ((hit.type === 'text' || hit.type === 'deco') && this.lastTap?.id === hit.id && now - this.lastTap.time < 450) {
      this.lastTap = null
      if (hit.type === 'text') this.cb.editText(hit, false)
      else this.cb.editDeco?.(hit)
      return
    }
    this.lastTap = { id: hit.id, time: now }
    this.select([hit.id])
  }

  private shapeFrom(a: [number, number], b: [number, number], final = false): ShapeEl {
    let x = Math.min(a[0], b[0])
    let y = Math.min(a[1], b[1])
    let w = Math.abs(b[0] - a[0])
    let h = Math.abs(b[1] - a[1])
    if (final && Math.max(w, h) * this.view.zoom < 8) {
      // Un toque crea una figura de tamaño normal.
      w = h = 140 / this.view.zoom
      x = a[0] - w / 2
      y = a[1] - h / 2
    }
    return {
      type: 'shape',
      id: uid(),
      shape: this.opts.shape,
      x,
      y,
      w,
      h,
      rotation: 0,
      stroke: this.opts.color,
      fill: this.opts.shapeFill,
      strokeWidth: this.opts.shapeStrokeWidth,
    }
  }

  private lineFrom(a: [number, number], b: [number, number]): LineEl {
    return {
      type: 'line',
      id: uid(),
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      color: this.opts.color,
      width: this.opts.lineWidth,
      start: this.opts.lineStart,
      end: this.opts.lineEnd,
      dashed: this.opts.lineDashed,
    }
  }
}

function isLocked(el: El): boolean {
  return el.type === 'image' && !!el.locked
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}
