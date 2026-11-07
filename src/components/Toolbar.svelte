<script lang="ts">
  import { FONTS, INK_COLORS, MARKER_COLORS, PEN_TOOLS, SHAPES } from '../lib/catalog'
  import type { Tool, ToolOptions } from '../lib/canvas/engine'
  import type { LineCap, PenTool } from '../lib/types'
  import { softFill } from '../lib/util'
  import ColorRow from './ColorRow.svelte'
  import Icon from './Icon.svelte'

  let { opts = $bindable(), onimage }: { opts: ToolOptions; onimage: () => void } = $props()

  const TOOLS: { id: Tool; label: string; key: string }[] = [
    { id: 'mano', label: 'Mover lienzo', key: 'H' },
    { id: 'lazo', label: 'Lazo', key: 'V' },
    { id: 'pluma', label: 'Pluma', key: 'P' },
    { id: 'lapiz', label: 'Lápiz', key: 'L' },
    { id: 'pincel', label: 'Pincel', key: 'B' },
    { id: 'marcador', label: 'Marcador', key: 'M' },
    { id: 'borrador', label: 'Borrador', key: 'E' },
    { id: 'figura', label: 'Figuras', key: 'F' },
    { id: 'linea', label: 'Líneas', key: 'R' },
    { id: 'texto', label: 'Texto', key: 'T' },
  ]

  const SHAPE_PREVIEW: Record<string, string> = {
    rect: 'M4 6h16v12H4z',
    redondeado: 'M8 6h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4Z',
    elipse: 'M12 5a8 7 0 1 0 0 14 8 7 0 1 0 0-14Z',
    triangulo: 'M12 4 21 19H3Z',
    rombo: 'M12 3l8 9-8 9-8-9Z',
    estrella: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7Z',
    corazon: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z',
  }

  const CAPS: { id: LineCap; label: string }[] = [
    { id: 'nada', label: 'Sin punta' },
    { id: 'flecha', label: 'Flecha' },
    { id: 'punto', label: 'Punto' },
  ]

  const pen = $derived(PEN_TOOLS.find((p) => p.id === opts.tool))
  const isPen = $derived(!!pen)

  function setTool(t: Tool) {
    opts.tool = t
  }

  function setSize(tool: PenTool, v: number) {
    opts.sizes = { ...opts.sizes, [tool]: v }
  }
</script>

<div class="toolbar">
  <div class="context" aria-label="Opciones de la herramienta">
    {#if isPen && pen}
      <ColorRow
        value={opts.tool === 'marcador' ? opts.markerColor : opts.color}
        colors={opts.tool === 'marcador' ? MARKER_COLORS : INK_COLORS}
        onpick={(c) => (opts.tool === 'marcador' ? (opts.markerColor = c) : (opts.color = c))}
      />
      <span class="sep"></span>
      <label class="size">
        <span class="dot" style="width:{Math.min(26, 4 + opts.sizes[pen.id] * 0.7)}px;height:{Math.min(26, 4 + opts.sizes[pen.id] * 0.7)}px;background:{opts.tool === 'marcador' ? opts.markerColor : opts.color}"></span>
        <span class="sr-only">Grosor</span>
        <input type="range" min={pen.min} max={pen.max} step="1" value={opts.sizes[pen.id]} oninput={(e) => setSize(pen.id, +e.currentTarget.value)} />
      </label>
    {:else if opts.tool === 'borrador'}
      <div class="chip-row">
        <button class="chip" class:on={opts.eraserMode === 'trazo'} onclick={() => (opts.eraserMode = 'trazo')}>Borra trazos enteros</button>
        <button class="chip" class:on={opts.eraserMode === 'parcial'} onclick={() => (opts.eraserMode = 'parcial')}>Borra solo lo que toca</button>
      </div>
      <span class="sep"></span>
      <label class="size">
        <span class="sr-only">Tamaño del borrador</span>
        <span class="ring" style="width:{8 + opts.eraserSize / 3}px;height:{8 + opts.eraserSize / 3}px"></span>
        <input type="range" min="8" max="80" step="2" bind:value={opts.eraserSize} />
      </label>
    {:else if opts.tool === 'figura'}
      <div class="shapes" role="radiogroup" aria-label="Figura">
        {#each SHAPES as s (s.id)}
          <button class="icon-btn" class:active={opts.shape === s.id} role="radio" aria-checked={opts.shape === s.id} aria-label={s.name} title={s.name} onclick={() => (opts.shape = s.id)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d={SHAPE_PREVIEW[s.id]} /></svg>
          </button>
        {/each}
      </div>
      <span class="sep"></span>
      <ColorRow value={opts.color} colors={INK_COLORS} onpick={(c) => {
        opts.color = c
        if (opts.shapeFill) opts.shapeFill = softFill(c)
      }} />
      <span class="sep"></span>
      <div class="chip-row">
        <button class="chip" class:on={!opts.shapeFill} onclick={() => (opts.shapeFill = null)}>Sin relleno</button>
        <button class="chip" class:on={!!opts.shapeFill} onclick={() => (opts.shapeFill = softFill(opts.color))}>Rellena</button>
      </div>
      <label class="size">
        <span class="sr-only">Grosor del borde</span>
        <input type="range" min="0" max="16" step="1" bind:value={opts.shapeStrokeWidth} />
      </label>
    {:else if opts.tool === 'linea'}
      <ColorRow value={opts.color} colors={INK_COLORS} onpick={(c) => (opts.color = c)} />
      <span class="sep"></span>
      <label class="size">
        <span class="sr-only">Grosor</span>
        <input type="range" min="1" max="20" step="1" bind:value={opts.lineWidth} />
      </label>
      <span class="sep"></span>
      <div class="chip-row">
        {#each CAPS as c (c.id)}
          <button class="chip" class:on={opts.lineEnd === c.id} onclick={() => (opts.lineEnd = c.id)}>{c.label}</button>
        {/each}
        <button class="chip" class:on={opts.lineStart !== 'nada'} onclick={() => (opts.lineStart = opts.lineStart === 'nada' ? opts.lineEnd === 'nada' ? 'flecha' : opts.lineEnd : 'nada')}>En ambos lados</button>
        <button class="chip" class:on={opts.lineDashed} onclick={() => (opts.lineDashed = !opts.lineDashed)}>Punteada</button>
      </div>
    {:else if opts.tool === 'texto'}
      <select class="font" bind:value={opts.font} aria-label="Fuente" style="font-family:'{FONTS.find((f) => f.id === opts.font)?.family}'">
        {#each FONTS as f (f.id)}
          <option value={f.id} style="font-family:'{f.family}'">{f.name}</option>
        {/each}
      </select>
      <label class="size">
        <span class="muted small">{opts.textSize}</span>
        <span class="sr-only">Tamaño de letra</span>
        <input type="range" min="12" max="96" step="2" bind:value={opts.textSize} />
      </label>
      <span class="sep"></span>
      <ColorRow value={opts.color} colors={INK_COLORS} onpick={(c) => (opts.color = c)} />
    {:else if opts.tool === 'lazo'}
      <span class="hint">Rodea lo que quieras mover, girar o cambiar de tamaño ♡ Toca algo para elegirlo.</span>
    {:else}
      <span class="hint">Arrastra para moverte por la hoja. Con dos dedos también haces zoom.</span>
    {/if}
  </div>

  <div class="tools" role="toolbar" aria-label="Herramientas">
    {#each TOOLS as t (t.id)}
      <button class="icon-btn tool" class:active={opts.tool === t.id} onclick={() => setTool(t.id)} aria-label={t.label} aria-pressed={opts.tool === t.id} title="{t.label} ({t.key})">
        <Icon name={t.id} />
        {#if PEN_TOOLS.some((p) => p.id === t.id)}
          <span class="ink" style="background:{t.id === 'marcador' ? opts.markerColor : opts.color}"></span>
        {/if}
      </button>
    {/each}
    <span class="sep"></span>
    <button class="icon-btn tool" onclick={onimage} aria-label="Agregar imagen" title="Agregar imagen"><Icon name="imagen" /></button>
  </div>
</div>

<style>
  .toolbar {
    display: grid;
    justify-items: center;
    gap: 8px;
    max-width: 100%;
    pointer-events: none;
  }

  .context,
  .tools {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--line);
    box-shadow: var(--shadow);
  }

  .context {
    min-height: 50px;
    padding: 4px 12px;
    border-radius: 999px;
  }

  .tools {
    padding: 6px;
    border-radius: 24px;
  }

  .tool {
    position: relative;
    flex: none;
  }

  .ink {
    position: absolute;
    right: 7px;
    bottom: 6px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid var(--surface);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  }

  .sep {
    flex: none;
    width: 1.5px;
    height: 26px;
    background: var(--line);
    margin: 0 4px;
  }

  .size {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
  }

  .dot {
    display: block;
    border-radius: 50%;
    flex: none;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  }

  .ring {
    display: block;
    border-radius: 50%;
    border: 2px solid var(--accent);
    flex: none;
  }

  input[type='range'] {
    width: 120px;
    accent-color: var(--accent);
  }

  .shapes {
    display: flex;
    gap: 2px;
  }

  .shapes .icon-btn {
    width: 40px;
    height: 40px;
  }

  .chip-row {
    flex-wrap: nowrap;
  }

  .chip {
    flex: none;
    white-space: nowrap;
  }

  .font {
    min-height: 40px;
    border-radius: 999px;
    border: 1.5px solid var(--line-strong);
    background: var(--surface);
    padding: 0 12px;
    font-size: 17px;
  }

  .small {
    font-size: 13px;
    font-weight: 700;
    min-width: 22px;
    text-align: right;
  }

  .hint {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-soft);
    white-space: nowrap;
    padding: 0 6px;
  }
</style>
