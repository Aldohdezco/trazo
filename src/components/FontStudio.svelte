<script lang="ts">
  import { forgetCustomFont, go, toast } from '../lib/app.svelte'
  import { deleteFont, listFonts, saveFont } from '../lib/db'
  import { CHARSET, customFamily, drawnCount, fontBinary } from '../lib/fontgen'
  import { saveFile } from '../lib/export'
  import type { CustomFont } from '../lib/types'
  import { uid } from '../lib/util'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let fonts = $state<CustomFont[]>([])
  let creating = $state<string | null>(null)
  let confirmDelete = $state<CustomFont | null>(null)

  async function refresh() {
    fonts = await listFonts()
  }
  refresh()

  async function create() {
    const now = Date.now()
    const font: CustomFont = { id: uid(), name: creating?.trim() || 'Mi letra', glyphs: {}, createdAt: now, updatedAt: now }
    await saveFont(font)
    creating = null
    go({ name: 'fuente', id: font.id })
  }

  async function download(f: CustomFont) {
    if (!drawnCount(f)) return toast('Dibuja al menos una letra primero ✏️')
    await saveFile(new Blob([fontBinary(f)], { type: 'font/otf' }), (f.name || 'mi-letra') + '.otf')
  }
</script>

<div class="page deco-bg">
  <header>
    <button class="icon-btn" onclick={() => go({ name: 'estante' })} aria-label="Volver al estante"><Icon name="atras" /></button>
    <h1>Taller de fuentes</h1>
    <button class="btn primary" onclick={() => (creating = '')}><Icon name="mas" size={20} /> Nueva fuente</button>
  </header>

  <p class="intro muted">Dibuja cada letra con tu propia mano y Trazo la convierte en una fuente que puedes usar en tus notas (y descargar para otras apps) ✍️</p>

  <ul class="list">
    {#each fonts as f (f.id)}
      <li>
        <button class="main" onclick={() => go({ name: 'fuente', id: f.id })}>
          <span class="sample" style="font-family:'{customFamily(f.id)}', 'Dancing Script'">{f.name || 'Mi letra'}</span>
          <small class="muted">{drawnCount(f)} de {CHARSET.length} letras dibujadas</small>
        </button>
        <button class="icon-btn" onclick={() => download(f)} aria-label="Descargar {f.name}" title="Descargar"><Icon name="descargar" /></button>
        <button class="icon-btn danger" onclick={() => (confirmDelete = f)} aria-label="Borrar {f.name}" title="Borrar"><Icon name="basura" /></button>
      </li>
    {:else}
      <li class="empty">Todavía no tienes fuentes. ¡Crea la primera! ♡</li>
    {/each}
  </ul>
</div>

{#if creating !== null}
  <Modal title="Nueva fuente" onclose={() => (creating = null)}>
    <form id="nueva-fuente" onsubmit={(e) => (e.preventDefault(), create())}>
      <label class="field">
        <span>¿Cómo se llama tu letra?</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="input" bind:value={creating} placeholder="Mi letra" maxlength="40" autofocus />
      </label>
    </form>
    {#snippet footer()}
      <button class="btn" onclick={() => (creating = null)}>Cancelar</button>
      <button class="btn primary" type="submit" form="nueva-fuente">Empezar a dibujar</button>
    {/snippet}
  </Modal>
{/if}

{#if confirmDelete}
  <Modal title="¿Borrar «{confirmDelete.name}»?" onclose={() => (confirmDelete = null)}>
    <p>Se borran todas sus letras. Las notas que la usan se verán con la letra Redondita.</p>
    {#snippet footer()}
      <button class="btn" onclick={() => (confirmDelete = null)}>Cancelar</button>
      <button
        class="btn danger"
        onclick={async () => {
          const f = confirmDelete!
          confirmDelete = null
          await deleteFont(f.id)
          forgetCustomFont(f.id)
          refresh()
        }}>Borrar</button
      >
    {/snippet}
  </Modal>
{/if}

<style>
  .page {
    min-height: 100%;
    padding: calc(14px + var(--safe-top)) clamp(16px, 4vw, 48px) calc(40px + var(--safe-bottom));
  }

  header,
  .intro,
  .list {
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    flex: 1;
    font-size: clamp(24px, 3.4vw, 32px);
  }

  .intro {
    margin-top: 10px;
    margin-bottom: 22px;
  }

  .list {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 12px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .main {
    flex: 1;
    min-width: 0;
    display: grid;
    justify-items: start;
    gap: 2px;
    padding: 6px 8px;
    border: none;
    background: none;
    text-align: left;
  }

  .sample {
    font-size: 34px;
    line-height: 1.2;
    color: var(--accent-strong);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .danger {
    color: var(--danger);
  }

  .empty {
    justify-content: center;
    padding: 30px;
    color: var(--text-soft);
    font-family: var(--font-script);
    font-size: 24px;
    box-shadow: none;
    background: none;
  }
</style>
