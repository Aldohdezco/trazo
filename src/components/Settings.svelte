<script lang="ts">
  import { app, requestPersistence, setSetting, toast } from '../lib/app.svelte'
  import { restoreBackup } from '../lib/backup'
  import { db } from '../lib/db'
  import type { Theme } from '../lib/types'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let { onclose, onbackup }: { onclose: () => void; onbackup: () => Promise<void> } = $props()

  let persisted = $state<boolean | null>(null)
  let usage = $state('')
  let pending = $state<File | null>(null)
  let restoring = $state(false)
  let fileInput: HTMLInputElement

  $effect(() => {
    navigator.storage?.persisted?.().then((p) => (persisted = p)).catch(() => {})
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined) usage = (e.usage / 1024 / 1024).toFixed(1) + ' MB'
    }).catch(() => {})
  })

  const THEMES: { id: Theme; label: string }[] = [
    { id: 'auto', label: 'Como el sistema' },
    { id: 'claro', label: 'Claro' },
    { id: 'oscuro', label: 'Oscuro' },
  ]

  const REMINDERS = [
    { v: 0, label: 'Nunca' },
    { v: 3, label: 'Cada 3 días' },
    { v: 7, label: 'Cada semana' },
    { v: 14, label: 'Cada 2 semanas' },
    { v: 30, label: 'Cada mes' },
  ]

  async function restore(mode: 'reemplazar' | 'combinar') {
    if (!pending) return
    restoring = true
    try {
      const bytes = new Uint8Array(await pending.arrayBuffer())
      const r = await restoreBackup(db, bytes, mode)
      toast(`Respaldo restaurado: ${r.notebooks} cuadernos y ${r.notes} notas ♡`)
      setTimeout(() => location.reload(), 900)
    } catch (err) {
      toast((err as Error).message)
    } finally {
      restoring = false
      pending = null
    }
  }

  const lastBackup = $derived(
    app.settings.ultimoRespaldo ? new Date(app.settings.ultimoRespaldo).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'nunca',
  )
</script>

<Modal title="Ajustes" {onclose}>
  <section>
    <h3>Lápiz</h3>
    <label class="toggle">
      <input type="checkbox" checked={app.settings.soloLapiz} onchange={(e) => setSetting('soloLapiz', e.currentTarget.checked)} />
      <span class="switch" aria-hidden="true"></span>
      <span>
        <strong>Solo el lápiz dibuja</strong>
        <small class="muted">Actívalo si tu lápiz es activo (como el Apple Pencil): así el dedo y la palma solo mueven la hoja. Con un lápiz genérico déjalo apagado.</small>
      </span>
    </label>
  </section>

  <section>
    <h3>Apariencia</h3>
    <div class="chip-row">
      {#each THEMES as t (t.id)}
        <button class="chip" class:on={app.settings.tema === t.id} onclick={() => setSetting('tema', t.id)}>{t.label}</button>
      {/each}
    </div>
  </section>

  <section>
    <h3>Hojas del PDF</h3>
    <div class="chip-row">
      <button class="chip" class:on={app.settings.hojaPdf === 'carta'} onclick={() => setSetting('hojaPdf', 'carta')}>Carta</button>
      <button class="chip" class:on={app.settings.hojaPdf === 'a4'} onclick={() => setSetting('hojaPdf', 'a4')}>A4</button>
    </div>
  </section>

  <section>
    <h3>Respaldo</h3>
    <p class="muted">
      Tus cuadernos viven solo en este dispositivo. Guarda un respaldo de vez en cuando (en Archivos, Drive o donde quieras) para no perder nada.
      <br />Último respaldo: <strong>{lastBackup}</strong>.
    </p>
    <div class="row">
      <button class="btn primary" onclick={onbackup}><Icon name="respaldo" size={20} /> Guardar respaldo</button>
      <button class="btn" onclick={() => fileInput.click()} disabled={restoring}><Icon name="subir" size={20} /> Restaurar</button>
    </div>
    <label class="field">
      <span>Recordarme respaldar</span>
      <select class="input" value={app.settings.recordatorioDias} onchange={(e) => setSetting('recordatorioDias', +e.currentTarget.value)}>
        {#each REMINDERS as r (r.v)}
          <option value={r.v}>{r.label}</option>
        {/each}
      </select>
    </label>
    <p class="muted small">
      {#if persisted}
        ✓ El navegador prometió no borrar tus datos.
      {:else if persisted === false}
        El navegador todavía puede borrar los datos si le falta espacio.
        <button class="link" onclick={async () => (persisted = await requestPersistence())}>Pedir que no los borre</button>
        {#if /iPad|iPhone|Macintosh/.test(navigator.userAgent)}
          En iPad ayuda instalar Trazo en la pantalla de inicio (Compartir → Agregar a inicio).
        {/if}
      {/if}
      {#if usage}<br />Espacio usado: {usage}.{/if}
    </p>
  </section>
</Modal>

<input
  bind:this={fileInput}
  type="file"
  hidden
  onchange={(e) => {
    pending = e.currentTarget.files?.[0] ?? null
    e.currentTarget.value = ''
  }}
/>

{#if pending}
  <Modal title="Restaurar respaldo" onclose={() => (pending = null)}>
    <p>¿Cómo quieres restaurar <strong>{pending.name}</strong>?</p>
    <ul class="muted">
      <li><strong>Combinar:</strong> agrega lo del respaldo y conserva lo que ya tienes (si algo está en los dos lados, gana lo más reciente).</li>
      <li><strong>Reemplazar todo:</strong> borra lo que hay ahora y deja exactamente lo del respaldo.</li>
    </ul>
    {#snippet footer()}
      <button class="btn" onclick={() => (pending = null)}>Cancelar</button>
      <button class="btn danger" disabled={restoring} onclick={() => restore('reemplazar')}>Reemplazar todo</button>
      <button class="btn primary" disabled={restoring} onclick={() => restore('combinar')}>Combinar</button>
    {/snippet}
  </Modal>
{/if}

<style>
  section {
    display: grid;
    gap: 12px;
  }

  h3 {
    font-size: 18px;
  }

  p {
    margin: 0;
  }

  .small {
    font-size: 14px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .toggle {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    cursor: pointer;
  }

  .toggle input {
    position: absolute;
    opacity: 0;
  }

  .switch {
    flex: none;
    position: relative;
    width: 50px;
    height: 30px;
    border-radius: 999px;
    background: var(--surface-3);
    transition: background 0.2s ease;
  }

  .switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
  }

  .toggle input:checked + .switch {
    background: var(--accent);
  }

  .toggle input:checked + .switch::after {
    transform: translateX(20px);
  }

  .toggle input:focus-visible + .switch {
    outline: 2.5px solid var(--accent);
    outline-offset: 2px;
  }

  .toggle small {
    display: block;
    font-size: 14px;
  }

  .link {
    border: none;
    background: none;
    padding: 0;
    color: var(--accent-strong);
    font-weight: 800;
    text-decoration: underline;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: 8px;
  }
</style>
