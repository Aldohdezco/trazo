/** Id único. No usa crypto.randomUUID porque solo existe en contextos seguros (y en LAN se prueba por http). */
export function uid(): string {
  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)
  return Date.now().toString(36) + Array.from(rand, (b) => (b % 36).toString(36)).join('')
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')
}

/** Mezcla dos colores; t = 0 devuelve a, t = 1 devuelve b. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as [number, number, number])
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.25
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined
  let lastArgs: A | undefined
  const call = (...args: A) => {
    lastArgs = args
    clearTimeout(t)
    t = setTimeout(() => {
      t = undefined
      fn(...args)
    }, ms)
  }
  call.flush = () => {
    if (t !== undefined && lastArgs) {
      clearTimeout(t)
      t = undefined
      fn(...lastArgs)
    }
  }
  call.cancel = () => clearTimeout(t)
  return call
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return 'hoy ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

export function safeFileName(name: string): string {
  return (name.trim() || 'trazo').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)
}

export async function blobToStored(blob: Blob): Promise<{ type: string; data: ArrayBuffer }> {
  return { type: blob.type || 'application/octet-stream', data: await blob.arrayBuffer() }
}

export function storedToBlob(s: { type: string; data: ArrayBuffer }): Blob {
  return new Blob([s.data], { type: s.type })
}

/** Relleno suave para figuras: si la tinta es casi negra, un rosa pastel queda más lindo que un gris. */
export function softFill(ink: string): string {
  return luminance(ink) < 0.04 ? '#f6c6d2' : mix(ink, '#ffffff', 0.6)
}
