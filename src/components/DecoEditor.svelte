<script lang="ts" module>
  import type { DecoCorner } from '../lib/types'

  export const DECO_PAPERS = ['#fff7c2', '#fde3ea', '#e6d6ff', '#d8f5e6', '#dcefff', '#fffaf6', '#ffd9bf']
  export const DECO_ACCENTS = ['#e889a6', '#d8455f', '#b88ee0', '#7aa7e0', '#6cc4a4', '#f2b25c', '#fffaf6']
  export const DECO_CORNERS: { id: DecoCorner; name: string }[] = [
    { id: 'mono', name: 'Moño' },
    { id: 'cinta', name: 'Cinta' },
    { id: 'chincheta', name: 'Chincheta' },
    { id: 'corazon', name: 'Corazón' },
    { id: 'encaje', name: 'Encaje' },
    { id: 'ninguna', name: 'Sin adorno' },
  ]
</script>

<script lang="ts">
  import { fontOptions } from '../lib/app.svelte'
  import { INK_COLORS } from '../lib/catalog'
  import { drawDeco } from '../lib/canvas/deco'
  import type { DecoEl, FontId } from '../lib/types'
  import ColorRow from './ColorRow.svelte'
  import Modal from './Modal.svelte'

  let { el, isNew, onsave, onclose }: { el: DecoEl; isNew: boolean; onsave: (el: DecoEl) => void; onclose: () => void } = $props()

  let draft = $state<DecoEl>({ ...(() => el)() })
  let canvas: HTMLCanvasElement

  $effect(() => {
    const d = $state.snapshot(draft) as DecoEl
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = 220
    const scale = W / Math.max(d.w, d.h) * 0.8
    canvas.width = W * dpr
    canvas.height = W * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (W * dpr) / 2, (W * dpr) / 2)
    ctx.clearRect(-1e4, -1e4, 2e4, 2e4)
    drawDeco(ctx, { ...d, x: -d.w / 2, y: -d.h / 2, rotation: 0 })
  })
</script>

<Modal title={isNew ? 'Nueva nota decorada' : 'Editar nota'} {onclose} wide>
  <div class="layout">
    <canvas bind:this={canvas} style="width:220px;height:220px" aria-label="Vista previa"></canvas>
    <label class="field grow">
      <span>Texto</span>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea class="input area" bind:value={draft.text} rows="5" autofocus placeholder="Escribe algo lindo…"></textarea>
    </label>
  </div>

  <div class="field">
    <span>Adorno</span>
    <div class="chip-row">
      {#each DECO_CORNERS as c (c.id)}
        <button class="chip" class:on={draft.corner === c.id} onclick={() => (draft.corner = c.id)}>{c.name}</button>
      {/each}
    </div>
  </div>

  <div class="field">
    <span>Color de la nota</span>
    <ColorRow value={draft.paper} colors={DECO_PAPERS} onpick={(c) => (draft.paper = c)} label="Color de la nota" />
  </div>
  <div class="field">
    <span>Color del adorno</span>
    <ColorRow value={draft.accent} colors={DECO_ACCENTS} onpick={(c) => (draft.accent = c)} label="Color del adorno" />
  </div>
  <div class="field">
    <span>Letra</span>
    <div class="font-row">
      <select class="input" value={draft.font} onchange={(e) => (draft.font = e.currentTarget.value as FontId)} aria-label="Fuente">
        {#each fontOptions() as f (f.id)}
          <option value={f.id}>{f.name}</option>
        {/each}
      </select>
      <label class="size">
        <span class="sr-only">Tamaño</span>
        <input type="range" min="12" max="72" step="2" bind:value={draft.size} />
      </label>
    </div>
    <ColorRow value={draft.ink} colors={INK_COLORS.slice(0, 7)} onpick={(c) => (draft.ink = c)} label="Color de la letra" />
  </div>

  {#snippet footer()}
    <button class="btn" onclick={onclose}>Cancelar</button>
    <button class="btn primary" onclick={() => onsave($state.snapshot(draft) as DecoEl)}>{isNew ? 'Pegar nota' : 'Guardar'}</button>
  {/snippet}
</Modal>

<style>
  .layout {
    display: flex;
    gap: 16px;
    align-items: stretch;
  }

  canvas {
    flex: none;
    border-radius: 18px;
    background: var(--surface-2);
  }

  .grow {
    flex: 1;
  }

  .area {
    min-height: 160px;
    padding: 12px 14px;
    resize: vertical;
    line-height: 1.4;
  }

  .font-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .font-row select {
    flex: 1;
  }

  input[type='range'] {
    width: 140px;
    accent-color: var(--accent);
  }

  @media (max-width: 560px) {
    .layout {
      flex-direction: column;
      align-items: center;
    }

    .grow {
      width: 100%;
    }
  }
</style>
