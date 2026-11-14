import type { DecoEl } from '../types'
import { mix } from '../util'
import { LINE_HEIGHT, fontString, wrapText } from './text'

/** Moño centrado en (0, 0) y de 168 unidades de ancho (mismo dibujo que el logo). */
let paths: { loops: Path2D; tails: Path2D; knot: Path2D; heart: Path2D } | null = null

/** Se crean al primer uso (Path2D solo existe en el navegador). */
function shapes() {
  paths ??= {
    loops: new Path2D('M0 0 C-26 -40 -84 -54 -84 -14 C-84 20 -34 14 0 0 Z M0 0 C26 -40 84 -54 84 -14 C84 20 34 14 0 0 Z'),
    tails: new Path2D('M-6 6 L-34 70 L-18 64 L-8 78 L6 8 Z M6 6 L34 70 L18 64 L8 78 L-6 8 Z'),
    knot: new Path2D('M0 -15 A14 17 0 1 0 0.01 -15 Z'),
    heart: new Path2D('M0 10 C-14 1 -16 -7 -11 -12 C-6 -16 -1 -13 0 -8 C1 -13 6 -16 11 -12 C16 -7 14 1 0 10 Z'),
  }
  return paths
}

/** Espacio libre arriba según la decoración (para que el texto no quede debajo). */
function topRoom(el: DecoEl, unit: number) {
  return el.corner === 'mono' || el.corner === 'cinta' || el.corner === 'chincheta' ? unit * 1.1 : 0
}

export function decoTextLayout(el: DecoEl, measure: (s: string) => number) {
  const unit = Math.min(el.w, el.h) * 0.11
  const pad = Math.max(10, unit)
  const top = pad + topRoom(el, unit)
  const { lines } = wrapText(el.text, Math.max(el.size, el.w - pad * 2), measure)
  return { lines, pad, top }
}

export function drawDeco(ctx: CanvasRenderingContext2D, el: DecoEl) {
  const { w, h } = el
  const unit = Math.min(w, h) * 0.11
  ctx.save()
  ctx.translate(el.x + w / 2, el.y + h / 2)
  if (el.rotation) ctx.rotate(el.rotation)

  // Tarjeta con sombrita suave
  const radius = Math.min(w, h) * 0.06
  ctx.save()
  ctx.shadowColor = 'rgba(120, 50, 80, 0.18)'
  ctx.shadowBlur = unit * 0.9
  ctx.shadowOffsetY = unit * 0.25
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, radius)
  ctx.fillStyle = el.paper
  ctx.fill()
  ctx.restore()

  if (el.corner === 'encaje') {
    // Orilla de encaje abajo
    const n = Math.max(6, Math.round(w / (unit * 1.1)))
    const r = w / n / 2
    ctx.fillStyle = mix(el.paper, '#ffffff', 0.7)
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.arc(-w / 2 + r + i * r * 2, h / 2, r, 0, Math.PI)
      ctx.fill()
    }
    ctx.fillStyle = el.paper
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.arc(-w / 2 + r + i * r * 2, h / 2 + r * 0.35, r * 0.28, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Texto
  ctx.save()
  ctx.beginPath()
  ctx.rect(-w / 2, -h / 2, w, h)
  ctx.clip()
  ctx.font = fontString({ font: el.font, size: el.size, bold: false, italic: false })
  const { lines, pad, top } = decoTextLayout(el, (s) => ctx.measureText(s).width)
  ctx.fillStyle = el.ink
  ctx.textBaseline = 'middle'
  const lh = el.size * LINE_HEIGHT
  lines.forEach((line, i) => ctx.fillText(line, -w / 2 + pad, -h / 2 + top + lh * (i + 0.5)))
  ctx.restore()

  // Decoración de la esquina
  switch (el.corner) {
    case 'mono': {
      const s = (unit * 2.6) / 168
      ctx.save()
      ctx.translate(0, -h / 2 + unit * 0.2)
      ctx.scale(s, s)
      const bow = shapes()
      ctx.fillStyle = el.accent
      ctx.fill(bow.loops)
      ctx.fill(bow.tails)
      ctx.fillStyle = mix(el.accent, '#000000', 0.15)
      ctx.fill(bow.knot)
      ctx.restore()
      break
    }
    case 'cinta': {
      const tw = w * 0.42
      const th = unit * 0.9
      ctx.save()
      ctx.translate(0, -h / 2)
      ctx.rotate(-0.05)
      ctx.globalAlpha = 0.78
      ctx.fillStyle = el.accent
      ctx.fillRect(-tw / 2, -th / 2, tw, th)
      ctx.globalAlpha = 0.35
      ctx.fillStyle = '#ffffff'
      for (let x = -tw / 2; x < tw / 2; x += th * 0.7) ctx.fillRect(x, -th / 2, th * 0.3, th)
      ctx.restore()
      break
    }
    case 'chincheta': {
      const r = unit * 0.42
      ctx.save()
      ctx.translate(0, -h / 2 + unit * 0.6)
      ctx.shadowColor = 'rgba(0,0,0,0.25)'
      ctx.shadowBlur = r * 0.6
      ctx.shadowOffsetY = r * 0.3
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = el.accent
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.beginPath()
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fill()
      ctx.restore()
      break
    }
    case 'corazon': {
      const s = (unit * 1.2) / 24
      ctx.save()
      ctx.translate(w / 2 - unit * 0.9, -h / 2 + unit * 0.9)
      ctx.rotate(0.25)
      ctx.scale(s, s)
      ctx.fillStyle = el.accent
      ctx.fill(shapes().heart)
      ctx.restore()
      break
    }
  }
  ctx.restore()
}
