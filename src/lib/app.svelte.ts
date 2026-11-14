import { FONTS } from './catalog'
import { invalidateTextCache } from './canvas/text'
import { DEFAULT_SETTINGS, db, listFonts, loadSettings, saveSetting, textOf } from './db'
import { customFamily, registerFont, unregisterFont } from './fontgen'
import type { CustomFont, FontId, Settings } from './types'

export type Route =
  | { name: 'estante' }
  | { name: 'cuaderno'; id: string }
  | { name: 'nota'; id: string }
  | { name: 'papelera' }
  | { name: 'fuentes' }
  | { name: 'fuente'; id: string }
  | { name: 'dividida'; a: string; b: string }

function parseHash(): Route {
  const [, kind, id, id2] = location.hash.split('/')
  if (kind === 'cuaderno' && id) return { name: 'cuaderno', id }
  if (kind === 'nota' && id) return { name: 'nota', id }
  if (kind === 'papelera') return { name: 'papelera' }
  if (kind === 'fuentes') return { name: 'fuentes' }
  if (kind === 'fuente' && id) return { name: 'fuente', id }
  if (kind === 'dividida' && id && id2) return { name: 'dividida', a: id, b: id2 }
  return { name: 'estante' }
}

export function routeHash(r: Route): string {
  switch (r.name) {
    case 'cuaderno':
      return `#/cuaderno/${r.id}`
    case 'nota':
      return `#/nota/${r.id}`
    case 'papelera':
      return '#/papelera'
    case 'fuentes':
      return '#/fuentes'
    case 'fuente':
      return `#/fuente/${r.id}`
    case 'dividida':
      return `#/dividida/${r.a}/${r.b}`
    default:
      return '#/'
  }
}

interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export const app = $state({
  route: parseHash() as Route,
  settings: { ...DEFAULT_SETTINGS } as Settings,
  ready: false,
  settingsOpen: false,
  toasts: [] as Toast[],
  /** Fuentes hechas en el taller, ya registradas en el navegador. */
  customFonts: [] as { id: FontId; name: string; family: string }[],
})

/** Todas las fuentes para elegir: las incluidas y las propias. */
export function fontOptions(): { id: FontId; name: string; family: string }[] {
  return [...FONTS, ...app.customFonts]
}

function fontsChanged() {
  invalidateTextCache()
  window.dispatchEvent(new Event('trazo-fuentes'))
}

/** Registra (o vuelve a generar) una fuente propia y la deja lista para usar. */
export async function refreshCustomFont(font: CustomFont) {
  try {
    await registerFont(font)
  } catch (err) {
    console.warn('No se pudo registrar la fuente', font.name, err)
    return
  }
  const entry = { id: `custom:${font.id}` as FontId, name: font.name || 'Mi letra', family: customFamily(font.id) }
  const i = app.customFonts.findIndex((f) => f.id === entry.id)
  if (i >= 0) app.customFonts[i] = entry
  else app.customFonts.push(entry)
  fontsChanged()
}

export function forgetCustomFont(id: string) {
  unregisterFont(id)
  app.customFonts = app.customFonts.filter((f) => f.id !== `custom:${id}`)
  fontsChanged()
}

async function loadCustomFonts() {
  for (const f of await listFonts()) await refreshCustomFont(f)
}

window.addEventListener('hashchange', () => {
  app.route = parseHash()
})

export function go(r: Route, replace = false) {
  const hash = routeHash(r)
  if (replace) history.replaceState(null, '', hash)
  else if (location.hash !== hash) location.hash = hash
  app.route = r
}

export async function initApp() {
  app.settings = await loadSettings()
  app.ready = true
  void indexOldNotes()
  void loadCustomFonts()
}

/** Las notas creadas antes de la búsqueda no tienen su texto indexado: se calcula una vez. */
async function indexOldNotes() {
  const pending = (await db.notes.toArray()).filter((n) => n.searchText === undefined)
  for (const n of pending) {
    const c = await db.contents.get(n.id)
    await db.notes.update(n.id, { searchText: textOf(c?.elements ?? []) })
  }
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  app.settings[key] = value
  await saveSetting(key, value)
}

let toastId = 0
export function toast(text: string, action?: Toast['action'], ms = 3500) {
  const id = ++toastId
  app.toasts.push({ id, text, action })
  setTimeout(() => dismissToast(id), action ? ms + 2500 : ms)
}

export function dismissToast(id: number) {
  const i = app.toasts.findIndex((t) => t.id === id)
  if (i >= 0) app.toasts.splice(i, 1)
}

/** Pide al navegador que no borre los datos (Safari de iPad los borra si no se usa la app). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
