<script lang="ts">
  import { onDestroy } from 'svelte'
  import { deleteSticker, listStickers } from '../lib/db'
  import { BUILTIN_STICKERS, STICKER_CATEGORIES, TWEMOJI_CATEGORIES, stickerDataUrl } from '../lib/stickers'
  import type { StickerRecord } from '../lib/types'
  import { storedToBlob } from '../lib/util'
  import { db } from '../lib/db'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let { onpick, onclose }: { onpick: (s: { blobId: string; ratio: number }) => void; onclose: () => void } = $props()

  const TAB_KEY = 'trazo:stickers-pestana'
  let tab = $state(readTab())
  let mine = $state<(StickerRecord & { url: string })[]>([])
  let editing = $state(false)

  function readTab(): string {
    try {
      const t = localStorage.getItem(TAB_KEY)
      return t && (t === 'Míos' || STICKER_CATEGORIES.includes(t)) ? t : 'Míos'
    } catch {
      return 'Míos'
    }
  }

  $effect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      /* sin almacenamiento */
    }
  })

  async function loadMine() {
    mine.forEach((m) => URL.revokeObjectURL(m.url))
    const list = await listStickers()
    const out: (StickerRecord & { url: string })[] = []
    for (const s of list) {
      const rec = await db.blobs.get(s.blobId)
      if (rec) out.push({ ...s, url: URL.createObjectURL(storedToBlob(rec)) })
    }
    mine = out
    if (!out.length && tab === 'Míos') tab = STICKER_CATEGORIES[0]
  }
  loadMine()
  onDestroy(() => mine.forEach((m) => URL.revokeObjectURL(m.url)))

  const tabs = $derived(['Míos', ...STICKER_CATEGORIES])
  const builtins = $derived(BUILTIN_STICKERS.filter((s) => s.category === tab))
  const isTwemoji = $derived(TWEMOJI_CATEGORIES.includes(tab))

  let tabsEl = $state<HTMLDivElement>()
  let gridEl = $state<HTMLDivElement>()
  // Al cambiar de pestaña: la pestaña elegida a la vista y la cuadrícula arriba.
  $effect(() => {
    void tab
    tabsEl?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
    if (gridEl) gridEl.scrollTop = 0
  })

  // Flechitas: aparecen solo si hay más pestañas hacia ese lado.
  let canLeft = $state(false)
  let canRight = $state(false)
  function updateArrows() {
    if (!tabsEl) return
    canLeft = tabsEl.scrollLeft > 2
    canRight = tabsEl.scrollLeft + tabsEl.clientWidth < tabsEl.scrollWidth - 2
  }
  $effect(() => {
    if (!tabsEl) return
    updateArrows()
    const ro = new ResizeObserver(updateArrows)
    ro.observe(tabsEl)
    return () => ro.disconnect()
  })

  function scrollTabs(dir: 1 | -1) {
    tabsEl?.scrollBy({ left: dir * tabsEl.clientWidth * 0.7, behavior: 'smooth' })
  }

  /** Con el mouse: la rueda normal también mueve las pestañas de lado. */
  function onTabsWheel(e: WheelEvent) {
    if (!tabsEl || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    e.preventDefault()
    tabsEl.scrollLeft += e.deltaY
  }

  /** Cambiar a la sección de al lado (flechas del teclado o deslizar sobre los stickers). */
  function stepTab(dir: 1 | -1) {
    const i = tabs.indexOf(tab)
    const next = tabs[i + dir]
    if (next) tab = next
  }

  let swipe: { x: number; y: number } | null = null
</script>

<Modal title="Stickers" {onclose} wide>
  <div class="tabs-wrap">
    <button class="arrow left" class:show={canLeft} onclick={() => scrollTabs(-1)} aria-label="Ver secciones anteriores" tabindex={canLeft ? 0 : -1}>‹</button>
    <div
      class="tabs"
      role="tablist"
      tabindex="-1"
      bind:this={tabsEl}
      onscroll={updateArrows}
      onwheel={onTabsWheel}
      onkeydown={(e) => {
        if (e.key === 'ArrowRight') stepTab(1)
        else if (e.key === 'ArrowLeft') stepTab(-1)
      }}
    >
      {#each tabs as t (t)}
        <button class="chip" class:on={tab === t} role="tab" aria-selected={tab === t} onclick={() => (tab = t)}>{t === 'Míos' ? '♡ Míos' : t}</button>
      {/each}
    </div>
    <button class="arrow right" class:show={canRight} onclick={() => scrollTabs(1)} aria-label="Ver más secciones" tabindex={canRight ? 0 : -1}>›</button>
  </div>

  {#if tab === 'Míos'}
    {#if !mine.length}
      <p class="empty">Todavía no tienes stickers propios.<br />Rodea algo con el lazo y toca <strong>«Guardar como sticker»</strong> ✨</p>
    {:else}
      <div class="row-end">
        <button class="chip" class:on={editing} onclick={() => (editing = !editing)}>{editing ? 'Listo' : 'Borrar stickers'}</button>
      </div>
      <div class="grid scroll">
        {#each mine as s (s.id)}
          <div class="cell">
            <button class="sticker" onclick={() => !editing && onpick({ blobId: s.blobId, ratio: s.w / s.h })} aria-label="Pegar sticker">
              <img src={s.url} alt="" />
            </button>
            {#if editing}
              <button class="remove" aria-label="Borrar este sticker" onclick={async () => (await deleteSticker(s.id), loadMine())}><Icon name="cerrar" size={16} /></button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div
      class="grid scroll"
      role="tabpanel"
      tabindex="0"
      aria-label={tab}
      bind:this={gridEl}
      onpointerdown={(e) => e.pointerType !== 'mouse' && (swipe = { x: e.clientX, y: e.clientY })}
      onpointerup={(e) => {
        // Deslizar de lado sobre los stickers: sección siguiente o anterior.
        if (!swipe) return
        const dx = e.clientX - swipe.x
        const dy = e.clientY - swipe.y
        swipe = null
        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) stepTab(dx < 0 ? 1 : -1)
      }}
      onpointercancel={() => (swipe = null)}
    >
      {#each builtins as s (s.id)}
        <button class="sticker" class:tw={!!s.src} onclick={() => onpick({ blobId: 'builtin:' + s.id, ratio: s.ratio })} aria-label={s.name} title={s.name}>
          <img src={stickerDataUrl(s)} alt="" loading="lazy" decoding="async" draggable="false" />
        </button>
      {/each}
    </div>
    {#if isTwemoji}
      <p class="credit">Emojis de <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> · CC-BY 4.0, Twitter/X y colaboradores</p>
    {/if}
  {/if}
</Modal>

<style>
  .tabs-wrap {
    position: relative;
    min-width: 0;
    max-width: 100%;
  }

  .arrow {
    position: absolute;
    top: 50%;
    z-index: 2;
    width: 36px;
    height: 36px;
    margin-top: -20px;
    display: grid;
    place-items: center;
    padding: 0 0 3px;
    border: 1.5px solid var(--line);
    border-radius: 50%;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--accent-strong);
    font-size: 24px;
    font-weight: 800;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }

  .arrow.show {
    opacity: 1;
    pointer-events: auto;
  }

  .arrow.left {
    left: -4px;
  }

  .arrow.right {
    right: -4px;
  }

  .tabs {
    min-width: 0;
    max-width: 100%;
    touch-action: pan-x;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    padding: 2px 2px 4px;
    margin-bottom: 4px;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 24px), transparent);
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tabs .chip {
    flex: none;
    scroll-snap-align: center;
    white-space: nowrap;
  }

  .scroll {
    min-width: 0;
    touch-action: pan-y;
    max-height: min(56vh, 520px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px 4px 6px 2px;
    -webkit-overflow-scrolling: touch;
  }

  .grid {
    display: grid;
    /* Filas a su tamaño (no aplastadas por la altura máxima del área con scroll). */
    grid-auto-rows: max-content;
    align-content: start;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 12px;
  }

  .cell {
    position: relative;
  }

  .sticker {
    width: 100%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    padding: 10px;
    border: none;
    border-radius: 18px;
    overflow: hidden;
    background: var(--surface-2);
    transition: transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1.4), background 0.15s ease;
  }

  .sticker:hover {
    background: var(--surface-3);
    transform: scale(1.05) rotate(-2deg);
  }

  .sticker img {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: contain;
    filter: drop-shadow(0 2px 3px rgba(120, 50, 80, 0.18));
    -webkit-user-drag: none;
    user-select: none;
  }

  /* Emojis: borde blanco de sticker troquelado, como quedan al pegarlos. */
  .sticker.tw {
    padding: 16px;
  }

  .sticker.tw img {
    filter: drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff)
      drop-shadow(0 2px 3px rgba(120, 50, 80, 0.22));
  }

  .credit {
    margin: -10px 0 0;
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-soft);
    opacity: 0.8;
  }

  .credit a {
    color: inherit;
  }

  .remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: none;
    background: var(--danger);
    color: #fff;
    box-shadow: var(--shadow);
  }

  .row-end {
    display: flex;
    justify-content: flex-end;
  }

  .empty {
    text-align: center;
    color: var(--text-soft);
    margin: 20px 0;
    line-height: 1.6;
  }
</style>
