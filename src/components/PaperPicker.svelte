<script lang="ts">
  import { PAPERS, PAPER_COLORS } from '../lib/catalog'
  import type { Background } from '../lib/types'
  import PaperSwatch from './PaperSwatch.svelte'

  let { value = $bindable() }: { value: Background } = $props()
</script>

<div class="field">
  <span>Papel</span>
  <div class="papers" role="radiogroup" aria-label="Tipo de papel">
    {#each PAPERS as p (p.id)}
      <button
        class="paper"
        class:on={value.paper === p.id}
        role="radio"
        aria-checked={value.paper === p.id}
        onclick={() => (value = { ...value, paper: p.id })}
      >
        <PaperSwatch bg={{ paper: p.id, color: value.color }} width={76} height={98} />
        <small>{p.name}</small>
      </button>
    {/each}
  </div>
</div>

<div class="field">
  <span>Color del papel</span>
  <div class="chip-row" role="radiogroup" aria-label="Color del papel">
    {#each PAPER_COLORS as c (c.id)}
      <button
        class="swatch"
        class:on={value.color === c.id}
        style="background:{c.id}"
        role="radio"
        aria-checked={value.color === c.id}
        aria-label={c.name}
        title={c.name}
        onclick={() => (value = { ...value, color: c.id })}
      ></button>
    {/each}
  </div>
</div>

<style>
  .papers {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 10px;
  }

  .paper {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 6px 4px 8px;
    border-radius: 16px;
    border: 2px solid transparent;
    background: none;
  }

  .paper :global(canvas) {
    box-shadow: 0 0 0 1.5px var(--line), 0 3px 8px rgba(190, 100, 130, 0.12);
  }

  .paper.on {
    border-color: var(--accent);
    background: var(--surface-2);
  }

  small {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-soft);
  }
</style>
