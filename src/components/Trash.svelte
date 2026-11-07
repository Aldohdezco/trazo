<script lang="ts">
  import { go, toast } from '../lib/app.svelte'
  import {
    db,
    deleteNoteForever,
    deleteNotebookForever,
    listNotebooks,
    listTrashedNotes,
    restoreNote,
    restoreNotebook,
  } from '../lib/db'
  import type { Note, Notebook } from '../lib/types'
  import { formatDate } from '../lib/util'
  import CoverArt from './CoverArt.svelte'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let notebooks = $state<Notebook[]>([])
  let notes = $state<(Note & { notebookName: string })[]>([])
  let confirmEmpty = $state(false)

  async function refresh() {
    notebooks = await listNotebooks(true)
    const all = await db.notebooks.toArray()
    const names = new Map(all.map((n) => [n.id, n.name]))
    const trashedNb = new Set(notebooks.map((n) => n.id))
    // Las notas de un cuaderno borrado se van con él: no se listan por separado.
    notes = (await listTrashedNotes())
      .filter((n) => !trashedNb.has(n.notebookId))
      .map((n) => ({ ...n, notebookName: names.get(n.notebookId) ?? '' }))
  }
  refresh()

  async function emptyAll() {
    for (const nb of notebooks) await deleteNotebookForever(nb.id)
    for (const n of notes) await deleteNoteForever(n.id)
    confirmEmpty = false
    toast('Papelera vacía')
    refresh()
  }
</script>

<div class="page deco-bg">
  <header>
    <button class="icon-btn" onclick={() => go({ name: 'estante' })} aria-label="Volver al estante"><Icon name="atras" /></button>
    <h1>Papelera</h1>
    {#if notebooks.length || notes.length}
      <button class="btn danger" onclick={() => (confirmEmpty = true)}><Icon name="basura" size={20} /> Vaciar</button>
    {/if}
  </header>

  {#if !notebooks.length && !notes.length}
    <p class="empty">La papelera está vacía ♡</p>
  {/if}

  <ul>
    {#each notebooks as nb (nb.id)}
      <li>
        <div class="mini"><CoverArt cover={nb.cover} /></div>
        <div class="info">
          <strong>{nb.name}</strong>
          <small class="muted">Cuaderno · borrado {formatDate(nb.deletedAt!)}</small>
        </div>
        <button class="btn" onclick={async () => (await restoreNotebook(nb.id), refresh(), toast('Cuaderno restaurado ♡'))}><Icon name="restaurar" size={20} /> Restaurar</button>
        <button class="icon-btn danger" aria-label="Borrar para siempre" title="Borrar para siempre" onclick={async () => (await deleteNotebookForever(nb.id), refresh())}><Icon name="cerrar" /></button>
      </li>
    {/each}
    {#each notes as n (n.id)}
      <li>
        <div class="mini note"><Icon name="papel" /></div>
        <div class="info">
          <strong>{n.title}</strong>
          <small class="muted">Nota de «{n.notebookName}» · borrada {formatDate(n.deletedAt!)}</small>
        </div>
        <button class="btn" onclick={async () => (await restoreNote(n.id), refresh(), toast('Nota restaurada ♡'))}><Icon name="restaurar" size={20} /> Restaurar</button>
        <button class="icon-btn danger" aria-label="Borrar para siempre" title="Borrar para siempre" onclick={async () => (await deleteNoteForever(n.id), refresh())}><Icon name="cerrar" /></button>
      </li>
    {/each}
  </ul>
</div>

{#if confirmEmpty}
  <Modal title="¿Vaciar la papelera?" onclose={() => (confirmEmpty = false)}>
    <p>Lo que está en la papelera se borrará para siempre. No se puede deshacer.</p>
    {#snippet footer()}
      <button class="btn" onclick={() => (confirmEmpty = false)}>Cancelar</button>
      <button class="btn danger" onclick={emptyAll}>Vaciar papelera</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .page {
    min-height: 100%;
    padding: calc(14px + var(--safe-top)) clamp(16px, 4vw, 48px) calc(40px + var(--safe-bottom));
  }

  header {
    max-width: 900px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    flex: 1;
    font-size: 30px;
  }

  ul {
    max-width: 900px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .mini {
    width: 40px;
    flex: none;
  }

  .mini.note {
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--accent);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: grid;
  }

  .info strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .danger {
    color: var(--danger);
  }

  .empty {
    text-align: center;
    margin-top: 40px;
    color: var(--text-soft);
    font-family: var(--font-script);
    font-size: 26px;
  }

  @media (max-width: 560px) {
    li {
      flex-wrap: wrap;
    }
  }
</style>
