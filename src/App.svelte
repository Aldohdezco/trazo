<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte'
  import { app, dismissToast, initApp, requestPersistence, setSetting, toast } from './lib/app.svelte'
  import { createBackup } from './lib/backup'
  import { db } from './lib/db'
  import { saveFile } from './lib/export'
  import Editor from './components/Editor.svelte'
  import NotebookView from './components/NotebookView.svelte'
  import Settings from './components/Settings.svelte'
  import Shelf from './components/Shelf.svelte'
  import Trash from './components/Trash.svelte'
  import FontEditor from './components/FontEditor.svelte'
  import FontStudio from './components/FontStudio.svelte'
  import SplitView from './components/SplitView.svelte'

  initApp().then(() => requestPersistence())

  useRegisterSW({ immediate: true })

  $effect(() => {
    const t = app.settings.tema
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
  })

  async function backup() {
    try {
      const bytes = await createBackup(db)
      const date = new Date().toISOString().slice(0, 10)
      await saveFile(new Blob([bytes as BlobPart], { type: 'application/zip' }), `trazo-respaldo-${date}.trazo`)
      await setSetting('ultimoRespaldo', Date.now())
      toast('Respaldo guardado ♡')
    } catch (err) {
      toast('No se pudo crear el respaldo: ' + (err as Error).message)
    }
  }
</script>

{#if app.ready}
  {#if app.route.name === 'nota'}
    {#key app.route.id}
      <Editor id={app.route.id} />
    {/key}
  {:else if app.route.name === 'cuaderno'}
    <NotebookView id={app.route.id} />
  {:else if app.route.name === 'papelera'}
    <Trash />
  {:else if app.route.name === 'dividida'}
    {#key app.route.a + app.route.b}
      <SplitView a={app.route.a} b={app.route.b} />
    {/key}
  {:else if app.route.name === 'fuentes'}
    <FontStudio />
  {:else if app.route.name === 'fuente'}
    {#key app.route.id}
      <FontEditor id={app.route.id} />
    {/key}
  {:else}
    <Shelf onsettings={() => (app.settingsOpen = true)} onbackup={backup} />
  {/if}
{/if}

{#if app.settingsOpen}
  <Settings onclose={() => (app.settingsOpen = false)} onbackup={backup} />
{/if}

<div class="toasts" aria-live="polite">
  {#each app.toasts as t (t.id)}
    <div class="toast">
      <span>{t.text}</span>
      {#if t.action}
        <button
          onclick={() => {
            t.action!.run()
            dismissToast(t.id)
          }}>{t.action.label}</button
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: calc(24px + var(--safe-bottom));
    transform: translateX(-50%);
    z-index: 100;
    display: grid;
    gap: 8px;
    width: max-content;
    max-width: calc(100% - 32px);
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 18px;
    border-radius: 999px;
    background: var(--text);
    color: var(--bg);
    font-weight: 700;
    box-shadow: var(--shadow-lg);
    animation: up 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }

  .toast button {
    border: none;
    background: none;
    color: var(--accent-soft);
    font-weight: 800;
    text-decoration: underline;
    padding: 0;
  }

  @keyframes up {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
</style>
