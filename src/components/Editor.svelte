<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import { app, go, toast } from '../lib/app.svelte'
  import { FONTS, INK_COLORS } from '../lib/catalog'
  import { Engine, type Tool, type ToolOptions } from '../lib/canvas/engine'
  import { boxOf, contentBounds, translateEl } from '../lib/canvas/geom'
  import { prepareImage, rememberBitmap } from '../lib/canvas/images'
  import { LINE_HEIGHT, adjustHighlights, fontString, naturalWidth } from '../lib/canvas/text'
  import { detectStyle, textFromStrokes } from '../lib/handwriting'
  import { recognize, recognitionReady } from '../lib/recognize'
  import { db, getNote, loadContent, putBlob, saveContent, updateNote } from '../lib/db'
  import { exportPdf, exportPng, makeThumbnail, saveFile } from '../lib/export'
  import type { Background, El, ImageEl, Note, Rect, StrokeEl, TextEl } from '../lib/types'
  import { blobToStored, debounce, softFill, uid } from '../lib/util'
  import ActionSheet, { type Action } from './ActionSheet.svelte'
  import ColorRow from './ColorRow.svelte'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'
  import PaperPicker from './PaperPicker.svelte'
  import Toolbar from './Toolbar.svelte'

  let { id }: { id: string } = $props()

  const OPTS_KEY = 'trazo:herramientas'
  const DEFAULT_OPTS: ToolOptions = {
    tool: 'pluma',
    color: '#2b2328',
    markerColor: '#ffd1dc',
    sizes: { pluma: 4, lapiz: 3, pincel: 12, marcador: 22 },
    eraserSize: 28,
    eraserMode: 'trazo',
    shape: 'corazon',
    shapeFill: null,
    shapeStrokeWidth: 3,
    lineWidth: 3,
    lineStart: 'nada',
    lineEnd: 'nada',
    lineDashed: false,
    font: 'nunito',
    textSize: 28,
  }

  function loadOpts(): ToolOptions {
    try {
      const saved = JSON.parse(localStorage.getItem(OPTS_KEY) ?? 'null')
      if (saved) return { ...DEFAULT_OPTS, ...saved, sizes: { ...DEFAULT_OPTS.sizes, ...saved.sizes } }
    } catch {
      /* sin almacenamiento: valores por defecto */
    }
    return { ...DEFAULT_OPTS }
  }

  let note = $state<Note | null>(null)
  let missing = $state(false)
  let opts = $state<ToolOptions>(loadOpts())
  let container = $state<HTMLDivElement>(null!)
  let engine: Engine | null = null

  // Historial: arreglos inmutables de elementos.
  let current: El[] = []
  let past = $state.raw<El[][]>([])
  let future = $state.raw<El[][]>([])

  let selection = $state<string[]>([])
  let selRect = $state<Rect | null>(null)
  let zoom = $state(1)
  let title = $state('')
  let editing = $state<{ el: TextEl; isNew: boolean } | null>(null)
  let textarea = $state<HTMLTextAreaElement | null>(null)
  let textBox = $state({ left: 0, top: 0, width: 0, rotation: 0, zoom: 1 })
  let showPaper = $state(false)
  let paperDraft = $state<Background | null>(null)
  let showExport = $state(false)
  let showSelColor = $state(false)
  let fileInput: HTMLInputElement
  let clipboard: El[] = []
  let busy = $state(false)

  let converting = $state(false)
  let magicIds: string[] = []
  let magicTimer: ReturnType<typeof setTimeout> | undefined
  /** Último texto creado con el Lápiz mágico, para seguir el mismo renglón. */
  let lastMagic: { id: string; time: number } | null = null

  const selectedEls = $derived(selection.length ? current.filter((e) => selection.includes(e.id)) : [])
  const selStrokes = $derived(selectedEls.filter((e) => e.type === 'stroke') as StrokeEl[])
  const selHighlighted = $derived(selectedEls.some((e) => e.type === 'text' && e.highlights?.length))
  const singleText = $derived(selectedEls.length === 1 && selectedEls[0].type === 'text' ? (selectedEls[0] as TextEl) : null)

  // ---------- Guardado ----------

  const save = debounce(() => {
    if (note) void saveContent(note.id, current).catch((e) => toast('No se pudo guardar: ' + e.message))
  }, 500)

  const saveThumb = debounce(async () => {
    if (!note) return
    try {
      const blob = await makeThumbnail(current, note.background)
      await db.notes.update(note.id, { thumb: blob ? await blobToStored(blob) : null })
    } catch {
      /* la miniatura es opcional */
    }
  }, 2500)

  const saveView = debounce((v: { x: number; y: number; zoom: number }) => {
    if (note) void db.notes.update(note.id, { view: v })
  }, 800)

  function persistNow() {
    save.flush()
    saveThumb.flush()
    saveView.flush()
  }

  $effect(() => {
    try {
      localStorage.setItem(OPTS_KEY, JSON.stringify(opts))
    } catch {
      /* sin almacenamiento */
    }
    engine?.setOptions($state.snapshot(opts) as ToolOptions)
  })

  $effect(() => {
    if (engine) engine.soloLapiz = app.settings.soloLapiz
  })

  // ---------- Historial ----------

  function commit(els: El[]) {
    past = [...past.slice(-99), current]
    future = []
    current = els
    engine?.setElements(els)
    save()
    saveThumb()
    updateSelRect()
  }

  function undo() {
    if (!past.length) return
    future = [current, ...future]
    current = past[past.length - 1]
    past = past.slice(0, -1)
    engine?.setElements(current)
    save()
    saveThumb()
    updateSelRect()
  }

  function redo() {
    if (!future.length) return
    past = [...past, current]
    current = future[0]
    future = future.slice(1)
    engine?.setElements(current)
    save()
    saveThumb()
    updateSelRect()
  }

  function updateSelRect() {
    selRect = engine?.selectionScreenRect() ?? null
  }

  // ---------- Carga ----------

  onMount(async () => {
    const n = await getNote(id)
    if (!n || n.deletedAt) {
      missing = true
      return
    }
    note = n
    title = n.title
    current = await loadContent(id)
    await tick()
    engine = new Engine(container, n.background, $state.snapshot(opts) as ToolOptions, {
      commit: (els) => commit(els),
      pointerDown: () => {
        if (editing) finishText()
        // Sigue escribiendo: la conversión espera a que termine.
        if (magicIds.length) clearTimeout(magicTimer)
      },
      selection: (ids) => {
        selection = ids
        showSelColor = false
        updateSelRect()
      },
      view: (v) => {
        zoom = v.zoom
        updateSelRect()
        if (editing) positionTextBox()
        saveView(v)
      },
      editText: (el, isNew) => startText(el, isNew),
      magicStroke: (el) => {
        magicIds.push(el.id)
        clearTimeout(magicTimer)
        // Una pausa corta = terminó de escribir.
        magicTimer = setTimeout(() => {
          const ids = magicIds
          magicIds = []
          void convertStrokes(ids, true)
        }, 1200)
      },
    })
    engine.soloLapiz = app.settings.soloLapiz
    engine.setElements(current)
    if (n.view) engine.setView(n.view, false)
    else if (current.length) engine.fitContent(1)
    zoom = engine.view.zoom
  })

  function onVisibility() {
    if (document.visibilityState === 'hidden') persistNow()
  }

  onDestroy(() => {
    clearTimeout(magicTimer)
    if (editing) finishText()
    persistNow()
    engine?.destroy()
  })

  // ---------- Texto ----------

  function positionTextBox() {
    if (!editing || !engine) return
    const [left, top] = engine.toScreen(editing.el.x, editing.el.y)
    textBox = { left, top, width: editing.el.w * engine.view.zoom, rotation: editing.el.rotation, zoom: engine.view.zoom }
  }

  async function startText(el: TextEl, isNew: boolean) {
    if (editing) finishText()
    editing = { el: { ...el }, isNew }
    if (!isNew) engine?.setHidden([el.id])
    engine?.select([])
    positionTextBox()
    await tick()
    textarea?.focus()
    autoGrow()
  }

  function autoGrow() {
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  function finishText() {
    if (!editing) return
    const { el, isNew } = editing
    editing = null
    engine?.setHidden([])
    const text = el.text.replace(/\s+$/, '')
    if (!text.trim()) {
      if (!isNew) commit(current.filter((e) => e.id !== el.id))
      return
    }
    let done: TextEl = { ...el, text }
    if (isNew) done = { ...done, w: Math.min(done.w, Math.ceil(naturalWidth(done)) + 6) }
    const original = current.find((e) => e.id === el.id)
    if (original && JSON.stringify(original) === JSON.stringify(done)) return
    commit(isNew ? [...current, done] : current.map((e) => (e.id === el.id ? done : e)))
  }

  function patchEditing(changes: Partial<TextEl>) {
    if (!editing) return
    editing.el = { ...editing.el, ...changes }
    tick().then(autoGrow)
  }

  // ---------- Escritura mágica ----------

  /** Si lo nuevo se escribió justo a la derecha del último texto mágico, va en el mismo renglón. */
  function continuation(strokes: StrokeEl[]): TextEl | null {
    if (!lastMagic || Date.now() - lastMagic.time > 30_000) return null
    const prev = current.find((e) => e.id === lastMagic!.id)
    if (!prev || prev.type !== 'text' || prev.rotation) return null
    const b = contentBounds(strokes)!
    const pb = boxOf(prev)
    const gap = b.x - (pb.x + pb.w)
    const overlapY = Math.min(b.y + b.h, pb.y + pb.h) - Math.max(b.y, pb.y)
    return gap > -prev.size && gap < prev.size * 3 && overlapY > Math.min(b.h, pb.h) * 0.4 ? prev : null
  }

  async function convertStrokes(ids: string[], magic = false) {
    const idSet = new Set(ids)
    const strokes = current.filter((e) => idSet.has(e.id) && e.type === 'stroke') as StrokeEl[]
    if (!strokes.length) return
    if (!recognitionReady(app.settings.reconocimiento)) {
      toast('Para convertir tu letra, configura el reconocimiento en Ajustes ✨', { label: 'Configurar', run: () => (app.settingsOpen = true) })
      return
    }
    converting = true
    try {
      const text = await recognize(strokes, $state.snapshot(app.settings.reconocimiento))
      if (!text) {
        toast('No logré leer eso. Tus trazos se quedan como están ♡')
        return
      }
      // Solo se quitan los trazos que siguen existiendo (pudieron borrarse mientras tanto).
      const still = new Set(current.filter((e) => idSet.has(e.id)).map((e) => e.id))
      if (!still.size) return
      const rest = current.filter((e) => !still.has(e.id))
      const prev = magic ? continuation(strokes) : null
      if (prev) {
        const joined = { ...prev, text: prev.text + ' ' + text }
        const grown = { ...joined, w: Math.ceil(naturalWidth(joined)) + 6 }
        commit(rest.map((e) => (e.id === prev.id ? grown : e)))
        lastMagic = { id: prev.id, time: Date.now() }
      } else {
        const style = detectStyle(strokes.length, text)
        const el = textFromStrokes(strokes, text, app.settings.fuentesEstilo[style])
        commit([...rest, el])
        if (magic) lastMagic = { id: el.id, time: Date.now() }
      }
      engine?.select([])
    } catch (err) {
      toast((err as Error).message)
    } finally {
      converting = false
    }
  }

  function clearHighlights() {
    patchSelection((el) => (el.type === 'text' && el.highlights?.length ? { ...el, highlights: [] } : el))
  }

  // ---------- Selección ----------

  function patchSelection(fn: (el: El) => El) {
    const ids = new Set(selection)
    commit(current.map((e) => (ids.has(e.id) ? fn(e) : e)))
  }

  function recolor(c: string) {
    patchSelection((el) => {
      switch (el.type) {
        case 'stroke':
          return { ...el, color: c }
        case 'line':
        case 'text':
          return { ...el, color: c }
        case 'shape':
          return { ...el, stroke: c, fill: el.fill ? softFill(c) : null }
        default:
          return el
      }
    })
  }

  function deleteSelection() {
    const ids = new Set(selection)
    if (!ids.size) return
    commit(current.filter((e) => !ids.has(e.id)))
    engine?.select([])
  }

  function duplicateSelection(els = selectedEls, offset = 24) {
    if (!els.length) return
    const copies = els.map((e) => ({ ...translateEl(structuredClone($state.snapshot(e) as El), offset, offset), id: uid() }))
    commit([...current, ...copies])
    opts.tool = 'lazo'
    engine?.select(copies.map((c) => c.id))
  }

  function reorder(toFront: boolean) {
    const ids = new Set(selection)
    const sel = current.filter((e) => ids.has(e.id))
    const rest = current.filter((e) => !ids.has(e.id))
    commit(toFront ? [...rest, ...sel] : [...sel, ...rest])
  }

  // ---------- Imágenes ----------

  async function insertImages(files: Iterable<File>) {
    if (!engine || !note) return
    const added: ImageEl[] = []
    busy = true
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const { blob, bitmap } = await prepareImage(file)
        const blobId = await putBlob(blob)
        rememberBitmap(blobId, bitmap)
        const [vw, vh] = engine.viewSize()
        const scale = Math.min(1, (vw * 0.6) / bitmap.width, (vh * 0.6) / bitmap.height)
        const w = bitmap.width * scale
        const h = bitmap.height * scale
        const [cx, cy] = engine.viewCenter()
        const off = added.length * 30
        added.push({ type: 'image', id: uid(), x: cx - w / 2 + off, y: cy - h / 2 + off, w, h, rotation: 0, blobId })
      }
    } catch (err) {
      toast('No se pudo agregar la imagen: ' + (err as Error).message)
    } finally {
      busy = false
    }
    if (!added.length) return
    commit([...current, ...added])
    opts.tool = 'lazo'
    engine.select(added.map((a) => a.id))
  }

  function onPaste(e: ClipboardEvent) {
    if (isTyping(e.target) || route() !== 'nota') return
    const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
    if (files.length) {
      e.preventDefault()
      void insertImages(files)
    } else if (clipboard.length) {
      e.preventDefault()
      duplicateSelection(clipboard, 32)
    }
  }

  const route = () => app.route.name

  // ---------- Teclado ----------

  const KEYS: Record<string, Tool> = { w: 'magica', v: 'lazo', h: 'mano', p: 'pluma', l: 'lapiz', b: 'pincel', m: 'marcador', e: 'borrador', f: 'figura', r: 'linea', t: 'texto' }

  function isTyping(t: EventTarget | null) {
    const el = t as HTMLElement | null
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
  }

  function onKey(e: KeyboardEvent) {
    if (editing) {
      if (e.key === 'Escape') finishText()
      return
    }
    if (isTyping(e.target) || showPaper || showExport || app.settingsOpen) return
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if (mod && k === 'y') {
      e.preventDefault()
      redo()
    } else if (mod && k === 'a') {
      e.preventDefault()
      opts.tool = 'lazo'
      engine?.select(current.map((el) => el.id))
    } else if (mod && k === 'd') {
      e.preventDefault()
      duplicateSelection()
    } else if (mod && k === 'c') {
      if (selectedEls.length) clipboard = $state.snapshot(selectedEls) as El[]
    } else if (mod && k === 'x') {
      if (selectedEls.length) {
        clipboard = $state.snapshot(selectedEls) as El[]
        deleteSelection()
      }
    } else if (mod && (k === '=' || k === '+')) {
      e.preventDefault()
      engine?.zoomBy(1.25)
    } else if (mod && k === '-') {
      e.preventDefault()
      engine?.zoomBy(0.8)
    } else if (mod && k === '0') {
      e.preventDefault()
      engine?.fitContent()
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault()
      deleteSelection()
    } else if (e.key === 'Escape') {
      engine?.select([])
    } else if (!mod && !e.altKey && KEYS[k]) {
      opts.tool = KEYS[k]
    }
  }

  // ---------- Exportar ----------

  async function doExport(kind: 'png' | 'pdf' | 'sel') {
    if (!note) return
    busy = true
    try {
      const name = title || 'nota'
      if (kind === 'pdf') await saveFile(await exportPdf([{ els: current, bg: note.background }], app.settings.hojaPdf), name + '.pdf')
      else await saveFile(await exportPng(current, note.background, kind === 'sel' ? new Set(selection) : undefined), name + '.png')
    } catch (err) {
      toast('No se pudo exportar: ' + (err as Error).message)
    } finally {
      busy = false
    }
  }

  const exportActions = $derived<Action[]>([
    { label: 'Nota como imagen (PNG)', icon: 'imagen', run: () => doExport('png') },
    { label: 'Nota como PDF', icon: 'papel', run: () => doExport('pdf') },
    { label: 'Solo lo seleccionado (PNG)', icon: 'lazo', disabled: !selection.length, run: () => doExport('sel') },
  ])

  async function saveTitle() {
    if (!note) return
    const t = title.trim() || 'Nota sin título'
    title = t
    if (t !== note.title) {
      note.title = t
      await updateNote(note.id, { title: t })
    }
  }

  async function applyPaper() {
    if (!note || !paperDraft) return
    note.background = { ...paperDraft }
    engine?.setBackground(note.background)
    await updateNote(note.id, { background: $state.snapshot(note.background) as Background })
    saveThumb()
    showPaper = false
  }

  function goBack() {
    if (editing) finishText()
    persistNow()
    if (note) go({ name: 'cuaderno', id: note.notebookId })
    else go({ name: 'estante' })
  }

  /** Barra de acciones: arriba de la selección, o abajo si no cabe. */
  const selBarStyle = $derived.by(() => {
    if (!selRect || !container) return ''
    const cw = container.clientWidth
    const top = selRect.y - 64 - 40 > 8 ? selRect.y - 64 - 40 : selRect.y + selRect.h + 24
    const cx = Math.min(Math.max(selRect.x + selRect.w / 2, 170), cw - 170)
    return `left:${cx}px;top:${Math.min(top, container.clientHeight - 190)}px`
  })
</script>

<svelte:window onkeydown={onKey} onpaste={onPaste} />
<svelte:document onvisibilitychange={onVisibility} />

{#if missing}
  <div class="missing deco-bg">
    <p class="muted">Esta nota ya no existe.</p>
    <button class="btn primary" onclick={() => go({ name: 'estante' }, true)}>Ir al estante</button>
  </div>
{:else}
  <div class="editor">
    <header class="topbar">
      <button class="icon-btn" onclick={goBack} aria-label="Volver al cuaderno"><Icon name="atras" /></button>
      <input
        class="title"
        bind:value={title}
        onblur={saveTitle}
        onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        aria-label="Título de la nota"
        maxlength="80"
      />
      <div class="group">
        <button class="icon-btn" onclick={undo} disabled={!past.length} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><Icon name="deshacer" /></button>
        <button class="icon-btn" onclick={redo} disabled={!future.length} aria-label="Rehacer" title="Rehacer (Ctrl+Y)"><Icon name="rehacer" /></button>
      </div>
      <div class="group zoom">
        <button class="icon-btn" onclick={() => engine?.zoomBy(0.8)} aria-label="Alejar"><Icon name="menos" /></button>
        <button class="zoom-val" onclick={() => engine?.zoomTo(1)} title="Volver a 100%">{Math.round(zoom * 100)}%</button>
        <button class="icon-btn" onclick={() => engine?.zoomBy(1.25)} aria-label="Acercar"><Icon name="mas" /></button>
        <button class="icon-btn" onclick={() => engine?.fitContent()} aria-label="Ver todo" title="Ver todo (Ctrl+0)"><Icon name="ajustar" /></button>
      </div>
      <div class="group">
        <button
          class="icon-btn"
          onclick={() => {
            paperDraft = note ? { ...note.background } : null
            showPaper = true
          }}
          aria-label="Cambiar papel"
          title="Cambiar papel"><Icon name="papel" /></button
        >
        <button class="icon-btn" onclick={() => (showExport = true)} disabled={busy} aria-label="Exportar" title="Exportar"><Icon name="descargar" /></button>
      </div>
    </header>

    <div class="stage" bind:this={container}>
      {#if editing}
        {@const el = editing.el}
        <div class="text-format" role="toolbar" aria-label="Formato de texto" tabindex="-1" onpointerdown={(e) => {
          if (!(e.target instanceof HTMLSelectElement)) e.preventDefault()
        }}>
          <select
            aria-label="Fuente"
            value={el.font}
            style="font-family:'{FONTS.find((f) => f.id === el.font)?.family}'"
            onchange={(e) => {
              patchEditing({ font: e.currentTarget.value as TextEl['font'] })
              opts.font = e.currentTarget.value as TextEl['font']
              textarea?.focus()
            }}
          >
            {#each FONTS as f (f.id)}
              <option value={f.id}>{f.name}</option>
            {/each}
          </select>
          <button class="icon-btn" onclick={() => patchEditing({ size: Math.max(8, el.size - 4) })} aria-label="Letra más chica"><Icon name="menos" /></button>
          <span class="fsize">{Math.round(el.size)}</span>
          <button class="icon-btn" onclick={() => patchEditing({ size: el.size + 4 })} aria-label="Letra más grande"><Icon name="mas" /></button>
          <button class="icon-btn fmt" class:active={el.bold} onclick={() => patchEditing({ bold: !el.bold })} aria-label="Negrita"><b>B</b></button>
          <button class="icon-btn fmt" class:active={el.italic} onclick={() => patchEditing({ italic: !el.italic })} aria-label="Cursiva"><i>I</i></button>
          <button class="icon-btn fmt" onclick={() => patchEditing({ align: el.align === 'left' ? 'center' : el.align === 'center' ? 'right' : 'left' })} aria-label="Alinear">
            {el.align === 'left' ? '⇤' : el.align === 'center' ? '↔' : '⇥'}
          </button>
          <ColorRow value={el.color} colors={INK_COLORS.slice(0, 7)} onpick={(c) => patchEditing({ color: c })} />
          <button class="btn primary done" onclick={finishText}>Listo</button>
        </div>

        <textarea
          bind:this={textarea}
          class="text-edit"
          value={el.text}
          oninput={(e) => {
            if (editing) {
              const old = editing.el
              const text = e.currentTarget.value
              editing.el = { ...old, text, highlights: adjustHighlights(old.text, text, old.highlights ?? []) }
            }
            autoGrow()
          }}
          onblur={() => setTimeout(() => document.activeElement?.closest('.text-format') || finishText(), 0)}
          spellcheck="true"
          style="left:{textBox.left}px;top:{textBox.top}px;width:{textBox.width}px;font:{fontString(el, el.size * textBox.zoom)};line-height:{LINE_HEIGHT};color:{el.color};text-align:{el.align};transform:rotate({textBox.rotation}rad)"
          aria-label="Texto"
        ></textarea>
      {/if}

      {#if selRect && selection.length && !editing}
        <div class="sel-bar" style={selBarStyle} role="toolbar" aria-label="Acciones de la selección">
          {#if showSelColor}
            <ColorRow value="" colors={INK_COLORS} onpick={(c) => recolor(c)} />
            <button class="icon-btn" onclick={() => (showSelColor = false)} aria-label="Cerrar colores"><Icon name="check" /></button>
          {:else}
            {#if singleText}
              <button class="icon-btn" onclick={() => startText(singleText!, false)} aria-label="Editar texto" title="Editar texto"><Icon name="editar" /></button>
            {/if}
            {#if selStrokes.length}
              <button class="icon-btn magic" onclick={() => convertStrokes(selStrokes.map((s) => s.id))} disabled={converting} aria-label="Convertir a texto" title="Convertir a texto"><Icon name="magica" /></button>
            {/if}
            {#if selHighlighted}
              <button class="icon-btn" onclick={clearHighlights} aria-label="Quitar resaltado" title="Quitar resaltado"><Icon name="sinresaltado" /></button>
            {/if}
            <button class="icon-btn" onclick={() => (showSelColor = true)} aria-label="Cambiar color" title="Cambiar color"><Icon name="paleta" /></button>
            <button class="icon-btn" onclick={() => duplicateSelection()} aria-label="Duplicar" title="Duplicar"><Icon name="copiar" /></button>
            <button class="icon-btn" onclick={() => reorder(true)} aria-label="Traer al frente" title="Traer al frente"><Icon name="frente" /></button>
            <button class="icon-btn" onclick={() => reorder(false)} aria-label="Mandar atrás" title="Mandar atrás"><Icon name="fondo" /></button>
            <button class="icon-btn danger" onclick={deleteSelection} aria-label="Borrar" title="Borrar"><Icon name="basura" /></button>
          {/if}
        </div>
      {/if}

      <div class="toolbar-wrap">
        <Toolbar bind:opts onimage={() => fileInput.click()} />
      </div>

      {#if busy}
        <div class="busy" role="status">Un momentito… ✨</div>
      {:else if converting}
        <div class="busy sparkle" role="status">Leyendo tu letra… ✨</div>
      {/if}
    </div>
  </div>
{/if}

<input
  bind:this={fileInput}
  type="file"
  accept="image/*"
  multiple
  hidden
  onchange={(e) => {
    const files = [...(e.currentTarget.files ?? [])]
    e.currentTarget.value = ''
    void insertImages(files)
  }}
/>

{#if showPaper && paperDraft}
  <Modal title="Papel de esta nota" onclose={() => (showPaper = false)}>
    <PaperPicker bind:value={paperDraft} />
    {#snippet footer()}
      <button class="btn" onclick={() => (showPaper = false)}>Cancelar</button>
      <button class="btn primary" onclick={applyPaper}>Usar este papel</button>
    {/snippet}
  </Modal>
{/if}

{#if showExport}
  <ActionSheet title="Exportar" actions={exportActions} onclose={() => (showExport = false)} />
{/if}

<style>
  .missing {
    height: 100%;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 12px;
  }

  .editor {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: calc(6px + var(--safe-top)) 10px 6px;
    background: var(--surface);
    border-bottom: 1.5px solid var(--line);
    z-index: 5;
  }

  .title {
    flex: 1;
    min-width: 60px;
    min-height: 42px;
    border: 1.5px solid transparent;
    border-radius: 12px;
    background: none;
    padding: 0 10px;
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: 600;
    outline: none;
    text-overflow: ellipsis;
  }

  .title:hover,
  .title:focus {
    border-color: var(--line-strong);
    background: var(--bg);
  }

  .group {
    display: flex;
    align-items: center;
    gap: 0;
    padding-left: 6px;
    border-left: 1.5px solid var(--line);
  }

  .zoom-val {
    min-width: 54px;
    height: 36px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 800;
    color: var(--text-soft);
    border-radius: 10px;
  }

  .zoom-val:hover {
    background: var(--surface-2);
  }

  @media (max-width: 760px) {
    .zoom .icon-btn:not(:last-child),
    .zoom-val {
      display: none;
    }
  }

  .stage {
    position: relative;
    flex: 1;
    overflow: hidden;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .toolbar-wrap {
    position: absolute;
    left: 50%;
    bottom: calc(14px + var(--safe-bottom));
    transform: translateX(-50%);
    width: calc(100% - 24px);
    display: flex;
    justify-content: center;
    z-index: 4;
    pointer-events: none;
  }

  .sel-bar,
  .text-format {
    position: absolute;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 5px;
    border-radius: 18px;
    background: var(--surface);
    border: 1.5px solid var(--line);
    box-shadow: var(--shadow-lg);
  }

  .sel-bar {
    transform: translateX(-50%);
    animation: pop 0.16s ease;
    max-width: calc(100% - 16px);
    overflow-x: auto;
  }

  .danger {
    color: var(--danger);
  }

  .magic {
    color: var(--accent-strong);
  }

  .sparkle {
    animation: shimmer 1.2s ease-in-out infinite alternate;
  }

  @keyframes shimmer {
    from {
      opacity: 0.75;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1.02);
    }
  }

  .text-format {
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100% - 16px);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .text-format select {
    min-height: 40px;
    border-radius: 12px;
    border: 1.5px solid var(--line-strong);
    background: var(--surface);
    padding: 0 8px;
    font-size: 16px;
  }

  .fsize {
    min-width: 28px;
    text-align: center;
    font-weight: 800;
    font-size: 14px;
    color: var(--text-soft);
  }

  .fmt {
    font-family: Georgia, serif;
    font-size: 18px;
  }

  .done {
    min-height: 38px;
    margin-left: 4px;
    flex: none;
  }

  .text-edit {
    position: absolute;
    z-index: 3;
    margin: 0;
    padding: 0;
    border: none;
    outline: 2px dashed color-mix(in srgb, var(--accent) 70%, transparent);
    outline-offset: 6px;
    border-radius: 2px;
    background: transparent;
    resize: none;
    overflow: hidden;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    transform-origin: center center;
    -webkit-user-select: text;
    user-select: text;
  }

  .busy {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 7;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 800;
    box-shadow: var(--shadow);
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateX(-50%) scale(0.92);
    }
  }
</style>
