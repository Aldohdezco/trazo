<script lang="ts">
  import { app, fontOptions, go, requestPersistence, setSetting, toast } from '../lib/app.svelte'
  import { restoreBackup } from '../lib/backup'
  import { cleanKey, testGeminiKey } from '../lib/recognize'
  import { db } from '../lib/db'
  import { fontFamily } from '../lib/catalog'
  import type { FontId, HandStyle, Palette, Recognition, Settings, Theme } from '../lib/types'
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
    { id: 'claro', label: 'Claro ☀️' },
    { id: 'oscuro', label: 'Oscuro 🌙' },
    { id: 'auto', label: 'Como el sistema' },
  ]

  const PALETTES: { id: Palette; label: string; accent: string; soft: string }[] = [
    { id: 'rosa', label: 'Rosa', accent: '#d9668a', soft: '#f6c6d2' },
    { id: 'fresa', label: 'Fresa', accent: 'hsl(350 72% 56%)', soft: 'hsl(350 68% 87%)' },
    { id: 'durazno', label: 'Durazno', accent: 'hsl(18 78% 60%)', soft: 'hsl(18 68% 87%)' },
    { id: 'vainilla', label: 'Vainilla', accent: 'hsl(36 62% 48%)', soft: 'hsl(36 68% 87%)' },
    { id: 'menta', label: 'Menta', accent: 'hsl(158 38% 44%)', soft: 'hsl(158 68% 87%)' },
    { id: 'cielo', label: 'Cielo', accent: 'hsl(208 58% 52%)', soft: 'hsl(208 68% 87%)' },
    { id: 'lila', label: 'Lila', accent: 'hsl(270 48% 62%)', soft: 'hsl(270 68% 87%)' },
  ]

  type SectionId = 'apariencia' | 'lapiz' | 'escritura' | 'respaldo' | 'mas'
  const SECTIONS: { id: SectionId; label: string; emoji: string }[] = [
    { id: 'apariencia', label: 'Apariencia', emoji: '🎨' },
    { id: 'lapiz', label: 'Lápiz y gestos', emoji: '✏️' },
    { id: 'escritura', label: 'Escritura mágica', emoji: '✨' },
    { id: 'respaldo', label: 'Respaldo', emoji: '💾' },
    { id: 'mas', label: 'Más', emoji: '💡' },
  ]
  const SECTION_KEY = 'trazo:ajustes-seccion'
  let section = $state<SectionId>(readSection())
  function readSection(): SectionId {
    try {
      const v = localStorage.getItem(SECTION_KEY)
      return SECTIONS.some((x) => x.id === v) ? (v as SectionId) : 'apariencia'
    } catch {
      return 'apariencia'
    }
  }
  $effect(() => {
    try {
      localStorage.setItem(SECTION_KEY, section)
    } catch {
      /* sin almacenamiento */
    }
  })

  type ToggleKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings]

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

{#snippet toggle(key: ToggleKey, title: string, desc: string, emoji: string)}
  <label class="card toggle">
    <span class="emoji" aria-hidden="true">{emoji}</span>
    <span class="txt">
      <strong>{title}</strong>
      <small class="muted">{desc}</small>
    </span>
    <input type="checkbox" checked={app.settings[key]} onchange={(e) => setSetting(key, e.currentTarget.checked)} />
    <span class="switch" aria-hidden="true"></span>
  </label>
{/snippet}

<Modal title="Ajustes" {onclose} wide>
  <div class="layout">
    <div class="nav" role="tablist" aria-label="Secciones de ajustes">
      {#each SECTIONS as sec (sec.id)}
        <button class="nav-item" class:on={section === sec.id} role="tab" aria-selected={section === sec.id} onclick={() => (section = sec.id)}>
          <span class="nav-emoji" aria-hidden="true">{sec.emoji}</span>
          <span>{sec.label}</span>
        </button>
      {/each}
    </div>

    <div class="content" role="tabpanel" aria-label={SECTIONS.find((x) => x.id === section)?.label}>
      {#if section === 'apariencia'}
        <section>
          <h3>Modo</h3>
          <div class="modes">
            {#each THEMES as t (t.id)}
              <button class="mode" class:on={app.settings.tema === t.id} onclick={() => setSetting('tema', t.id)} aria-pressed={app.settings.tema === t.id}>
                <span class="mode-prev {t.id}" aria-hidden="true"><i></i><i></i><i></i></span>
                <span>{t.label}</span>
              </button>
            {/each}
          </div>
        </section>
        <section>
          <h3>Color de Trazo</h3>
          <p class="muted small">Cambia el color de los botones, los fondos y los detalles de toda la app.</p>
          <div class="palettes">
            {#each PALETTES as pal (pal.id)}
              <button class="palette" class:on={app.settings.paleta === pal.id} onclick={() => setSetting('paleta', pal.id)} aria-pressed={app.settings.paleta === pal.id}>
                <span class="dot" style="background: linear-gradient(135deg, {pal.soft} 0 50%, {pal.accent} 50% 100%)" aria-hidden="true">
                  {#if app.settings.paleta === pal.id}<Icon name="check" size={20} stroke={3} />{/if}
                </span>
                <span>{pal.label}</span>
              </button>
            {/each}
          </div>
        </section>
      {:else if section === 'lapiz'}
        <section>
          <h3>Lápiz y dedo</h3>
          {@render toggle('soloLapiz', 'Solo el lápiz dibuja', 'Actívalo si tu lápiz es activo (como el Apple Pencil): así el dedo y la palma solo mueven la hoja. Con un lápiz genérico déjalo apagado.', '✏️')}
        </section>
        <section>
          <h3>Atajos y ayudas al dibujar</h3>
          {@render toggle('dobleToque', 'Doble toque para seleccionar', 'Toca dos veces algo (un dibujo, una figura, una foto) y queda seleccionado para moverlo o cambiarle el color. Al soltarlo vuelves a tu lápiz.', '👆')}
          {@render toggle('autoSeleccion', 'Dejar seleccionado lo que acabas de hacer', 'Después de usar el marcatextos mágico, una figura o una línea, queda seleccionado para cambiarle el color o el grosor al momento.', '✨')}
          {@render toggle('figurasMagicas', 'Figuras perfectas', 'Dibuja un círculo, cuadro o flecha y deja el lápiz quieto un momento al final: se convierte en figura perfecta.', '⭐')}
          {@render toggle('gestosDedos', 'Toques con dedos', 'Toca con dos dedos para deshacer y con tres para rehacer.', '🤞')}
        </section>
        <section class="cheat">
          <h3>Gestos</h3>
          <ul>
            <li><span>👆👆</span> Dos dedos: deshacer</li>
            <li><span>👆👆👆</span> Tres dedos: rehacer</li>
            <li><span>🤏</span> Pellizcar: acercar o alejar</li>
            <li><span>✋</span> Arrastrar con un dedo (con «Solo el lápiz»): mover la hoja</li>
          </ul>
        </section>
      {:else if section === 'escritura'}
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
        </section>
        <section>
          <h3>Qué letra usar</h3>
          <div class="styles">
            {#each STYLES as st (st.id)}
              <label class="field card">
                <span>{st.label}</span>
                <select class="input" value={app.settings.fuentesEstilo[st.id]} onchange={(e) => setStyleFont(st.id, e.currentTarget.value as FontId)}>
                  {#each fontOptions() as f (f.id)}
                    <option value={f.id}>{f.name}</option>
                  {/each}
                </select>
                <span class="sample" style="font-family:'{fontFamily(app.settings.fuentesEstilo[st.id])}'">{st.sample}</span>
              </label>
            {/each}
          </div>
        </section>
        <section>
          <h3>Mis fuentes ✍️</h3>
          <p class="muted small">Dibuja tu propia letra, una por una, y úsala en tus notas o para la escritura mágica.</p>
          <div class="row">
            <button
              class="btn"
              onclick={() => {
                onclose()
                go({ name: 'fuentes' })
              }}><Icon name="letra" size={20} /> Abrir el taller de fuentes</button
            >
          </div>
        </section>
      {:else if section === 'respaldo'}
        <section>
          <h3>Respaldo</h3>
          <div class="card info">
            <span class="emoji" aria-hidden="true">💾</span>
            <p class="muted">
              Tus cuadernos viven solo en este dispositivo. Guarda un respaldo de vez en cuando (en Archivos, Drive o donde quieras) para no perder nada.
              <br />Último respaldo: <strong>{lastBackup}</strong>.
            </p>
          </div>
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
      {:else}
        <section>
          <h3>Ayuditas</h3>
          {@render toggle('ayudas', 'Mostrar ayuditas', 'Al pasar el mouse o el lápiz sobre un botón (o al dejarlo presionado con el dedo) aparece qué es y para qué sirve.', '💡')}
        </section>
        <section>
          <h3>Hojas del PDF</h3>
          <p class="muted small">Tamaño de las hojas al exportar a PDF.</p>
          <div class="chip-row">
            <button class="chip" class:on={app.settings.hojaPdf === 'carta'} onclick={() => setSetting('hojaPdf', 'carta')}>Carta</button>
            <button class="chip" class:on={app.settings.hojaPdf === 'a4'} onclick={() => setSetting('hojaPdf', 'a4')}>A4</button>
          </div>
        </section>
      {/if}
    </div>
  </div>
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
  .layout {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 22px;
    align-items: start;
  }

  .nav {
    position: sticky;
    top: 0;
    display: grid;
    gap: 6px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 14px;
    border: none;
    border-radius: 16px;
    background: none;
    font-weight: 700;
    text-align: left;
    color: var(--text-soft);
    transition: background 0.15s ease;
  }

  .nav-item:hover {
    background: var(--surface-2);
  }

  .nav-item.on {
    background: var(--accent-soft);
    color: var(--accent-strong);
  }

  .nav-emoji {
    font-size: 20px;
  }

  .content {
    display: grid;
    gap: 24px;
    min-width: 0;
  }

  @media (max-width: 640px) {
    .layout {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .nav {
      display: flex;
      overflow-x: auto;
      margin: 0 -24px;
      padding: 2px 24px 6px;
      background: var(--surface);
      z-index: 1;
      scrollbar-width: none;
    }

    .nav-item {
      flex: none;
      min-height: 42px;
      border: 1.5px solid var(--line);
    }
  }

  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--surface-2);
    border: 1.5px solid var(--line);
  }

  .card .emoji {
    flex: none;
    font-size: 24px;
  }

  .card .txt {
    flex: 1;
    min-width: 0;
  }

  .card.info p {
    margin: 0;
  }

  .modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .mode,
  .palette {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 12px 8px;
    border-radius: 18px;
    border: 2px solid var(--line);
    background: var(--surface);
    font-weight: 700;
    font-size: 14px;
  }

  .mode.on,
  .palette.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-strong);
  }

  .mode-prev {
    width: 100%;
    max-width: 120px;
    aspect-ratio: 16 / 10;
    border-radius: 10px;
    padding: 8px;
    display: grid;
    gap: 5px;
    align-content: start;
    background: #fdf6f0;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .mode-prev i {
    display: block;
    height: 6px;
    border-radius: 9px;
    background: #f6c6d2;
  }

  .mode-prev i:first-child {
    width: 60%;
    background: #d9668a;
  }

  .mode-prev.oscuro {
    background: #241820;
  }

  .mode-prev.oscuro i {
    background: #47304a;
  }

  .mode-prev.oscuro i:first-child {
    background: #f29bb5;
  }

  .mode-prev.auto {
    background: linear-gradient(135deg, #fdf6f0 0 50%, #241820 50% 100%);
  }

  .palettes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 10px;
  }

  .palette .dot {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.6);
  }

  .cheat ul {
    list-style: none;
    padding: 0;
  }

  .cheat li {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .cheat li span {
    min-width: 60px;
    font-size: 20px;
  }

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
    font-size: 13.5px;
    line-height: 1.35;
    margin-top: 2px;
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
