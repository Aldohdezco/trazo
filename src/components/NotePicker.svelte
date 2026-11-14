<script lang="ts">
  import { listNotebooks, listNotes, normalize } from '../lib/db'
  import type { Note, Notebook } from '../lib/types'
  import { formatDate } from '../lib/util'
  import CoverArt from './CoverArt.svelte'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let { exclude, onpick, onclose }: { exclude: string; onpick: (noteId: string) => void; onclose: () => void } = $props()

  let groups = $state<{ nb: Notebook; notes: Note[] }[]>([])
  let query = $state('')

  ;(async () => {
    const out: { nb: Notebook; notes: Note[] }[] = []
    for (const nb of await listNotebooks()) {
      const notes = (await listNotes(nb.id)).filter((n) => n.id !== exclude)
      if (notes.length) out.push({ nb, notes })
    }
    groups = out
  })()

  const filtered = $derived.by(() => {
    const q = normalize(query.trim())
    if (!q) return groups
    return groups
      .map((g) => ({ nb: g.nb, notes: g.notes.filter((n) => normalize(n.title).includes(q) || normalize(g.nb.name).includes(q)) }))
      .filter((g) => g.notes.length)
  })
</script>

<Modal title="¿Qué nota abres al lado?" {onclose} wide>
  <label class="search">
    <Icon name="buscar" size={20} />
    <span class="sr-only">Buscar nota</span>
    <input bind:value={query} placeholder="Buscar nota o cuaderno…" />
  </label>

  {#each filtered as g (g.nb.id)}
    <section>
      <h3><span class="mini"><CoverArt cover={g.nb.cover} /></span>{g.nb.name}</h3>
      <ul>
        {#each g.notes as n (n.id)}
          <li>
            <button onclick={() => onpick(n.id)}>
              <Icon name="papel" />
              <span class="t"><strong>{n.title}</strong><small class="muted">{formatDate(n.updatedAt)}</small></span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="muted empty">No hay otras notas todavía.</p>
  {/each}
</Modal>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    min-height: 46px;
    border-radius: 999px;
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

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    margin-bottom: 8px;
  }

  .mini {
    width: 24px;
    flex: none;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  li button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 6px 12px;
    border: none;
    border-radius: 14px;
    background: none;
    text-align: left;
    color: var(--accent);
  }

  li button:hover {
    background: var(--surface-2);
  }

  .t {
    display: grid;
    color: var(--text);
  }

  .empty {
    text-align: center;
  }
</style>
