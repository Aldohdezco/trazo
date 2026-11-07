<script lang="ts">
  import { app, requestPersistence, setSetting, toast } from '../lib/app.svelte'
  import { restoreBackup } from '../lib/backup'
  import { cleanKey, testGeminiKey } from '../lib/recognize'
  import { db } from '../lib/db'
  import { FONTS } from '../lib/catalog'
  import type { FontId, HandStyle, Recognition, Theme } from '../lib/types'
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

  const STYLES: { id: HandStyle; label: string; sample: string }[] = [
    { id: 'cursiva', label: 'Cuando escribo en cursiva', sample: 'Hola, bonita' },
    { id: 'molde', label: 'Cuando escribo en letra de molde', sample: 'Hola, bonita' },
    { id: 'mayusculas', label: 'Cuando escribo en MAYÚSCULAS', sample: 'HOLA, BONITA' },
  ]

  const PROVIDERS: { id: Recognition['proveedor']; label: string }[] = [
    { id: 'ninguno', label: 'Apagada' },
    { id: 'gemini', label: 'Gemini (gratis) ⭐' },
    { id: 'myscript', label: 'MyScript' },
    { id: 'google', label: 'Google Vision' },
  ]

  let keyTest = $state<{ ok: boolean; message: string } | null>(null)
  let testing = $state(false)

  async function testKey() {
    testing = true
    keyTest = await testGeminiKey(app.settings.reconocimiento.geminiKey)
    testing = false
  }

  function setRecognition(changes: Partial<Recognition>) {
    void setSetting('reconocimiento', { ...app.settings.reconocimiento, ...changes })
  }

  function setStyleFont(style: HandStyle, font: FontId) {
    void setSetting('fuentesEstilo', { ...app.settings.fuentesEstilo, [style]: font })
  }

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
    <h3>Escritura mágica ✨</h3>
    <p class="muted small">Con el Lápiz mágico tu letra se convierte en texto bonito. Para leer la letra se usa un servicio en internet: elige uno y pega aquí sus llaves (se guardan solo en este dispositivo y no van en los respaldos).</p>
    <div class="chip-row">
      {#each PROVIDERS as p (p.id)}
        <button class="chip" class:on={app.settings.reconocimiento.proveedor === p.id} onclick={() => setRecognition({ proveedor: p.id })}>{p.label}</button>
      {/each}
    </div>
    {#if app.settings.reconocimiento.proveedor === 'gemini'}
      <label class="field">
        <span>Llave de Gemini (API key)</span>
        <input
          class="input key"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="AIza…"
          value={app.settings.reconocimiento.geminiKey}
          oninput={() => (keyTest = null)}
          onchange={(e) => {
            const k = cleanKey(e.currentTarget.value)
            e.currentTarget.value = k
            setRecognition({ geminiKey: k })
          }}
        />
      </label>
      <div class="row">
        <button class="btn" disabled={!app.settings.reconocimiento.geminiKey || testing} onclick={testKey}>{testing ? 'Probando…' : 'Probar llave'}</button>
      </div>
      {#if keyTest}
        <p class="key-test" class:ok={keyTest.ok} role="status">{keyTest.message}</p>
      {/if}
      <p class="muted small">
        Gratis: entra a <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> con una cuenta de Google, toca «Create API key» y pégala aquí.
        Lee muy bien la letra corrida y reconoce si escribiste en cursiva.
      </p>
    {:else if app.settings.reconocimiento.proveedor === 'myscript'}
      <label class="field">
        <span>Application key</span>
        <input class="input" type="password" autocomplete="off" value={app.settings.reconocimiento.myscriptApp} onchange={(e) => setRecognition({ myscriptApp: e.currentTarget.value.trim() })} />
      </label>
      <label class="field">
        <span>HMAC key</span>
        <input class="input" type="password" autocomplete="off" value={app.settings.reconocimiento.myscriptHmac} onchange={(e) => setRecognition({ myscriptHmac: e.currentTarget.value.trim() })} />
      </label>
      <p class="muted small">Se sacan en <a href="https://developer.myscript.com" target="_blank" rel="noopener">developer.myscript.com</a> (crea una cuenta y unas llaves de «Cloud»). Lee directamente los trazos: es el más preciso.</p>
    {:else if app.settings.reconocimiento.proveedor === 'google'}
      <label class="field">
        <span>API key de Google Cloud</span>
        <input class="input" type="password" autocomplete="off" value={app.settings.reconocimiento.googleKey} onchange={(e) => setRecognition({ googleKey: e.currentTarget.value.trim() })} />
      </label>
      <p class="muted small">En <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a>: activa «Cloud Vision API» y crea una API key limitada a este sitio.</p>
    {/if}

    <div class="styles">
      {#each STYLES as st (st.id)}
        <label class="field">
          <span>{st.label}</span>
          <select class="input" value={app.settings.fuentesEstilo[st.id]} onchange={(e) => setStyleFont(st.id, e.currentTarget.value as FontId)}>
            {#each FONTS as f (f.id)}
              <option value={f.id}>{f.name}</option>
            {/each}
          </select>
          <span class="sample" style="font-family:'{FONTS.find((f) => f.id === app.settings.fuentesEstilo[st.id])?.family}'">{st.sample}</span>
        </label>
      {/each}
    </div>
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

  .key {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 14px;
  }

  .key-test {
    padding: 10px 14px;
    border-radius: 12px;
    font-weight: 700;
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
  }

  .key-test.ok {
    background: color-mix(in srgb, #3c9d74 14%, transparent);
    color: #2f7d5c;
  }

  .styles {
    display: grid;
    gap: 14px;
  }

  .sample {
    font-size: 26px !important;
    font-weight: 400 !important;
    color: var(--accent-strong) !important;
    line-height: 1.3;
  }

  a {
    color: var(--accent-strong);
    font-weight: 800;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: 8px;
  }
</style>
