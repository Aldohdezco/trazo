<script lang="ts">
  import { onDestroy } from 'svelte'
  import { app, go, toast } from '../lib/app.svelte'
  import {
    createNote,
    duplicateNote,
    ensureCoverNote,
    getNotebook,
    listNotes,
    loadContent,
    saveContent,
    searchNotes,
    restoreNote,
    trashNote,
    updateNote,
    updateNotebook,
  } from '../lib/db'
  import { exportPdf, saveFile } from '../lib/export'
  import { pdfToPages } from '../lib/pdfImport'
  import type { Background, Note, Notebook } from '../lib/types'
  import { formatDate, storedToBlob } from '../lib/util'
  import ActionSheet, { type Action } from './ActionSheet.svelte'
  import CoverArt from './CoverArt.svelte'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'
  import NotebookForm from './NotebookForm.svelte'
  import PaperPicker from './PaperPicker.svelte'
  import PaperSwatch from './PaperSwatch.svelte'

  let { id }: { id: string } = $props()

  let notebook = $state<Notebook | null>(null)
  let notes = $state<Note[]>([])
  let thumbs = $state<Record<string, string>>({})
  let query = $state('')
  let missing = $state(false)
  let newNote = $state<{ title: string; background: Background } | null>(null)
  let renaming = $state<{ note: Note; title: string } | null>(null)
  let menuFor = $state<Note | null>(null)
  let editingNotebook = $state(false)
  let busy = $state(false)
  let pdfInput: HTMLInputElement
  let importing = $state<string | null>(null)

  /** Crea una nota nueva con las páginas del PDF, listas para escribir encima. */
  async function importPdf(file: File) {
    if (!notebook) return
    importing = 'Abriendo el PDF…'
    try {
      const note = await createNote(id, file.name.replace(/\.pdf$/i, ''), { paper: 'liso', color: '#ffffff' })
      const { pages, skipped } = await pdfToPages(file, 0, 0, (d, t) => (importing = `Leyendo el PDF… ${d} de ${t}`))
      await saveContent(note.id, pages)
      if (skipped) toast(`El PDF es muy largo: se agregaron las primeras ${pages.length} páginas.`)
      go({ name: 'nota', id: note.id })
    } catch (err) {
      toast((err as Error).message)
    } finally {
      importing = null
    }
  }

  function revokeThumbs() {
    Object.values(thumbs).forEach((u) => URL.revokeObjectURL(u))
  }

  async function refresh() {
    const nb = await getNotebook(id)
    if (!nb || nb.deletedAt) {
      missing = true
      return
    }
    notebook = nb
    notes = await listNotes(id)
    revokeThumbs()
    thumbs = Object.fromEntries(notes.filter((n) => n.thumb).map((n) => [n.id, URL.createObjectURL(storedToBlob(n.thumb!))]))
  }

  $effect(() => {
    void id
    refresh()
  })
  onDestroy(revokeThumbs)

  let matches = $state<Set<string> | null>(null)
  $effect(() => {
    const q = query
    if (!q.trim()) {
      matches = null
      return
    }
    const t = setTimeout(async () => (matches = new Set((await searchNotes(q, id)).map((n) => n.id))), 150)
    return () => clearTimeout(t)
  })
  const filtered = $derived(matches ? notes.filter((n) => matches!.has(n.id)) : notes)

  async function exportNotes(list: Note[], name: string) {
    busy = true
    try {
      const pages = await Promise.all(list.map(async (n) => ({ els: await loadContent(n.id), bg: n.background })))
      await saveFile(await exportPdf(pages, app.settings.hojaPdf), name + '.pdf')
    } catch (err) {
      toast('No se pudo exportar: ' + (err as Error).message)
    } finally {
      busy = false
    }
  }

  async function designCover() {
    const noteId = await ensureCoverNote(id)
    if (noteId) go({ name: 'nota', id: noteId })
  }

  function actionsFor(note: Note): Action[] {
    return [
      { label: 'Abrir', icon: 'papel', run: () => go({ name: 'nota', id: note.id }) },
      { label: 'Cambiar nombre', icon: 'editar', run: () => (renaming = { note, title: note.title }) },
      { label: 'Duplicar', icon: 'copiar', run: async () => (await duplicateNote(note.id), refresh(), toast('Nota duplicada ✨')) },
      { label: 'Exportar a PDF', icon: 'descargar', run: () => exportNotes([note], note.title) },
      {
        label: 'Mandar a la papelera',
        icon: 'basura',
        danger: true,
        run: async () => {
          await trashNote(note.id)
          await refresh()
          toast(`«${note.title}» está en la papelera`, { label: 'Deshacer', run: async () => (await restoreNote(note.id), refresh()) })
        },
      },
    ]
  }
</script>

{#if missing}
  <div class="page deco-bg center">
    <p class="muted">Este cuaderno ya no existe.</p>
    <button class="btn primary" onclick={() => go({ name: 'estante' }, true)}>Ir al estante</button>
  </div>
{:else if notebook}
  <div class="page deco-bg">
    <header>
      <button class="icon-btn" onclick={() => go({ name: 'estante' })} aria-label="Volver al estante"><Icon name="atras" /></button>
      <button class="mini-cover" onclick={() => (editingNotebook = true)} aria-label="Editar portada">
        <CoverArt cover={notebook.cover} />
      </button>
      <div class="title">
        <h1>{notebook.name}</h1>
        <span class="muted">{notes.length} {notes.length === 1 ? 'nota' : 'notas'}</span>
      </div>
      {#if notebook.cover.template === 'propia'}
        <button class="btn" onclick={designCover} title="Dibujar mi portada"><Icon name="pincel" size={20} /> Portada</button>
      {/if}
      <div class="tools">
        <button class="icon-btn" disabled={!notes.length || busy} onclick={() => exportNotes(notes, notebook!.name)} title="Exportar cuaderno a PDF" aria-label="Exportar cuaderno a PDF">
          <Icon name="descargar" />
        </button>
        <button class="btn" onclick={() => pdfInput.click()} disabled={!!importing} title="Importar un PDF para escribir encima"><Icon name="papel" size={20} /> PDF</button>
        <button class="btn primary" onclick={() => (newNote = { title: '', background: { ...notebook!.background } })}>
          <Icon name="mas" size={20} /> Nueva nota
        </button>
        <button class="icon-btn" onclick={() => (app.settingsOpen = true)} aria-label="Ajustes" title="Ajustes"><Icon name="ajustes" /></button>
      </div>
    </header>

    {#if notes.length > 3}
      <label class="search">
        <Icon name="buscar" size={20} />
        <span class="sr-only">Buscar notas</span>
        <input bind:value={query} placeholder="Buscar en títulos y textos…" />
      </label>
    {/if}

    <section class="grid" aria-label="Notas">
      {#each filtered as note (note.id)}
        <div class="note">
          <button class="thumb" onclick={() => go({ name: 'nota', id: note.id })} aria-label="Abrir {note.title}">
            {#if thumbs[note.id]}
              <img src={thumbs[note.id]} alt="" />
            {:else}
              <PaperSwatch bg={note.background} width={240} height={320} zoom={0.9} />
            {/if}
          </button>
          <div class="meta">
            <div class="text">
              <span class="name">{note.title}</span>
              <small class="muted">{formatDate(note.updatedAt)}</small>
            </div>
            <button class="icon-btn small" onclick={() => (menuFor = note)} aria-label="Opciones de {note.title}"><Icon name="opciones" /></button>
          </div>
        </div>
      {/each}
    </section>

    {#if !notes.length}
      <p class="empty">Un cuaderno nuevecito ♡<br />Toca «Nueva nota» para empezar.</p>
    {:else if !filtered.length}
      <p class="empty small-empty">Ninguna nota tiene eso.</p>
    {/if}
  </div>
{/if}

<input
  bind:this={pdfInput}
  type="file"
  accept="application/pdf,.pdf"
  hidden
  onchange={(e) => {
    const f = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (f) void importPdf(f)
  }}
/>

{#if importing}
  <div class="importing" role="status">{importing} ✨</div>
{/if}

{#if newNote}
  <Modal title="Nueva nota" onclose={() => (newNote = null)}>
    <label class="field">
      <span>Título</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input class="input" bind:value={newNote.title} placeholder="Nota sin título" maxlength="80" autofocus />
    </label>
    <PaperPicker bind:value={newNote.background} />
    {#snippet footer()}
      <button class="btn" onclick={() => (newNote = null)}>Cancelar</button>
      <button
        class="btn primary"
        onclick={async () => {
          const n = await createNote(id, newNote!.title, newNote!.background)
          newNote = null
          go({ name: 'nota', id: n.id })
        }}>Crear nota</button
      >
    {/snippet}
  </Modal>
{/if}

{#if renaming}
  <Modal title="Cambiar nombre" onclose={() => (renaming = null)}>
    <form
      id="rename"
      onsubmit={async (e) => {
        e.preventDefault()
        await updateNote(renaming!.note.id, { title: renaming!.title.trim() || 'Nota sin título' })
        renaming = null
        refresh()
      }}
    >
      <!-- svelte-ignore a11y_autofocus -->
      <input class="input wide" bind:value={renaming.title} maxlength="80" autofocus aria-label="Título" />
    </form>
    {#snippet footer()}
      <button class="btn" onclick={() => (renaming = null)}>Cancelar</button>
      <button class="btn primary" type="submit" form="rename">Guardar</button>
    {/snippet}
  </Modal>
{/if}

{#if menuFor}
  <ActionSheet title={menuFor.title} actions={actionsFor(menuFor)} onclose={() => (menuFor = null)} />
{/if}

{#if editingNotebook && notebook}
  <NotebookForm
    {notebook}
    onclose={() => (editingNotebook = false)}
    onsave={async (d) => {
      await updateNotebook(id, d)
      editingNotebook = false
      if (d.cover.template === 'propia' && !d.cover.image) await designCover()
      else refresh()
    }}
  />
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

  header {
    max-width: 1200px;
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .mini-cover {
    width: 46px;
    padding: 0;
    border: none;
    background: none;
    filter: drop-shadow(0 3px 6px rgba(170, 80, 110, 0.25));
  }

  .title {
    flex: 1;
    min-width: 0;
    display: grid;
  }

  h1 {
    font-size: clamp(24px, 3.4vw, 32px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title span {
    font-size: 14px;
    font-weight: 700;
  }

  .importing {
    position: fixed;
    top: calc(16px + var(--safe-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    padding: 10px 20px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 800;
    box-shadow: var(--shadow-lg);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search {
    max-width: 1200px;
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    min-height: 46px;
    border-radius: 999px;
    background: var(--surface);
    border: 1.5px solid var(--line);
    color: var(--text-soft);
  }

  .search input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    min-height: 44px;
    color: var(--text);
  }

  .grid {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: clamp(16px, 2.6vw, 28px);
  }

  .note {
    display: grid;
    gap: 6px;
  }

  .thumb {
    aspect-ratio: 3 / 4;
    padding: 0;
    border: none;
    border-radius: 14px;
    overflow: hidden;
    background: var(--surface);
    box-shadow: var(--shadow);
    transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.3);
  }

  .thumb:hover {
    transform: translateY(-3px);
  }

  .thumb img,
  .thumb :global(canvas) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover;
    display: block;
    border-radius: 0;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-left: 4px;
  }

  .text {
    flex: 1;
    min-width: 0;
    display: grid;
  }

  .name {
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    font-size: 13px;
  }

  .small {
    width: 38px;
    height: 38px;
    flex: none;
  }

  .wide {
    width: 100%;
  }

  .empty {
    text-align: center;
    margin-top: 40px;
    color: var(--text-soft);
    font-family: var(--font-script);
    font-size: 26px;
    line-height: 1.4;
  }

  .small-empty {
    font-size: 22px;
  }
</style>
