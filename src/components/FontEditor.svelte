<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { go, refreshCustomFont, toast } from '../lib/app.svelte'
  import { db, saveFont } from '../lib/db'
  import { saveFile } from '../lib/export'
  import { CHARSET, GUIDES, PAD, customFamily, drawnCount, fontBinary, glyphOutlines, glyphSvgPath, strokeOutline } from '../lib/fontgen'
  import type { CustomFont } from '../lib/types'
  import { debounce } from '../lib/util'
  import Icon from './Icon.svelte'

  let { id }: { id: string } = $props()

  let font = $state<CustomFont | null>(null)
  let missing = $state(false)
  let current = $state<string | null>(null)
  let preview = $state('Hola, bonita ♡ ¿Qué tal tu día? 123')
  let canvas = $state<HTMLCanvasElement | null>(null)
  let live: number[] | null = null
  let size = $state(380)

  $effect(() => {
    void id
    db.fonts.get(id).then((f) => {
      if (f) font = f
      else missing = true
    })
  })

  const persist = debounce(async () => {
    if (!font) return
    const snap = $state.snapshot(font) as CustomFont
    await saveFont(snap)
    await refreshCustomFont(snap)
  }, 500)

  onDestroy(() => persist.flush())

  const strokes = $derived(current && font ? (font.glyphs[current] ?? []) : [])
  const index = $derived(current ? CHARSET.indexOf(current) : -1)

  function setStrokes(list: number[][]) {
    if (!font || !current) return
    font.glyphs = { ...font.glyphs, [current]: list }
    persist()
    draw()
  }

  async function open(ch: string) {
    current = ch
    size = Math.min(440, Math.floor(Math.min(window.innerWidth - 48, window.innerHeight - 260)))
    await tick()
    draw()
  }

  function move(step: number) {
    const i = (index + step + CHARSET.length) % CHARSET.length
    void open(CHARSET[i])
  }

  // ---------- Plantilla de dibujo ----------

  function draw() {
    if (!canvas || !current) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')!
    const s = (size * dpr) / PAD
    ctx.setTransform(s, 0, 0, s, 0, 0)
    ctx.fillStyle = '#fffaf6'
    ctx.fillRect(0, 0, PAD, PAD)

    // Letra de guía, muy clarita
    ctx.fillStyle = 'rgba(232, 137, 166, 0.13)'
    ctx.font = `600 ${GUIDES.renglon - GUIDES.alto}px Nunito, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(current, PAD / 2, GUIDES.renglon)

    // Guías
    const lines: [number, string, number[]][] = [
      [GUIDES.alto, 'alto', [14, 12]],
      [GUIDES.x, 'minúsculas', [14, 12]],
      [GUIDES.renglon, 'renglón', []],
      [GUIDES.bajada, 'bajada', [14, 12]],
    ]
    for (const [y, label, dash] of lines) {
      ctx.setLineDash(dash)
      ctx.lineWidth = label === 'renglón' ? 5 : 3
      ctx.strokeStyle = label === 'renglón' ? '#e889a6' : '#f0c3d1'
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(PAD, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#d29bb0'
      ctx.font = '600 30px Nunito, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(label, 14, y - 10)
    }

    ctx.fillStyle = '#3a2430'
    for (const poly of glyphOutlines(strokes)) fillPoly(ctx, poly)
    if (live) fillPoly(ctx, strokeOutline(live))
  }

  function fillPoly(ctx: CanvasRenderingContext2D, poly: [number, number][]) {
    if (poly.length < 3) return
    ctx.beginPath()
    ctx.moveTo(poly[0][0], poly[0][1])
    for (let i = 1; i < poly.length; i++) {
      const [x0, y0] = poly[i]
      const [x1, y1] = poly[(i + 1) % poly.length]
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    }
    ctx.closePath()
    ctx.fill()
  }

  function toPad(e: PointerEvent): [number, number] {
    const r = canvas!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * PAD, ((e.clientY - r.top) / r.height) * PAD]
  }

  function down(e: PointerEvent) {
    e.preventDefault()
    canvas!.setPointerCapture(e.pointerId)
    const [x, y] = toPad(e)
    live = [x, y, e.pointerType === 'pen' && e.pressure ? e.pressure : 0.5]
    draw()
  }

  function moveP(e: PointerEvent) {
    if (!live) return
    for (const ce of e.getCoalescedEvents?.() ?? [e]) {
      const [x, y] = toPad(ce)
      live.push(Math.round(x), Math.round(y), ce.pointerType === 'pen' && ce.pressure ? ce.pressure : 0.5)
    }
    draw()
  }

  function up() {
    if (!live) return
    const done = live
    live = null
    setStrokes([...strokes, done])
  }

  function onKey(e: KeyboardEvent) {
    if (!current) return
    if (e.key === 'Escape') current = null
    else if (e.key === 'ArrowRight') move(1)
    else if (e.key === 'ArrowLeft') move(-1)
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') setStrokes(strokes.slice(0, -1))
  }

  async function download() {
    if (!font) return
    if (!drawnCount(font)) return toast('Dibuja al menos una letra primero ✏️')
    await saveFile(new Blob([fontBinary($state.snapshot(font) as CustomFont)], { type: 'font/otf' }), (font.name || 'mi-letra') + '.otf')
  }
</script>

<svelte:window onkeydown={onKey} />

{#if missing}
  <div class="page deco-bg center">
    <p class="muted">Esta fuente ya no existe.</p>
    <button class="btn primary" onclick={() => go({ name: 'fuentes' }, true)}>Ir al taller</button>
  </div>
{:else if font}
  <div class="page deco-bg">
    <header>
      <button class="icon-btn" onclick={() => (persist.flush(), go({ name: 'fuentes' }))} aria-label="Volver al taller"><Icon name="atras" /></button>
      <input class="name" bind:value={font.name} oninput={() => persist()} aria-label="Nombre de la fuente" maxlength="40" />
      <span class="count muted">{drawnCount(font)}/{CHARSET.length}</span>
      <button class="icon-btn" onclick={download} aria-label="Descargar fuente" title="Descargar (.otf)"><Icon name="descargar" /></button>
    </header>

    <label class="preview">
      <span class="sr-only">Texto de prueba</span>
      <input bind:value={preview} style="font-family:'{customFamily(font.id)}', Nunito" />
    </label>

    <p class="muted hint">Toca una letra para dibujarla. Las que no dibujes se verán con la letra Redondita.</p>

    <div class="grid">
      {#each CHARSET as ch (ch)}
        {@const g = font.glyphs[ch]}
        <button class="cell" class:done={g?.length} onclick={() => open(ch)} aria-label="Dibujar {ch}">
          {#if g?.length}
            <svg viewBox="0 0 {PAD} {PAD}" aria-hidden="true"><path d={glyphSvgPath(g)} /></svg>
          {:else}
            <span class="ghost">{ch}</span>
          {/if}
          <small>{ch}</small>
        </button>
      {/each}
    </div>
  </div>

  {#if current}
    <div class="pad-backdrop" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && (current = null)}>
      <div class="pad" role="dialog" aria-modal="true" aria-label="Dibujar la letra {current}">
        <div class="pad-head">
          <button class="icon-btn" onclick={() => move(-1)} aria-label="Letra anterior"><Icon name="izquierda" /></button>
          <span class="big">{current}</span>
          <button class="icon-btn" onclick={() => move(1)} aria-label="Letra siguiente"><Icon name="derecha" /></button>
        </div>
        <canvas
          bind:this={canvas}
          style="width:{size}px;height:{size}px"
          onpointerdown={down}
          onpointermove={moveP}
          onpointerup={up}
          onpointercancel={up}
          aria-label="Plantilla de dibujo"
        ></canvas>
        <div class="pad-actions">
          <button class="btn" onclick={() => setStrokes(strokes.slice(0, -1))} disabled={!strokes.length}><Icon name="deshacer" size={20} /> Deshacer</button>
          <button class="btn" onclick={() => setStrokes([])} disabled={!strokes.length}><Icon name="basura" size={20} /> Borrar</button>
          <button class="btn primary" onclick={() => move(1)}>Siguiente <Icon name="derecha" size={20} /></button>
        </div>
        <button class="close" onclick={() => (current = null)}>Listo</button>
      </div>
    </div>
  {/if}
{/if}

<style>
  .page {
    min-height: 100%;
    padding: calc(14px + var(--safe-top)) clamp(16px, 4vw, 48px) calc(40px + var(--safe-bottom));
  }

  .center {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 12px;
  }

  header,
  .preview,
  .hint,
  .grid {
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name {
    flex: 1;
    min-width: 0;
    min-height: 46px;
    padding: 0 12px;
    border: 1.5px solid transparent;
    border-radius: 12px;
    background: none;
    font-family: var(--font-title);
    font-size: 26px;
    font-weight: 600;
    outline: none;
  }

  .name:hover,
  .name:focus {
    border-color: var(--line-strong);
    background: var(--surface);
  }

  .count {
    font-weight: 800;
  }

  .preview {
    display: block;
    margin-top: 14px;
  }

  .preview input {
    width: 100%;
    min-height: 70px;
    padding: 6px 18px;
    border-radius: var(--radius);
    border: 1.5px solid var(--line);
    background: var(--surface);
    font-size: 40px;
    color: var(--accent-strong);
    outline: none;
  }

  .hint {
    margin-top: 10px;
    margin-bottom: 14px;
    font-size: 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 10px;
  }

  .cell {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    padding: 8px;
    border-radius: 16px;
    border: 1.5px dashed var(--line-strong);
    background: var(--surface);
  }

  .cell.done {
    border-style: solid;
    border-color: var(--accent-soft);
  }

  .cell:hover {
    border-color: var(--accent);
  }

  .cell svg {
    width: 100%;
    height: 100%;
    fill: var(--text);
  }

  .ghost {
    font-size: 30px;
    color: var(--text-faint);
    opacity: 0.6;
  }

  .cell small {
    position: absolute;
    right: 7px;
    bottom: 3px;
    font-size: 11px;
    font-weight: 800;
    color: var(--text-faint);
  }

  .pad-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 12px;
    background: rgba(70, 30, 50, 0.35);
    backdrop-filter: blur(3px);
  }

  .pad {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 28px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .pad-head {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .big {
    min-width: 60px;
    text-align: center;
    font-family: var(--font-title);
    font-size: 34px;
    font-weight: 700;
    color: var(--accent-strong);
  }

  canvas {
    border-radius: 18px;
    touch-action: none;
    box-shadow: 0 0 0 1.5px var(--line);
    cursor: crosshair;
  }

  .pad-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .close {
    border: none;
    background: none;
    font-weight: 800;
    color: var(--text-soft);
    text-decoration: underline;
  }
</style>
