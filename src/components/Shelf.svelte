<script lang="ts">
  import { app, go, toast } from '../lib/app.svelte'
  import {
    createNotebook,
    duplicateNotebook,
    listNotebooks,
    moveNotebook,
    restoreNotebook,
    searchNotes,
    trashNotebook,
    updateNotebook,
  } from '../lib/db'
  import type { Note, Notebook } from '../lib/types'
  import { formatDate } from '../lib/util'
  import ActionSheet, { type Action } from './ActionSheet.svelte'
  import Bow from './Bow.svelte'
  import CoverArt from './CoverArt.svelte'
  import Icon from './Icon.svelte'
  import NotebookForm from './NotebookForm.svelte'

  let { onsettings, onbackup }: { onsettings: () => void; onbackup: () => void } = $props()

  let notebooks = $state<Notebook[]>([])
  let loaded = $state(false)
  let creating = $state(false)
  let editing = $state<Notebook | null>(null)
  let menuFor = $state<Notebook | null>(null)
  let query = $state('')
  let results = $state<Note[] | null>(null)

  $effect(() => {
    const q = query
    if (!q.trim()) {
      results = null
      return
    }
    const t = setTimeout(async () => (results = await searchNotes(q)), 150)
    return () => clearTimeout(t)
  })

  const nameOf = (id: string) => notebooks.find((n) => n.id === id)?.name ?? ''

  async function refresh() {
    notebooks = await listNotebooks()
    loaded = true
  }
  refresh()

  const needsBackup = $derived.by(() => {
    if (!loaded || !notebooks.length || !app.settings.recordatorioDias) return false
    const last = app.settings.ultimoRespaldo
    const oldest = Math.min(...notebooks.map((n) => n.createdAt))
    const since = last ?? oldest
    return Date.now() - since > app.settings.recordatorioDias * 86_400_000
  })

  function actionsFor(nb: Notebook): Action[] {
    const i = notebooks.findIndex((n) => n.id === nb.id)
    return [
      { label: 'Abrir', icon: 'papel', run: () => go({ name: 'cuaderno', id: nb.id }) },
      { label: 'Editar nombre y portada', icon: 'editar', run: () => (editing = nb) },
      { label: 'Duplicar', icon: 'copiar', run: async () => (await duplicateNotebook(nb.id), refresh(), toast('Cuaderno duplicado ✨')) },
      { label: 'Mover a la izquierda', icon: 'izquierda', disabled: i <= 0, run: async () => (await moveNotebook(nb.id, -1), refresh()) },
      { label: 'Mover a la derecha', icon: 'derecha', disabled: i >= notebooks.length - 1, run: async () => (await moveNotebook(nb.id, 1), refresh()) },
      {
        label: 'Mandar a la papelera',
        icon: 'basura',
        danger: true,
        run: async () => {
          await trashNotebook(nb.id)
          await refresh()
          toast(`«${nb.name}» está en la papelera`, {
            label: 'Deshacer',
            run: async () => (await restoreNotebook(nb.id), refresh()),
          })
        },
      },
    ]
  }
</script>

<div class="page deco-bg">
  <header>
    <div class="brand">
      <svg viewBox="-90 -60 180 140" width="46" height="36" aria-hidden="true"><Bow size={168} color="var(--accent)" /></svg>
      <h1>Trazo</h1>
    </div>
    <div class="actions">
      <button class="icon-btn" onclick={() => go({ name: 'papelera' })} aria-label="Papelera" title="Papelera"><Icon name="basura" /></button>
      <button class="icon-btn" onclick={onsettings} aria-label="Ajustes" title="Ajustes"><Icon name="ajustes" /></button>
    </div>
  </header>

  {#if needsBackup}
    <div class="reminder">
      <span>🎀 Hace un rato que no guardas un respaldo. ¡Que no se pierdan tus cuadernos!</span>
      <button class="btn primary" onclick={onbackup}><Icon name="respaldo" size={20} /> Respaldar ahora</button>
    </div>
  {/if}

  {#if notebooks.length}
    <label class="search">
      <Icon name="buscar" size={20} />
      <span class="sr-only">Buscar en todas las notas</span>
      <input bind:value={query} placeholder="Buscar en todas tus notas…" />
      {#if query}
        <button class="icon-btn clear" onclick={() => (query = '')} aria-label="Borrar búsqueda"><Icon name="cerrar" size={18} /></button>
      {/if}
    </label>
  {/if}

  {#if results}
    <ul class="results" aria-label="Resultados">
      {#each results as n (n.id)}
        <li>
          <button onclick={() => go({ name: 'nota', id: n.id })}>
            <Icon name="papel" />
            <span class="r-text">
              <strong>{n.title}</strong>
              <small class="muted">{nameOf(n.notebookId)} · {formatDate(n.updatedAt)}</small>
            </span>
          </button>
        </li>
      {:else}
        <li class="none">No encontré nada con «{query}» ♡</li>
      {/each}
    </ul>
  {:else}
  <section class="shelf" aria-label="Cuadernos">
    <button class="new" onclick={() => (creating = true)}>
      <span class="plus"><Icon name="mas" size={30} stroke={2.2} /></span>
      <span>Nuevo cuaderno</span>
    </button>

    {#each notebooks as nb (nb.id)}
      <div class="book">
        <button class="cover-btn" onclick={() => go({ name: 'cuaderno', id: nb.id })} aria-label="Abrir {nb.name}">
          <CoverArt cover={nb.cover} title={nb.name} />
        </button>
        <div class="meta">
          <span class="name">{nb.name}</span>
          <button class="icon-btn small" onclick={() => (menuFor = nb)} aria-label="Opciones de {nb.name}"><Icon name="opciones" /></button>
        </div>
      </div>
    {/each}
  </section>
  {/if}

  {#if loaded && !notebooks.length}
    <p class="empty">Aquí vivirán tus cuadernos ♡<br />Crea el primero para empezar a escribir.</p>
  {/if}
</div>

{#if creating}
  <NotebookForm
    onclose={() => (creating = false)}
    onsave={async (d) => {
      creating = false
      const nb = await createNotebook(d.name, d.cover, d.background)
      go({ name: 'cuaderno', id: nb.id })
    }}
  />
{/if}

{#if editing}
  <NotebookForm
    notebook={editing}
    onclose={() => (editing = null)}
    onsave={async (d) => {
      await updateNotebook(editing!.id, d)
      editing = null
      refresh()
    }}
  />
{/if}

{#if menuFor}
  <ActionSheet title={menuFor.name} actions={actionsFor(menuFor)} onclose={() => (menuFor = null)} />
{/if}

<style>
  .page {
    min-height: 100%;
    padding: calc(18px + var(--safe-top)) clamp(16px, 4vw, 48px) calc(40px + var(--safe-bottom));
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto 22px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h1 {
    font-family: var(--font-script);
    font-size: 44px;
    font-weight: 700;
    color: var(--accent-strong);
  }

  .actions {
    display: flex;
    gap: 4px;
  }

  .reminder {
    max-width: 1200px;
    margin: 0 auto 22px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1.5px dashed var(--accent);
    font-weight: 700;
  }

  .search {
    max-width: 1200px;
    margin: 0 auto 22px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 6px 0 16px;
    min-height: 48px;
    border-radius: 999px;
    background: var(--surface);
    border: 1.5px solid var(--line);
    color: var(--text-soft);
    box-shadow: var(--shadow);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    outline: none;
    min-height: 44px;
    color: var(--text);
  }

  .clear {
    width: 38px;
    height: 38px;
  }

  .results {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  .results button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 60px;
    padding: 8px 16px;
    border: none;
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
    text-align: left;
    color: var(--accent);
  }

  .results button:hover {
    background: var(--surface-2);
  }

  .r-text {
    display: grid;
    color: var(--text);
  }

  .none {
    text-align: center;
    padding: 30px 0;
    color: var(--text-soft);
    font-family: var(--font-script);
    font-size: 24px;
  }

  .shelf {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: clamp(18px, 3vw, 34px);
    align-items: start;
  }

  .new {
    aspect-ratio: 3 / 4;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 10px;
    border-radius: 16px;
    border: 2.5px dashed var(--line-strong);
    background: color-mix(in srgb, var(--surface) 70%, transparent);
    color: var(--accent-strong);
    font-weight: 800;
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .new:hover {
    background: var(--surface);
    transform: translateY(-3px);
  }

  .plus {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: var(--accent-soft);
  }

  .book {
    display: grid;
    gap: 6px;
  }

  .cover-btn {
    padding: 0;
    border: none;
    background: none;
    border-radius: 16px;
    filter: drop-shadow(0 6px 14px rgba(170, 80, 110, 0.22));
    transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }

  .cover-btn:hover {
    transform: translateY(-4px) rotate(-1.2deg);
  }

  .cover-btn:active {
    transform: scale(0.97);
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding-left: 6px;
  }

  .name {
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .small {
    width: 38px;
    height: 38px;
    flex: none;
  }

  .empty {
    text-align: center;
    margin-top: 40px;
    color: var(--text-soft);
    font-family: var(--font-script);
    font-size: 26px;
    line-height: 1.4;
  }
</style>
