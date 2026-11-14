import { contentBounds } from './canvas/geom'
import { loadBitmap } from './canvas/images'
import { renderRegion } from './export'
import type { El } from './types'

const PLAIN = { paper: 'liso' as const, color: '#ffffff' }

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear el sticker'))), 'image/png'))
}

/**
 * Convierte lo seleccionado en un sticker (PNG con fondo transparente).
 * Con `border`, le pone el borde blanco de sticker troquelado y una sombrita.
 * Devuelve también su tamaño en unidades del lienzo, para pegarlo del mismo tamaño.
 */
export async function makeSticker(els: El[], border: boolean): Promise<{ blob: Blob; w: number; h: number }> {
  await Promise.all(els.filter((e) => e.type === 'image').map((e) => loadBitmap(e.blobId)))
  const b = contentBounds(els)
  if (!b) throw new Error('No hay nada seleccionado')
  // Unos 700 px del lado más largo: nítido sin pesar demasiado.
  const scale = Math.min(4, 700 / Math.max(b.w, b.h, 1))
  const art = renderRegion(els, PLAIN, b, scale, true)
  if (!border) return { blob: await toBlob(art), w: b.w, h: b.h }

  const r = Math.max(6, Math.round(Math.max(art.width, art.height) * 0.025))
  const shadow = Math.round(r * 0.8)
  const W = art.width + (r + shadow) * 2
  const H = art.height + (r + shadow) * 2

  // Silueta blanca "engordada" r píxeles alrededor del dibujo.
  const sil = document.createElement('canvas')
  sil.width = W
  sil.height = H
  const s = sil.getContext('2d')!
  const steps = 24
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    s.drawImage(art, r + shadow + Math.cos(a) * r, r + shadow + Math.sin(a) * r)
  }
  s.drawImage(art, r + shadow, r + shadow)
  s.globalCompositeOperation = 'source-in'
  s.fillStyle = '#ffffff'
  s.fillRect(0, 0, W, H)

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const o = out.getContext('2d')!
  o.shadowColor = 'rgba(120, 50, 80, 0.22)'
  o.shadowBlur = shadow
  o.shadowOffsetY = shadow * 0.35
  o.drawImage(sil, 0, 0)
  o.shadowColor = 'transparent'
  o.drawImage(art, r + shadow, r + shadow)
  return { blob: await toBlob(out), w: W / scale, h: H / scale }
}
