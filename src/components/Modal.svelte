<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  let {
    title,
    onclose,
    children,
    footer,
    wide = false,
  }: { title: string; onclose: () => void; children: Snippet; footer?: Snippet; wide?: boolean } = $props()

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && onclose()}>
  <div class="sheet" class:wide role="dialog" aria-modal="true" aria-label={title}>
    <header>
      <h2>{title}</h2>
      <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><Icon name="cerrar" /></button>
    </header>
    <div class="body">
      {@render children()}
    </div>
    {#if footer}
      <footer>{@render footer()}</footer>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(70, 30, 50, 0.32);
    backdrop-filter: blur(3px);
    animation: fade 0.18s ease;
  }

  .sheet {
    width: min(480px, 100%);
    max-height: min(88vh, 860px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-radius: 26px;
    box-shadow: var(--shadow-lg);
    animation: pop 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
    overflow: hidden;
  }

  .sheet.wide {
    width: min(720px, 100%);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 14px 6px 24px;
  }

  h2 {
    font-size: 22px;
  }

  .body {
    padding: 8px 24px 20px;
    overflow-y: auto;
    display: grid;
    gap: 18px;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 24px calc(18px + var(--safe-bottom));
    border-top: 1.5px dashed var(--line);
  }

  @media (max-width: 560px) {
    .backdrop {
      place-items: end center;
      padding: 0;
    }

    .sheet,
    .sheet.wide {
      width: 100%;
      border-radius: 26px 26px 0 0;
      animation: slide 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(8px);
    }
  }

  @keyframes slide {
    from {
      transform: translateY(40%);
      opacity: 0;
    }
  }
</style>
