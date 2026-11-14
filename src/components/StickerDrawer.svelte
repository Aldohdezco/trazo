<script lang="ts">
  import { onDestroy } from 'svelte'
  import { deleteSticker, listStickers } from '../lib/db'
  import { BUILTIN_STICKERS, STICKER_CATEGORIES, stickerDataUrl } from '../lib/stickers'
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
      return localStorage.getItem(TAB_KEY) ?? 'Míos'
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
</script>

<Modal title="Stickers" {onclose} wide>
  <div class="tabs" role="tablist">
    {#each tabs as t (t)}
      <button class="chip" class:on={tab === t} role="tab" aria-selected={tab === t} onclick={() => (tab = t)}>{t === 'Míos' ? '♡ Míos' : t}</button>
    {/each}
  </div>

  {#if tab === 'Míos'}
    {#if !mine.length}
      <p class="empty">Todavía no tienes stickers propios.<br />Rodea algo con el lazo y toca <strong>«Guardar como sticker»</strong> ✨</p>
    {:else}
      <div class="row-end">
        <button class="chip" class:on={editing} onclick={() => (editing = !editing)}>{editing ? 'Listo' : 'Borrar stickers'}</button>
      </div>
      <div class="grid">
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
    <div class="grid">
      {#each builtins as s (s.id)}
        <button class="sticker" onclick={() => onpick({ blobId: 'builtin:' + s.id, ratio: s.ratio })} aria-label={s.name} title={s.name}>
          <img src={stickerDataUrl(s)} alt="" />
        </button>
      {/each}
    </div>
  {/if}
</Modal>

<style>
  .tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }

  .tabs .chip {
    flex: none;
  }

  .grid {
    display: grid;
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
    background: var(--surface-2);
    transition: transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1.4), background 0.15s ease;
  }

  .sticker:hover {
    background: var(--surface-3);
    transform: scale(1.05) rotate(-2deg);
  }

  .sticker img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 2px 3px rgba(120, 50, 80, 0.18));
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
