/**
 * Stickers incluidos: dibujos vectoriales (SVG) hechos a mano y emojis de Twemoji con borde de sticker.
 * Se convierten en imagen al usarlos.
 */

import { DRAWN_STICKERS, ORIGINAL_STICKERS } from './stickerArt'
import { TWEMOJI_SECTIONS, twemojiCode } from './stickersTwemoji'

export interface BuiltinSticker {
  id: string
  name: string
  category: string
  /** Proporción ancho / alto del dibujo. */
  ratio: number
  /** Dibujo SVG en línea (los hechos a mano). */
  svg?: string
  /** Ruta de un SVG servido junto a la app, relativa a la base (los de Twemoji). Se le pone borde blanco troquelado. */
  src?: string
}

/** Categorías que vienen de Twemoji (llevan crédito CC-BY en la biblioteca). */
export const TWEMOJI_CATEGORIES = Object.keys(TWEMOJI_SECTIONS)

const TWEMOJI_STICKERS: BuiltinSticker[] = Object.entries(TWEMOJI_SECTIONS).flatMap(([category, list]) =>
  list.map(([emoji, name]) => {
    const code = twemojiCode(emoji)
    return { id: 'tw-' + code, name, category, ratio: 1, src: `stickers/tw/${code}.svg` }
  }),
)

/** Orden de las pestañas: primero los dibujos, luego los emojis. */
const ORDER = ['Moños', 'Corazones', 'Flores', 'Brillitos', 'Washi', 'Marcos', ...TWEMOJI_CATEGORIES]

export const BUILTIN_STICKERS: BuiltinSticker[] = [...ORIGINAL_STICKERS, ...DRAWN_STICKERS, ...TWEMOJI_STICKERS].sort(
  (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category),
)

export const STICKER_CATEGORIES = [...new Set(BUILTIN_STICKERS.map((s) => s.category))]

const BY_BLOB = new Map(BUILTIN_STICKERS.map((s) => ['builtin:' + s.id, s]))

export function builtinSticker(blobId: string): BuiltinSticker | undefined {
  return BY_BLOB.get(blobId)
}

/** URL de imagen para mostrar un sticker incluido en la biblioteca. */
export function stickerDataUrl(s: BuiltinSticker): string {
  if (s.src) return import.meta.env.BASE_URL + s.src
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg ?? '')
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

/**
 * Le pone a un dibujo el borde blanco de sticker troquelado y una sombrita suave.
 * El resultado mide `size` px por lado.
 */
function dieCut(img: CanvasImageSource, size: number): HTMLCanvasElement {
  const r = Math.round(size * 0.035)
  const shadow = Math.round(r * 0.7)
  const pad = r + shadow
  const inner = size - pad * 2

  const sil = document.createElement('canvas')
  sil.width = sil.height = size
  const s = sil.getContext('2d')!
  const steps = 32
  for (const k of [1, 0.5]) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      s.drawImage(img, pad + Math.cos(a) * r * k, pad + Math.sin(a) * r * k, inner, inner)
    }
  }
  s.globalCompositeOperation = 'source-in'
  s.fillStyle = '#ffffff'
  s.fillRect(0, 0, size, size)

  const out = document.createElement('canvas')
  out.width = out.height = size
  const o = out.getContext('2d')!
  o.shadowColor = 'rgba(120, 50, 80, 0.22)'
  o.shadowBlur = shadow
  o.shadowOffsetY = shadow * 0.35
  o.drawImage(sil, 0, 0)
  o.shadowColor = 'transparent'
  o.drawImage(img, pad, pad, inner, inner)
  return out
}

/** Convierte un sticker incluido en imagen (a ~600 px de ancho, nítido al acercar). */
export async function rasterizeBuiltin(s: BuiltinSticker): Promise<ImageBitmap> {
  const w = 600
  if (s.src) {
    // Se le da tamaño explícito al SVG para que se dibuje nítido en cualquier navegador.
    const text = await (await fetch(stickerDataUrl(s))).text()
    const sized = text.replace(/<svg\b/, '<svg width="512" height="512"')
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized))
    return createImageBitmap(dieCut(img, w))
  }
  const img = await loadImage(stickerDataUrl(s))
  const h = Math.round(w / s.ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  return createImageBitmap(canvas)
}
