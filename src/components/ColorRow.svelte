<script lang="ts">
  import { app, setSetting } from '../lib/app.svelte'

  let { value, colors, onpick, label = 'Color' }: { value: string; colors: string[]; onpick: (c: string) => void; label?: string } = $props()

  const favorites = $derived(app.settings.coloresFavoritos.filter((c) => !colors.includes(c)))

  function custom(e: Event) {
    const c = (e.target as HTMLInputElement).value
    onpick(c)
    const favs = [c, ...app.settings.coloresFavoritos.filter((f) => f !== c)].slice(0, 6)
    void setSetting('coloresFavoritos', favs)
  }
</script>

<div class="colors" role="radiogroup" aria-label={label}>
  {#each [...colors, ...favorites] as c (c)}
    <button
      class="swatch"
      class:on={value.toLowerCase() === c.toLowerCase()}
      style="background:{c}"
      role="radio"
      aria-checked={value.toLowerCase() === c.toLowerCase()}
      aria-label={c}
      onclick={() => onpick(c)}
    ></button>
  {/each}
  <label class="swatch custom" title="Otro color">
    <span class="sr-only">Elegir otro color</span>
    <input type="color" {value} onchange={custom} />
  </label>
</div>

<style>
  .colors {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
  }

  .swatch {
    width: 30px;
    height: 30px;
    flex: none;
  }

  .custom {
    position: relative;
    display: block;
    background: conic-gradient(#f6a5b8, #f9d48a, #b9e4a8, #9fd0f0, #c9b3ee, #f6a5b8);
    cursor: pointer;
    overflow: hidden;
  }

  .custom input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
</style>
