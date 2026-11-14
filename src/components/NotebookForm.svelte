<script lang="ts">
  import { COVER_COLORS, COVER_TEMPLATES } from '../lib/catalog'
  import type { Background, Cover, Notebook } from '../lib/types'
  import CoverArt from './CoverArt.svelte'
  import Modal from './Modal.svelte'
  import PaperPicker from './PaperPicker.svelte'

  let {
    notebook,
    onsave,
    onclose,
  }: {
    notebook?: Notebook
    onsave: (data: { name: string; cover: Cover; background: Background }) => void
    onclose: () => void
  } = $props()

  // Valores iniciales: se copian una vez al abrir el formulario.
  const initial = (() => notebook)()
  let name = $state(initial?.name ?? '')
  let cover = $state<Cover>(initial ? { ...initial.cover } : { template: 'mono', color: '#f6c6d2' })
  let background = $state<Background>(initial ? { ...initial.background } : { paper: 'rayado', color: '#fdf6ec' })

  function submit(e?: Event) {
    e?.preventDefault()
    onsave({ name: name.trim() || 'Mi cuaderno', cover: { ...cover }, background: { ...background } })
  }
</script>

<Modal title={notebook ? 'Editar cuaderno' : 'Nuevo cuaderno'} {onclose} wide>
  <form class="layout" onsubmit={submit}>
    <div class="preview">
      <CoverArt {cover} title={name || 'Mi cuaderno'} />
    </div>
    <div class="fields">
      <label class="field">
        <span>Nombre</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="input" bind:value={name} placeholder="Mi cuaderno" maxlength="60" autofocus={!notebook} />
      </label>

      <div class="field">
        <span>Portada</span>
        <div class="chip-row" role="radiogroup" aria-label="Diseño de portada">
          {#each COVER_TEMPLATES as t (t.id)}
            <button
              type="button"
              class="chip"
              class:on={cover.template === t.id}
              role="radio"
              aria-checked={cover.template === t.id}
              onclick={() => (cover.template = t.id)}>{t.name}</button
            >
          {/each}
        </div>
      </div>

      {#if cover.template === 'propia'}
        <p class="muted hint">Al guardar se abre una hoja en blanco para que dibujes tu portada como quieras ✏️ (con stickers, letras y todo).</p>
      {/if}

      <div class="field">
        <span>Color de portada</span>
        <div class="chip-row" role="radiogroup" aria-label="Color de portada">
          {#each COVER_COLORS as c (c.id)}
            <button
              type="button"
              class="swatch"
              class:on={cover.color === c.id}
              style="background:{c.id}"
              role="radio"
              aria-checked={cover.color === c.id}
              aria-label={c.name}
              title={c.name}
              onclick={() => (cover.color = c.id)}
            ></button>
          {/each}
        </div>
      </div>
    </div>
  </form>

  <div class="paper-section">
    <p class="muted hint">Papel para las notas nuevas de este cuaderno (cada nota lo puede cambiar).</p>
    <PaperPicker bind:value={background} />
  </div>

  {#snippet footer()}
    <button class="btn" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn primary" type="button" onclick={() => submit()}>{notebook ? 'Guardar' : 'Crear cuaderno'}</button>
  {/snippet}
</Modal>

<style>
  .layout {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 22px;
    align-items: start;
  }

  .preview {
    filter: drop-shadow(0 8px 18px rgba(190, 100, 130, 0.25));
    transform: rotate(-2deg);
  }

  .fields {
    display: grid;
    gap: 16px;
  }

  .paper-section {
    display: grid;
    gap: 14px;
  }

  .hint {
    margin: 0;
    font-size: 14px;
  }

  @media (max-width: 560px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .preview {
      width: 150px;
      justify-self: center;
    }
  }
</style>
