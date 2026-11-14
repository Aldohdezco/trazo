/** Dibujos vectoriales (SVG) de los stickers incluidos, hechos a mano. */

import type { BuiltinSticker } from './stickers'

export const BOW = (fill: string, knot: string, shine = 'rgba(255,255,255,0.45)') => `
  <path d="M100 92 C74 52 16 38 16 78 C16 112 66 106 100 92Z" fill="${fill}"/>
  <path d="M100 92 C126 52 184 38 184 78 C184 112 134 106 100 92Z" fill="${fill}"/>
  <path d="M88 84 C70 66 40 62 36 78" stroke="${shine}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M112 84 C130 66 160 62 164 78" stroke="${shine}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M94 98 L66 164 L82 158 L92 174 L106 100Z" fill="${fill}"/>
  <path d="M106 98 L134 164 L118 158 L108 174 L94 100Z" fill="${fill}"/>
  <ellipse cx="100" cy="94" rx="15" ry="18" fill="${knot}"/>`

export const HEART = 'M100 172 C30 126 14 92 30 62 C46 32 86 34 100 64 C114 34 154 32 170 62 C186 92 170 126 100 172Z'

export const svg = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}">${body}</svg>`

export function flower(cx: number, cy: number, r: number, petal: string, center: string) {
  return [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="${cx}" cy="${cy - r}" rx="${r * 0.62}" ry="${r * 0.95}" transform="rotate(${a} ${cx} ${cy})" fill="${petal}"/>`)
    .join('') + `<circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="${center}"/>`
}

export function washi(id: string, pattern: string, base: string) {
  const zig = Array.from({ length: 9 }, (_, i) => `${i % 2 ? 6 : 0},${i * 7.5}`).join(' ')
  return svg(
    240,
    60,
    `<defs><pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse">${pattern}</pattern>
      <clipPath id="${id}c"><polygon points="${zig} ${Array.from({ length: 9 }, (_, i) => `${i % 2 ? 234 : 240},${60 - i * 7.5}`).join(' ')}"/></clipPath></defs>
    <g clip-path="url(#${id}c)" opacity="0.88"><rect width="240" height="60" fill="${base}"/><rect width="240" height="60" fill="url(#${id})"/></g>`,
  )
}

export function frameScallop(fill: string, inner: string) {
  const bumps = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    return `<circle cx="${(100 + Math.cos(a) * 82).toFixed(1)}" cy="${(100 + Math.sin(a) * 82).toFixed(1)}" r="13" fill="${fill}"/>`
  }).join('')
  return svg(200, 200, `${bumps}<circle cx="100" cy="100" r="82" fill="${fill}"/><circle cx="100" cy="100" r="66" fill="${inner}"/><circle cx="100" cy="100" r="66" fill="none" stroke="${fill}" stroke-width="2" stroke-dasharray="5 5" opacity="0.7"/>`)
}

export function sparkle(cx: number, cy: number, r: number, fill: string) {
  return `<path d="M${cx} ${cy - r} C${cx + r * 0.12} ${cy - r * 0.12} ${cx + r * 0.12} ${cy - r * 0.12} ${cx + r} ${cy} C${cx + r * 0.12} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.12} ${cx} ${cy + r} C${cx - r * 0.12} ${cy + r * 0.12} ${cx - r * 0.12} ${cy + r * 0.12} ${cx - r} ${cy} C${cx - r * 0.12} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.12} ${cx} ${cy - r}Z" fill="${fill}"/>`
}

/** Los 26 primeros: sus ids están guardados en las notas, no se cambian ni se quitan. */
export const ORIGINAL_STICKERS: BuiltinSticker[] = [
  // Moños
  { id: 'mono-rosa', name: 'Moño rosa', category: 'Moños', ratio: 1, svg: svg(200, 200, BOW('#f29bb5', '#d9668a')) },
  { id: 'mono-rojo', name: 'Moño rojo', category: 'Moños', ratio: 1, svg: svg(200, 200, BOW('#d8455f', '#a92f47')) },
  { id: 'mono-lila', name: 'Moño lila', category: 'Moños', ratio: 1, svg: svg(200, 200, BOW('#c3a6ec', '#9a78d1')) },
  { id: 'mono-crema', name: 'Moño crema', category: 'Moños', ratio: 1, svg: svg(200, 200, BOW('#fff4e6', '#f0d9bd', 'rgba(255,255,255,0.8)') + '<g fill="none" stroke="#e9cfae" stroke-width="2">' + '</g>') },
  {
    id: 'mono-perla',
    name: 'Moño con perla',
    category: 'Moños',
    ratio: 1,
    svg: svg(200, 200, BOW('#f7c3d0', '#f7c3d0') + '<circle cx="100" cy="94" r="15" fill="#fffaf6"/><circle cx="95" cy="89" r="5" fill="#fff"/>'),
  },
  // Corazones
  { id: 'corazon-rosa', name: 'Corazón', category: 'Corazones', ratio: 1, svg: svg(200, 200, `<path d="${HEART}" fill="#f29bb5"/><path d="M54 70 C60 56 76 52 84 60" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.7"/>`) },
  { id: 'corazon-rojo', name: 'Corazón rojo', category: 'Corazones', ratio: 1, svg: svg(200, 200, `<path d="${HEART}" fill="#e0475f"/><path d="M54 70 C60 56 76 52 84 60" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.6"/>`) },
  {
    id: 'corazon-brillo',
    name: 'Corazón brillante',
    category: 'Corazones',
    ratio: 1,
    svg: svg(200, 200, `<path d="${HEART}" fill="#f6c6d2" stroke="#e889a6" stroke-width="6"/>${sparkle(150, 52, 20, '#f2b25c')}${sparkle(48, 150, 12, '#f2b25c')}`),
  },
  {
    id: 'corazones-tres',
    name: 'Corazoncitos',
    category: 'Corazones',
    ratio: 1.4,
    svg: svg(280, 200, `<path d="${HEART}" transform="translate(0 20) scale(0.7)" fill="#f29bb5"/><path d="${HEART}" transform="translate(90 0) scale(0.95)" fill="#e0475f"/><path d="${HEART}" transform="translate(190 60) scale(0.45)" fill="#c3a6ec"/>`),
  },
  // Flores
  { id: 'flor-rosa', name: 'Florecita', category: 'Flores', ratio: 1, svg: svg(200, 200, flower(100, 100, 52, '#f6c6d2', '#f2b25c')) },
  { id: 'flor-blanca', name: 'Margarita', category: 'Flores', ratio: 1, svg: svg(200, 200, flower(100, 100, 52, '#fffaf6', '#f5c542') + '<circle cx="100" cy="100" r="80" fill="none"/>') },
  {
    id: 'ramito',
    name: 'Ramito',
    category: 'Flores',
    ratio: 0.8,
    svg: svg(160, 200, `<path d="M80 190 C78 150 70 120 50 90 M80 190 C82 150 92 118 112 88 M80 190 L80 96" stroke="#7fbf9d" stroke-width="6" fill="none" stroke-linecap="round"/>${flower(50, 72, 22, '#f29bb5', '#fff4e6')}${flower(112, 66, 24, '#c3a6ec', '#fff4e6')}${flower(80, 40, 22, '#f6c6d2', '#f2b25c')}`),
  },
  {
    id: 'cerezas',
    name: 'Cerezas',
    category: 'Flores',
    ratio: 1,
    svg: svg(200, 200, `<path d="M70 140 C80 90 110 50 140 30 M130 140 C130 100 136 60 140 30" stroke="#6b8f4e" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M140 30 C160 20 180 30 182 46 C162 52 148 44 140 30Z" fill="#8cc084"/><circle cx="70" cy="150" r="32" fill="#d8455f"/><circle cx="132" cy="150" r="32" fill="#e0475f"/><circle cx="60" cy="140" r="8" fill="#fff" opacity="0.6"/><circle cx="122" cy="140" r="8" fill="#fff" opacity="0.6"/>`),
  },
  {
    id: 'fresa',
    name: 'Fresita',
    category: 'Flores',
    ratio: 1,
    svg: svg(200, 200, `<path d="M100 186 C40 150 30 90 52 70 C70 56 130 56 148 70 C170 90 160 150 100 186Z" fill="#e8556c"/><path d="M60 66 L80 50 L92 64 L100 44 L108 64 L120 50 L140 66 C120 80 80 80 60 66Z" fill="#7fbf9d"/>${[[78, 100], [104, 96], [126, 104], [88, 128], [114, 130], [100, 156], [70, 124], [132, 128]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="5" fill="#ffe7a3"/>`).join('')}`),
  },
  // Brillitos
  { id: 'brillo', name: 'Brillito', category: 'Brillitos', ratio: 1, svg: svg(200, 200, sparkle(100, 100, 90, '#f2b25c') + sparkle(100, 100, 40, '#ffe7a3')) },
  {
    id: 'brillos',
    name: 'Brillitos',
    category: 'Brillitos',
    ratio: 1,
    svg: svg(200, 200, sparkle(70, 80, 60, '#f29bb5') + sparkle(150, 140, 36, '#c3a6ec') + sparkle(150, 50, 20, '#f2b25c')),
  },
  {
    id: 'estrella',
    name: 'Estrella',
    category: 'Brillitos',
    ratio: 1,
    svg: svg(200, 200, `<path d="M100 14 L124 72 L188 76 L138 116 L154 180 L100 144 L46 180 L62 116 L12 76 L76 72Z" fill="#ffd36e" stroke="#f2b25c" stroke-width="6" stroke-linejoin="round"/><circle cx="80" cy="110" r="6" fill="#5b2c3f"/><circle cx="120" cy="110" r="6" fill="#5b2c3f"/><path d="M88 128 Q100 138 112 128" stroke="#5b2c3f" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="70" cy="126" rx="8" ry="5" fill="#f29bb5" opacity="0.7"/><ellipse cx="130" cy="126" rx="8" ry="5" fill="#f29bb5" opacity="0.7"/>`),
  },
  {
    id: 'perlas',
    name: 'Collar de perlas',
    category: 'Brillitos',
    ratio: 2.4,
    svg: svg(
      240,
      100,
      Array.from({ length: 13 }, (_, i) => {
        const t = i / 12
        const x = 14 + t * 212
        const y = 20 + 4 * 56 * t * (1 - t)
        return `<circle cx="${x}" cy="${y}" r="11" fill="#fffaf6" stroke="#ead9cf" stroke-width="2"/><circle cx="${x - 3.5}" cy="${y - 3.5}" r="3.5" fill="#fff"/>`
      }).join(''),
    ),
  },
  // Washi
  { id: 'washi-vichy', name: 'Washi vichy', category: 'Washi', ratio: 4, svg: washi('wv', '<rect width="10" height="20" fill="#e889a6" opacity="0.35"/><rect width="20" height="10" fill="#e889a6" opacity="0.35"/>', '#fde3ea') },
  { id: 'washi-lunares', name: 'Washi lunares', category: 'Washi', ratio: 4, svg: washi('wl', '<circle cx="5" cy="5" r="3" fill="#fff"/><circle cx="15" cy="15" r="3" fill="#fff"/>', '#c3a6ec') },
  { id: 'washi-rayas', name: 'Washi rayas', category: 'Washi', ratio: 4, svg: washi('wr', '<rect width="10" height="20" fill="#fff" opacity="0.7"/>', '#9fd0b8') },
  { id: 'washi-corazones', name: 'Washi corazones', category: 'Washi', ratio: 4, svg: washi('wc', `<path d="${HEART}" transform="translate(3 3) scale(0.07)" fill="#e0475f"/>`, '#fff4e6') },
  // Marcos
  { id: 'marco-ondas', name: 'Marco de ondas', category: 'Marcos', ratio: 1, svg: frameScallop('#f6c6d2', '#fffaf6') },
  { id: 'marco-lila', name: 'Marco lila', category: 'Marcos', ratio: 1, svg: frameScallop('#d9c8ef', '#fffaf6') },
  {
    id: 'etiqueta',
    name: 'Etiqueta',
    category: 'Marcos',
    ratio: 2,
    svg: svg(240, 120, `<path d="M30 10 H210 L232 60 L210 110 H30 L8 60Z" fill="#fffaf6" stroke="#e889a6" stroke-width="4"/><path d="M40 22 H200 L218 60 L200 98 H40 L22 60Z" fill="none" stroke="#e889a6" stroke-width="2" stroke-dasharray="6 5"/>`),
  },
  {
    id: 'sobre',
    name: 'Sobrecito',
    category: 'Marcos',
    ratio: 1.4,
    svg: svg(280, 200, `<rect x="10" y="30" width="260" height="160" rx="12" fill="#fde3ea" stroke="#e889a6" stroke-width="4"/><path d="M14 36 L140 120 L266 36" fill="none" stroke="#e889a6" stroke-width="4" stroke-linejoin="round"/><path d="${HEART}" transform="translate(118 96) scale(0.22)" fill="#e0475f"/>`),
  },
  {
    id: 'nube',
    name: 'Nubecita',
    category: 'Marcos',
    ratio: 1.6,
    svg: svg(320, 200, `<path d="M70 170 C24 170 16 116 56 104 C50 58 108 42 132 76 C150 30 228 34 232 90 C282 84 300 150 252 170Z" fill="#fff" stroke="#c7def2" stroke-width="6" stroke-linejoin="round"/><circle cx="130" cy="130" r="6" fill="#5b2c3f"/><circle cx="190" cy="130" r="6" fill="#5b2c3f"/><path d="M148 146 Q160 156 172 146" stroke="#5b2c3f" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  },
]

// ───────────────────────── Ayudantes para los dibujos nuevos ─────────────────────────

const INK = '#5b2c3f'

const st = (id: string, name: string, category: string, w: number, h: number, body: string): BuiltinSticker => ({
  id,
  name,
  category,
  ratio: +(w / h).toFixed(4),
  svg: svg(w, h, body),
})

/** Un patrón que se repite (lunares, vichy, rayas…), para rellenar con url(#id). */
function pat(id: string, body: string, size = 20, rotate = 0) {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"${rotate ? ` patternTransform="rotate(${rotate})"` : ''}>${body}</pattern>`
}

function star5(cx: number, cy: number, R: number, r: number, rot = -90) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = ((rot + i * 36) * Math.PI) / 180
    const d = i % 2 ? r : R
    return `${(cx + Math.cos(a) * d).toFixed(1)},${(cy + Math.sin(a) * d).toFixed(1)}`
  }).join(' ')
}

// Moño en piezas, con la misma silueta que BOW.
const BOW_LOOPS = (fill: string, extra = '') =>
  `<path d="M100 92 C74 52 16 38 16 78 C16 112 66 106 100 92Z" fill="${fill}" ${extra}/><path d="M100 92 C126 52 184 38 184 78 C184 112 134 106 100 92Z" fill="${fill}" ${extra}/>`
const BOW_TAILS = (fill: string, extra = '') =>
  `<path d="M94 98 L66 164 L82 158 L92 174 L106 100Z" fill="${fill}" ${extra}/><path d="M106 98 L134 164 L118 158 L108 174 L94 100Z" fill="${fill}" ${extra}/>`
const BOW_SHINE = (c = 'rgba(255,255,255,0.45)') =>
  `<path d="M88 84 C70 66 40 62 36 78" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M112 84 C130 66 160 62 164 78" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`
const BOW_FOLDS = (c: string) =>
  `<path d="M96 90 C80 78 56 74 40 84" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35"/><path d="M104 90 C120 78 144 74 160 84" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35"/>`
const KNOT = (c: string) => `<ellipse cx="100" cy="94" rx="15" ry="18" fill="${c}"/>`

const P = {
  lunares: (c: string, r = 3) => `<circle cx="5" cy="5" r="${r}" fill="${c}"/><circle cx="15" cy="15" r="${r}" fill="${c}"/>`,
  vichy: (c: string) => `<rect width="10" height="20" fill="${c}" opacity="0.35"/><rect width="20" height="10" fill="${c}" opacity="0.35"/>`,
  rayas: (c: string, o = 0.7) => `<rect width="10" height="20" fill="${c}" opacity="${o}"/>`,
  franjas: (c: string, o = 0.7) => `<rect width="20" height="10" fill="${c}" opacity="${o}"/>`,
  corazones: (c: string) => `<path d="${HEART}" transform="translate(3 3) scale(0.07)" fill="${c}"/>`,
  corazones2: (c: string) => `<path d="${HEART}" transform="translate(0 0) scale(0.05)" fill="${c}"/><path d="${HEART}" transform="translate(10 10) scale(0.05)" fill="${c}"/>`,
  estrellas: (c: string) => `<polygon points="${star5(10, 10.5, 6, 2.6)}" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/>`,
  flores: (petal: string, center: string) => flower(10, 10, 4.2, petal, center),
  cuadritos: (c: string) => `<path d="M0 0.5 H20 M0.5 0 V20 M0 10.5 H20 M10.5 0 V20" stroke="${c}" stroke-width="1" opacity="0.6"/>`,
  zigzag: (c: string) => `<path d="M0 14 L5 6 L10 14 L15 6 L20 14" stroke="${c}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`,
  ondas: (c: string) => `<path d="M0 10 Q5 4 10 10 T20 10" stroke="${c}" stroke-width="2.5" fill="none"/>`,
  confeti: () =>
    `<rect x="2" y="3" width="5" height="2" rx="1" fill="#f29bb5" transform="rotate(30 4 4)"/><rect x="12" y="13" width="5" height="2" rx="1" fill="#7fbf9d" transform="rotate(-25 14 14)"/><circle cx="15" cy="5" r="1.6" fill="#a57fdc"/><circle cx="5" cy="15" r="1.6" fill="#f2b25c"/>`,
  cerezas: () =>
    `<path d="M6 13 Q9 5 13 3 M13 13 Q13 7 13 3" stroke="#6b8f4e" stroke-width="1" fill="none"/><circle cx="6" cy="14" r="3" fill="#e0475f"/><circle cx="13" cy="14" r="3" fill="#d8455f"/>`,
  monos: (c: string) => `<g transform="translate(1.5 2) scale(0.085)">${BOW_LOOPS(c)}${BOW_TAILS(c)}</g>`,
  arcoiris: () => ['#f29bb5', '#f7b89a', '#ffe7a3', '#9fd0b8', '#c7def2'].map((c, i) => `<rect y="${i * 4}" width="20" height="4" fill="${c}"/>`).join(''),
}

/** Estrella de puntas redondeadas (el trazo del mismo color las suaviza). */
const roundStar = (cx: number, cy: number, R: number, fill: string, stroke = fill) =>
  `<polygon points="${star5(cx, cy, R, R * 0.5)}" fill="${fill}" stroke="${stroke}" stroke-width="${(R * 0.18).toFixed(1)}" stroke-linejoin="round"/>`

/** Corazón centrado en (x, y) con escala s (1 = 200 px). */
const heartAt = (x: number, y: number, s: number, fill: string, extra = '') =>
  `<path d="${HEART}" transform="translate(${x} ${y}) scale(${s}) translate(-100 -103)" fill="${fill}" ${extra}/>`

const heartShine = (o = 0.7) => `<path d="M54 70 C60 56 76 52 84 60" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity="${o}"/>`

/** Carita kawaii: ojos, sonrisa y chapitas. */
function face(cx: number, cy: number, s = 1, eyes: 'abiertos' | 'felices' | 'guiño' = 'abiertos', ink = INK) {
  const e = 22 * s
  const eye = (x: number, kind: string) =>
    kind === 'abiertos'
      ? `<circle cx="${x}" cy="${cy}" r="${6 * s}" fill="${ink}"/><circle cx="${x + 2 * s}" cy="${cy - 2 * s}" r="${2 * s}" fill="#fff"/>`
      : `<path d="M${x - 7 * s} ${cy + 2 * s} Q${x} ${cy - 7 * s} ${x + 7 * s} ${cy + 2 * s}" stroke="${ink}" stroke-width="${4 * s}" fill="none" stroke-linecap="round"/>`
  return (
    eye(cx - e, eyes === 'guiño' ? 'felices' : eyes) +
    eye(cx + e, eyes === 'guiño' ? 'abiertos' : eyes) +
    `<path d="M${cx - 8 * s} ${cy + 12 * s} Q${cx} ${cy + 20 * s} ${cx + 8 * s} ${cy + 12 * s}" stroke="${ink}" stroke-width="${4 * s}" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="${cx - e - 8 * s}" cy="${cy + 13 * s}" rx="${8 * s}" ry="${5 * s}" fill="#f29bb5" opacity="0.75"/><ellipse cx="${cx + e + 8 * s}" cy="${cy + 13 * s}" rx="${8 * s}" ry="${5 * s}" fill="#f29bb5" opacity="0.75"/>`
  )
}

/** Flor de n pétalos. */
function petals(cx: number, cy: number, r: number, n: number, petal: string, center: string, width = 0.62) {
  return (
    Array.from({ length: n }, (_, i) => `<ellipse cx="${cx}" cy="${cy - r}" rx="${(r * width).toFixed(1)}" ry="${(r * 0.95).toFixed(1)}" transform="rotate(${((360 / n) * i).toFixed(1)} ${cx} ${cy})" fill="${petal}"/>`).join('') +
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.48).toFixed(1)}" fill="${center}"/>`
  )
}

/** Flor de cerezo: cinco pétalos con muesca. */
function sakura(cx: number, cy: number, s: number, petal: string, center = '#e0477a') {
  const p = 'M0 0 C-18 -14 -24 -40 -10 -52 L0 -44 L10 -52 C24 -40 18 -14 0 0Z'
  const rot = [0, 72, 144, 216, 288]
  return (
    `<g transform="translate(${cx} ${cy}) scale(${s})">` +
    rot.map((a) => `<path d="${p}" transform="rotate(${a})" fill="${petal}"/>`).join('') +
    rot.map((a) => `<g transform="rotate(${a + 36})"><path d="M0 0 L0 -17" stroke="${center}" stroke-width="2.5" stroke-linecap="round"/><circle cx="0" cy="-18" r="3" fill="${center}"/></g>`).join('') +
    `<circle r="6" fill="#ffe7a3"/></g>`
  )
}

const leaf = (x: number, y: number, len: number, rot: number, fill = '#9fd0b8', vein = '#7bb89c') =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 C${len * 0.3} ${-len * 0.38} ${len * 0.75} ${-len * 0.32} ${len} 0 C${len * 0.75} ${len * 0.32} ${len * 0.3} ${len * 0.38} 0 0Z" fill="${fill}"/><path d="M3 0 L${len * 0.8} 0" stroke="${vein}" stroke-width="2" stroke-linecap="round"/></g>`

function bowPattern(base: string, knot: string, pattern: string) {
  return `<defs>${pattern}</defs>${BOW_TAILS(base)}${BOW_TAILS('url(#p)')}${BOW_LOOPS(base)}${BOW_LOOPS('url(#p)')}${BOW_FOLDS(knot)}${KNOT(knot)}<ellipse cx="96" cy="88" rx="4" ry="5" fill="#fff" opacity="0.5"/>`
}

/** Moño delgado de listón con colitas largas (estilo coquette). */
function bowLargo(fill: string, dark: string) {
  return (
    `<path d="M95 96 C84 128 108 150 88 188" stroke="${fill}" stroke-width="14" fill="none" stroke-linecap="round"/>` +
    `<path d="M105 96 C116 128 92 152 114 190" stroke="${fill}" stroke-width="14" fill="none" stroke-linecap="round"/>` +
    `<path d="M100 88 C80 46 30 42 30 76 C30 106 76 102 100 88Z" fill="${fill}"/><path d="M100 88 C120 46 170 42 170 76 C170 106 124 102 100 88Z" fill="${fill}"/>` +
    `<path d="M92 86 C78 64 50 60 48 76 C48 90 74 92 92 86Z" fill="${dark}" opacity="0.28"/><path d="M108 86 C122 64 150 60 152 76 C152 90 126 92 108 86Z" fill="${dark}" opacity="0.28"/>` +
    `<rect x="89" y="76" width="22" height="24" rx="9" fill="${dark}"/><path d="M42 70 C46 60 56 56 64 58" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>`
  )
}

/** Moño gordito de lazadas redondas. */
function bowRedondo(fill: string, dark: string) {
  return (
    `<path d="M94 100 Q84 136 70 160 Q86 152 96 166 Q104 132 106 102Z" fill="${fill}"/><path d="M106 100 Q116 136 130 160 Q114 152 104 166 Q96 132 94 102Z" fill="${fill}"/>` +
    `<ellipse cx="58" cy="88" rx="48" ry="36" transform="rotate(-16 58 88)" fill="${fill}"/><ellipse cx="142" cy="88" rx="48" ry="36" transform="rotate(16 142 88)" fill="${fill}"/>` +
    `<path d="M96 94 C80 80 58 76 34 86" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.35"/><path d="M104 94 C120 80 142 76 166 86" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.35"/>` +
    `<ellipse cx="38" cy="70" rx="10" ry="6" transform="rotate(-25 38 70)" fill="#fff" opacity="0.55"/>` +
    `<circle cx="100" cy="94" r="18" fill="${dark}"/><circle cx="95" cy="88" r="5" fill="#fff" opacity="0.5"/>`
  )
}

const lineBow = (c: string, knot: string) =>
  `${BOW_LOOPS('#fffaf6', `stroke="${c}" stroke-width="6" stroke-linejoin="round"`)}${BOW_TAILS('#fffaf6', `stroke="${c}" stroke-width="6" stroke-linejoin="round"`)}<ellipse cx="100" cy="94" rx="15" ry="18" fill="${knot}" stroke="${c}" stroke-width="6"/>`

// ───────────────────────── Moños ─────────────────────────

const MONOS: BuiltinSticker[] = [
  st('mono-menta', 'Moño menta', 'Moños', 200, 200, BOW('#9fd0b8', '#74b394')),
  st('mono-cielo', 'Moño celeste', 'Moños', 200, 200, BOW('#c7def2', '#94bde3')),
  st('mono-mantequilla', 'Moño amarillo', 'Moños', 200, 200, BOW('#ffe7a3', '#f2c45c', 'rgba(255,255,255,0.7)')),
  st('mono-negro', 'Moño negro', 'Moños', 200, 200, BOW('#3a2a33', '#1f151b', 'rgba(255,255,255,0.25)')),
  st('mono-vino', 'Moño vino', 'Moños', 200, 200, BOW('#9e2a43', '#721a30', 'rgba(255,255,255,0.3)')),
  st('mono-fucsia', 'Moño fucsia', 'Moños', 200, 200, BOW('#ec6f9a', '#c94d7b')),
  st('mono-blanco', 'Moño blanco', 'Moños', 200, 200, BOW_TAILS('#fff', 'stroke="#ecd3dc" stroke-width="2"') + BOW_LOOPS('#fff', 'stroke="#ecd3dc" stroke-width="2"') + BOW_FOLDS('#e889a6') + KNOT('#f6dbe4')),
  st('mono-lunares', 'Moño de lunares', 'Moños', 200, 200, bowPattern('#f29bb5', '#d9668a', pat('p', P.lunares('#fff', 3.4)))),
  st('mono-vichy', 'Moño vichy', 'Moños', 200, 200, bowPattern('#fffaf6', '#e889a6', pat('p', P.vichy('#e889a6')))),
  st('mono-rayas', 'Moño de rayas', 'Moños', 200, 200, bowPattern('#d9c8ef', '#9a78d1', pat('p', P.rayas('#fff'), 20, 35))),
  st('mono-corazones', 'Moño de corazones', 'Moños', 200, 200, bowPattern('#fff4e6', '#e0475f', pat('p', P.corazones('#e0475f')))),
  st('mono-largo-rosa', 'Moño de listón rosa', 'Moños', 200, 200, bowLargo('#f6c6d2', '#e889a6')),
  st('mono-largo-negro', 'Moño de listón negro', 'Moños', 200, 200, bowLargo('#3a2a33', '#140c11')),
  st('mono-largo-rojo', 'Moño de listón rojo', 'Moños', 200, 200, bowLargo('#e0475f', '#a92f47')),
  st('mono-gordito-rosa', 'Moño gordito', 'Moños', 200, 200, bowRedondo('#f29bb5', '#d9668a')),
  st('mono-gordito-lila', 'Moño gordito lila', 'Moños', 200, 200, bowRedondo('#c3a6ec', '#9a78d1')),
  st('mono-gordito-menta', 'Moño gordito menta', 'Moños', 200, 200, bowRedondo('#9fd0b8', '#6eae8f')),
  st(
    'mono-doble',
    'Moño doble',
    'Moños',
    200,
    200,
    `<g transform="translate(100 92) scale(1.04) translate(-100 -92)">${BOW('#f29bb5', '#d9668a')}</g><g transform="translate(100 96) scale(0.6) translate(-100 -94)">${BOW('#fff4e6', '#f6c6d2', 'rgba(255,255,255,0.8)')}</g>`,
  ),
  st(
    'mono-doble-lila',
    'Moño doble lila',
    'Moños',
    200,
    200,
    `<g transform="translate(100 92) scale(1.04) translate(-100 -92)">${BOW('#c3a6ec', '#9a78d1')}</g><g transform="translate(100 96) scale(0.6) translate(-100 -94)">${BOW('#f6c6d2', '#e889a6')}</g>`,
  ),
  st('mono-contorno', 'Moño de línea', 'Moños', 200, 200, lineBow('#e0475f', '#fffaf6')),
  st('mono-contorno-negro', 'Moño de línea negro', 'Moños', 200, 200, lineBow('#3a2a33', '#3a2a33')),
  st('mono-corazon', 'Moño con corazón', 'Moños', 200, 200, BOW('#f6c6d2', '#f6c6d2') + heartAt(100, 95, 0.24, '#e0475f')),
  st(
    'mono-perlitas',
    'Moño con perlitas',
    'Moños',
    200,
    200,
    BOW('#fde3ea', '#f29bb5', 'rgba(255,255,255,0.8)') +
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * Math.PI
        return `<circle cx="${(100 + Math.cos(a) * 34).toFixed(1)}" cy="${(108 + Math.sin(a) * 30).toFixed(1)}" r="6" fill="#fffaf6" stroke="#ead9cf" stroke-width="1.5"/>`
      }).join('') +
      `<circle cx="100" cy="94" r="13" fill="#fffaf6"/><circle cx="96" cy="90" r="4" fill="#fff"/>`,
  ),
  st(
    'mono-trio',
    'Tres moñitos',
    'Moños',
    300,
    110,
    [
      ['#f29bb5', '#d9668a'],
      ['#c3a6ec', '#9a78d1'],
      ['#9fd0b8', '#74b394'],
    ]
      .map(([c, k], i) => `<g transform="translate(${i * 100} 4) scale(0.5)">${BOW(c, k)}</g>`)
      .join(''),
  ),
  st('mono-encaje', 'Moño con encaje', 'Moños', 200, 200, BOW('#f29bb5', '#d9668a') + BOW_LOOPS('none', 'stroke="#fff" stroke-width="6" stroke-dasharray="0 10" stroke-linecap="round"') + KNOT('#d9668a')),
  st(
    'mono-terciopelo',
    'Moño de terciopelo',
    'Moños',
    200,
    200,
    `<defs><radialGradient id="g" cx="0.45" cy="0.35" r="0.75"><stop offset="0" stop-color="#cf4a68"/><stop offset="1" stop-color="#6e1830"/></radialGradient></defs>${BOW_TAILS('url(#g)')}${BOW_LOOPS('url(#g)')}${BOW_SHINE('rgba(255,255,255,0.22)')}<ellipse cx="100" cy="94" rx="15" ry="18" fill="#5a1226"/>`,
  ),
  st(
    'mono-satin',
    'Moño de satín',
    'Moños',
    200,
    200,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde3ea"/><stop offset="0.5" stop-color="#f6b3c6"/><stop offset="1" stop-color="#e889a6"/></linearGradient></defs>${BOW_TAILS('url(#g)')}${BOW_LOOPS('url(#g)')}${BOW_SHINE('rgba(255,255,255,0.75)')}${BOW_FOLDS('#c94d7b')}${KNOT('#e889a6')}`,
  ),
  st(
    'mono-costura',
    'Moño con costura',
    'Moños',
    200,
    200,
    BOW('#c7def2', '#94bde3', 'rgba(255,255,255,0.6)') + `<g transform="translate(100 88) scale(0.8) translate(-100 -88)">${BOW_LOOPS('none', 'stroke="#fff" stroke-width="3.5" stroke-dasharray="7 6" stroke-linecap="round"')}</g>` + KNOT('#94bde3'),
  ),
  st(
    'mono-pinza',
    'Pasador con moño',
    'Moños',
    200,
    200,
    `<rect x="24" y="86" width="152" height="16" rx="8" fill="#e6b35a"/><rect x="30" y="89" width="140" height="4" rx="2" fill="#fff" opacity="0.5"/>` +
      `<g transform="translate(100 94) scale(0.8) translate(-100 -94)">${BOW('#f29bb5', '#d9668a')}</g>`,
  ),
]

// ───────────────────────── Corazones ─────────────────────────

const plainHeart = (fill: string, shine = 0.7, stroke = '') => `<path d="${HEART}" fill="${fill}" ${stroke}/>${heartShine(shine)}`

const heartPattern = (base: string, edge: string, pattern: string) =>
  `<defs>${pattern}</defs><path d="${HEART}" fill="${base}"/><path d="${HEART}" fill="url(#p)"/><path d="${HEART}" fill="none" stroke="${edge}" stroke-width="6" stroke-linejoin="round"/>${heartShine(0.6)}`

const PIXEL_HEART = ['.XX...XX.', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....']

const WING = 'M70 96 C44 64 8 60 6 84 C4 96 16 102 26 102 C10 108 10 126 28 128 C18 136 28 150 46 140 C58 134 66 120 70 110Z'

const CORAZONES: BuiltinSticker[] = [
  st('corazon-lila', 'Corazón lila', 'Corazones', 200, 200, plainHeart('#c3a6ec')),
  st('corazon-menta', 'Corazón menta', 'Corazones', 200, 200, plainHeart('#9fd0b8')),
  st('corazon-amarillo', 'Corazón amarillo', 'Corazones', 200, 200, plainHeart('#ffd36e', 0.8)),
  st('corazon-celeste', 'Corazón celeste', 'Corazones', 200, 200, plainHeart('#a9cdee', 0.8)),
  st('corazon-crema', 'Corazón crema', 'Corazones', 200, 200, plainHeart('#fff4e6', 1, 'stroke="#f0d9bd" stroke-width="4"')),
  st('corazon-contorno', 'Corazón de línea', 'Corazones', 200, 200, `<path d="${HEART}" fill="#fffaf6" stroke="#e0475f" stroke-width="9" stroke-linejoin="round"/>`),
  st(
    'corazon-doble-linea',
    'Corazón doble línea',
    'Corazones',
    200,
    200,
    `<path d="${HEART}" fill="#fde3ea" stroke="#f29bb5" stroke-width="8" stroke-linejoin="round"/>${heartAt(100, 104, 0.7, 'none', 'stroke="#e0475f" stroke-width="8" stroke-linejoin="round"')}`,
  ),
  st('corazon-carita', 'Corazón con carita', 'Corazones', 200, 200, `<path d="${HEART}" fill="#f6c6d2"/>${heartShine(0.8)}${face(100, 98, 1, 'abiertos')}`),
  st('corazon-feliz', 'Corazón feliz', 'Corazones', 200, 200, `<path d="${HEART}" fill="#e0475f"/>${heartShine(0.5)}${face(100, 98, 1, 'felices', '#5a1226')}`),
  st('corazon-guino', 'Corazón guiñando', 'Corazones', 200, 200, `<path d="${HEART}" fill="#c3a6ec"/>${heartShine(0.6)}${face(100, 98, 1, 'guiño')}`),
  st('corazon-vichy', 'Corazón vichy', 'Corazones', 200, 200, heartPattern('#fffaf6', '#e889a6', pat('p', P.vichy('#e889a6')))),
  st('corazon-lunares', 'Corazón de lunares', 'Corazones', 200, 200, heartPattern('#e0475f', '#e0475f', pat('p', P.lunares('#fff', 3.6)))),
  st('corazon-rayas', 'Corazón de rayas', 'Corazones', 200, 200, heartPattern('#fffaf6', '#f29bb5', pat('p', P.rayas('#f29bb5', 0.8), 20, 30))),
  st(
    'corazon-arcoiris',
    'Corazón arcoíris',
    'Corazones',
    200,
    200,
    `<defs><clipPath id="c"><path d="${HEART}"/></clipPath></defs><g clip-path="url(#c)">${['#f29bb5', '#f7b89a', '#ffe7a3', '#9fd0b8', '#c7def2', '#c3a6ec'].map((c, i) => `<rect x="0" y="${34 + i * 23}" width="200" height="24" fill="${c}"/>`).join('')}</g>${heartShine(0.7)}`,
  ),
  st(
    'corazon-alas',
    'Corazón con alitas',
    'Corazones',
    260,
    200,
    `<path d="${WING}" transform="translate(4 0)" fill="#fff" stroke="#ead3dc" stroke-width="3" stroke-linejoin="round"/><path d="${WING}" transform="translate(256 0) scale(-1 1)" fill="#fff" stroke="#ead3dc" stroke-width="3" stroke-linejoin="round"/>` +
      `<g transform="translate(30 0)">${heartAt(100, 104, 0.78, '#f29bb5')}<path d="M70 78 C74 68 84 64 90 68" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"/></g>`,
  ),
  st('corazon-mono', 'Corazón con moño', 'Corazones', 200, 200, `<path d="${HEART}" fill="#e0475f"/>${heartShine(0.5)}<g transform="translate(46 26) scale(0.42)">${BOW('#f6c6d2', '#e889a6')}</g>`),
  st(
    'corazon-carta',
    'Carta de amor',
    'Corazones',
    240,
    200,
    `<rect x="44" y="30" width="152" height="120" rx="8" fill="#fffaf6" stroke="#ead3dc" stroke-width="3"/>${heartAt(120, 76, 0.32, '#e0475f')}` +
      `<path d="M66 108 H174 M66 124 H150" stroke="#f6c6d2" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M20 96 L120 160 L220 96 V184 Q220 190 214 190 H26 Q20 190 20 184Z" fill="#f6c6d2"/><path d="M20 184 L96 136 M220 184 L144 136" stroke="#e889a6" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M20 96 L120 160 L220 96" fill="none" stroke="#e889a6" stroke-width="3" stroke-linejoin="round"/>`,
  ),
  st(
    'corazon-globo',
    'Globo de corazón',
    'Corazones',
    160,
    220,
    `<path d="M80 130 C70 150 92 162 78 184 C70 196 82 206 78 216" stroke="#c9a0b0" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M80 126 L72 138 H88Z" fill="#d9668a"/>` +
      `${heartAt(80, 70, 0.72, '#f29bb5')}<ellipse cx="50" cy="48" rx="8" ry="13" transform="rotate(30 50 48)" fill="#fff" opacity="0.6"/>`,
  ),
  st(
    'corazon-candado',
    'Candado de corazón',
    'Corazones',
    200,
    220,
    `<path d="M62 100 V68 A38 38 0 0 1 138 68 V100" stroke="#e6b35a" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M62 100 V68 A38 38 0 0 1 138 68" stroke="#ffe7a3" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `${heartAt(100, 140, 0.82, '#f29bb5')}<circle cx="100" cy="136" r="10" fill="${INK}"/><path d="M100 140 L94 162 H106Z" fill="${INK}"/><path d="M60 112 C64 102 74 98 80 102" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"/>`,
  ),
  st(
    'corazon-flecha',
    'Corazón flechado',
    'Corazones',
    220,
    200,
    `<path d="M22 172 L198 32" stroke="#d1a35a" stroke-width="6" stroke-linecap="round"/><path d="M22 172 L14 160 M22 172 L34 176 M34 162 L26 150 M34 162 L46 166" stroke="#f29bb5" stroke-width="6" stroke-linecap="round"/>` +
      `<g transform="translate(10 0)">${heartAt(100, 104, 0.82, '#e0475f')}</g><path d="M150 72 L198 32 L190 54 M198 32 L176 36" stroke="#d1a35a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M66 76 C70 66 80 62 86 66" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.6"/>`,
  ),
  st(
    'corazon-galleta',
    'Galleta de corazón',
    'Corazones',
    200,
    200,
    `<path d="${HEART}" fill="#e3ad78"/>${heartAt(100, 100, 0.8, '#f6c6d2')}` +
      [
        [70, 80, 20, '#fff'],
        [118, 72, -30, '#9fd0b8'],
        [140, 96, 60, '#ffe7a3'],
        [92, 112, -10, '#c3a6ec'],
        [120, 124, 40, '#fff'],
        [76, 104, 80, '#ffe7a3'],
        [100, 140, -50, '#9fd0b8'],
        [100, 88, 10, '#e0475f'],
      ]
        .map(([x, y, r, c]) => `<rect x="${+x - 6}" y="${+y - 2}" width="12" height="4.5" rx="2.2" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`)
        .join(''),
  ),
  st(
    'corazon-paleta',
    'Paleta de corazón',
    'Corazones',
    160,
    230,
    `<rect x="74" y="120" width="12" height="104" rx="6" fill="#fffaf6" stroke="#ead9cf" stroke-width="2"/>${heartAt(80, 76, 0.7, '#f29bb5')}` +
      `<path d="M80 108 C46 82 50 46 80 58 C108 44 118 82 80 108" stroke="#fff" stroke-width="5" fill="none" opacity="0.6" stroke-linecap="round"/>` +
      `<path d="M74 136 C60 140 52 132 50 124 C62 122 70 128 74 136Z M86 136 C100 140 108 132 110 124 C98 122 90 128 86 136Z" fill="#c3a6ec"/>`,
  ),
  st(
    'corazon-pixel',
    'Corazón pixel',
    'Corazones',
    200,
    180,
    PIXEL_HEART.flatMap((row, y) =>
      [...row].map((ch, x) => (ch === 'X' ? `<rect x="${10 + x * 20}" y="${10 + y * 20}" width="20" height="20" fill="${(x === 1 && y === 1) || (x === 1 && y === 2) ? '#fde3ea' : y > 4 || x > 6 ? '#e0475f' : '#f29bb5'}"/>` : '')),
    ).join(''),
  ),
  st(
    'corazon-corona',
    'Corazón con corona',
    'Corazones',
    200,
    220,
    `<g transform="translate(0 20)"><path d="${HEART}" fill="#f29bb5"/>${heartShine(0.7)}</g>` +
      `<path d="M64 60 L58 16 L82 38 L100 8 L118 38 L142 16 L136 60Z" fill="#ffd36e" stroke="#e6b35a" stroke-width="4" stroke-linejoin="round"/>` +
      `<circle cx="100" cy="44" r="6" fill="#e0475f"/><circle cx="78" cy="48" r="4" fill="#c3a6ec"/><circle cx="122" cy="48" r="4" fill="#9fd0b8"/>`,
  ),
  st('corazon-flor', 'Corazón con flor', 'Corazones', 200, 200, `<path d="${HEART}" fill="#f6c6d2"/>${heartShine(0.8)}${leaf(140, 140, 30, 30)}${flower(140, 128, 22, '#fffaf6', '#f2b25c')}`),
  st(
    'corazones-enlazados',
    'Corazones enlazados',
    'Corazones',
    260,
    200,
    `${heartAt(96, 104, 0.82, 'none', 'stroke="#f29bb5" stroke-width="12" stroke-linejoin="round"')}${heartAt(164, 104, 0.82, 'none', 'stroke="#e0475f" stroke-width="12" stroke-linejoin="round"')}`,
  ),
  st(
    'corazones-guirnalda',
    'Guirnalda de corazones',
    'Corazones',
    300,
    120,
    `<path d="M6 16 Q150 70 294 16" stroke="#c9a0b0" stroke-width="3" fill="none"/>` +
      [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const t = (i + 0.5) / 7
        const x = 6 + t * 288
        const y = 16 + 4 * 27 * t * (1 - t)
        return `<path d="M${x} ${y} V${y + 10}" stroke="#c9a0b0" stroke-width="2"/>${heartAt(x, y + 30, 0.2, ['#f29bb5', '#e0475f', '#c3a6ec', '#f6c6d2'][i % 4])}`
      }).join(''),
  ),
  st(
    'corazon-brilloso',
    'Corazón de cristal',
    'Corazones',
    200,
    200,
    `<defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffe0e8"/><stop offset="0.55" stop-color="#f29bb5"/><stop offset="1" stop-color="#d63a5a"/></radialGradient></defs><path d="${HEART}" fill="url(#g)"/>` +
      `<ellipse cx="62" cy="70" rx="16" ry="10" transform="rotate(-35 62 70)" fill="#fff" opacity="0.85"/><circle cx="84" cy="56" r="5" fill="#fff" opacity="0.8"/><path d="M150 112 C142 128 130 140 116 150" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.4"/>`,
  ),
  st(
    'corazon-costura',
    'Corazón de tela',
    'Corazones',
    200,
    200,
    `<path d="${HEART}" fill="#f6c6d2"/>${heartAt(100, 102, 0.84, 'none', 'stroke="#fff" stroke-width="6" stroke-dasharray="10 8" stroke-linecap="round"')}<circle cx="100" cy="102" r="14" fill="#c3a6ec"/><circle cx="95" cy="98" r="2.5" fill="#fff"/><circle cx="105" cy="98" r="2.5" fill="#fff"/><circle cx="95" cy="108" r="2.5" fill="#fff"/><circle cx="105" cy="108" r="2.5" fill="#fff"/>`,
  ),
  st(
    'corazones-burbuja',
    'Corazones flotando',
    'Corazones',
    200,
    220,
    `${heartAt(70, 160, 0.5, '#f29bb5')}${heartAt(140, 110, 0.36, '#c3a6ec')}${heartAt(80, 70, 0.28, '#e0475f')}${heartAt(138, 36, 0.18, '#f6c6d2')}${sparkle(150, 170, 12, '#f2b25c')}${sparkle(40, 40, 8, '#f2b25c')}`,
  ),
]

// ───────────────────────── Flores ─────────────────────────

const tulip = (fill: string, dark: string) =>
  `<path d="M100 120 C98 150 100 170 100 194" stroke="#7fbf9d" stroke-width="7" fill="none" stroke-linecap="round"/>` +
  `<path d="M100 186 C70 176 56 150 58 124 C80 134 94 156 100 186Z" fill="#9fd0b8"/><path d="M100 176 C126 168 142 146 142 126 C122 134 106 152 100 176Z" fill="#8cc4a8"/>` +
  `<path d="M64 46 C58 92 74 126 100 126 C126 126 142 92 136 46 L118 70 L100 40 L82 70Z" fill="${fill}"/>` +
  `<path d="M82 70 C86 92 92 110 100 124 C108 110 114 92 118 70" stroke="${dark}" stroke-width="3" fill="none" opacity="0.5"/><path d="M74 66 C72 82 76 98 84 108" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.5"/>`

const rose = (fill: string, dark: string) =>
  `${leaf(100, 140, 60, 150)}${leaf(100, 140, 60, 30)}<circle cx="100" cy="94" r="58" fill="${fill}"/>` +
  `<path d="M100 94 m-7 0 a7 7 0 1 1 14 0 a14 14 0 1 1 -28 0 a22 22 0 1 1 44 0 a31 31 0 1 1 -62 0 a40 40 0 1 1 80 0" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.75"/>` +
  `<path d="M62 64 C68 54 78 48 88 46" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.45"/>`

const potted = (pot: string, rim: string, petal: string, center: string) =>
  `<path d="M100 150 V90" stroke="#7fbf9d" stroke-width="6" stroke-linecap="round"/>${leaf(100, 130, 36, -30)}${leaf(100, 120, 34, 210)}${petals(100, 70, 32, 6, petal, center, 0.58)}` +
  `<path d="M58 160 H142 L132 196 H68Z" fill="${pot}"/><rect x="50" y="146" width="100" height="20" rx="6" fill="${rim}"/>${heartAt(100, 180, 0.08, '#fff')}`

const FLORES: BuiltinSticker[] = [
  st('flor-lila', 'Florecita lila', 'Flores', 200, 200, flower(100, 100, 52, '#d9c8ef', '#f2b25c')),
  st('flor-celeste', 'Florecita celeste', 'Flores', 200, 200, flower(100, 100, 52, '#c7def2', '#fffaf6')),
  st('flor-amarilla', 'Florecita amarilla', 'Flores', 200, 200, flower(100, 100, 52, '#ffe7a3', '#f29bb5')),
  st('flor-durazno', 'Florecita durazno', 'Flores', 200, 200, flower(100, 100, 52, '#f7c0a6', '#fff4e6')),
  st('flor-seis', 'Flor redondita', 'Flores', 200, 200, petals(100, 100, 46, 6, '#f29bb5', '#fff4e6', 0.66) + `<circle cx="92" cy="92" r="6" fill="#fff" opacity="0.7"/>`),
  st('flor-ocho', 'Flor de ocho pétalos', 'Flores', 200, 200, petals(100, 100, 48, 8, '#c3a6ec', '#ffe7a3', 0.42) + petals(100, 100, 27, 8, '#e5d8f6', '#ffe7a3', 0.42)),
  st('margarita-larga', 'Margarita grande', 'Flores', 200, 200, petals(100, 100, 48, 16, '#fffaf6', '#f5c542', 0.24) + Array.from({ length: 16 }, (_, i) => `<line x1="100" y1="100" x2="100" y2="62" transform="rotate(${i * 22.5} 100 100)" stroke="#f0e2d6" stroke-width="1.5"/>`).join('') + `<circle cx="100" cy="100" r="24" fill="#f5c542"/><circle cx="94" cy="94" r="6" fill="#fff" opacity="0.5"/>`),
  st('tulipan-rosa', 'Tulipán rosa', 'Flores', 200, 200, tulip('#f29bb5', '#d9668a')),
  st('tulipan-lila', 'Tulipán lila', 'Flores', 200, 200, tulip('#c3a6ec', '#9a78d1')),
  st('tulipan-amarillo', 'Tulipán amarillo', 'Flores', 200, 200, tulip('#ffd36e', '#e6b35a')),
  st('rosa-rosa', 'Rosa', 'Flores', 200, 200, rose('#f6c6d2', '#e0477a')),
  st('rosa-roja', 'Rosa roja', 'Flores', 200, 200, rose('#e0475f', '#a92f47')),
  st('sakura', 'Flor de cerezo', 'Flores', 200, 200, sakura(100, 104, 1.55, '#f9cdd9')),
  st(
    'sakura-rama',
    'Ramita de cerezo',
    'Flores',
    280,
    200,
    `<path d="M10 170 C80 160 120 120 180 100 C220 86 250 60 270 40 M120 130 C130 100 150 80 160 60" stroke="#9b6b5a" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      `${sakura(90, 140, 0.7, '#f9cdd9')}${sakura(170, 70, 0.6, '#f6b8c9')}${sakura(230, 70, 0.55, '#f9cdd9')}<circle cx="140" cy="122" r="9" fill="#f6b8c9"/><circle cx="262" cy="40" r="8" fill="#f6b8c9"/>`,
  ),
  st('hojita', 'Hojita', 'Flores', 200, 200, `<path d="M36 170 C30 92 92 28 172 30 C176 108 116 172 36 170Z" fill="#9fd0b8"/><path d="M40 166 C80 126 120 82 164 38" stroke="#74b394" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 124 L66 92 M104 98 L94 62 M80 124 L114 132 M104 98 L140 104" stroke="#74b394" stroke-width="3.5" stroke-linecap="round"/>`),
  st(
    'ramita',
    'Ramita de hojas',
    'Flores',
    160,
    220,
    `<path d="M80 214 C78 160 82 100 80 20" stroke="#7fbf9d" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      [180, 150, 120, 90, 60].map((y, i) => leaf(80, y, 50 - i * 5, i % 2 ? -40 : 220) + leaf(80, y - 14, 46 - i * 5, i % 2 ? 220 : -40)).join('') +
      `<ellipse cx="80" cy="22" rx="8" ry="14" fill="#9fd0b8"/>`,
  ),
  st(
    'ramo-envuelto',
    'Ramo de flores',
    'Flores',
    200,
    240,
    `${leaf(100, 110, 60, 200)}${leaf(100, 110, 60, -20)}${leaf(100, 100, 50, 250)}` +
      `${flower(62, 82, 26, '#f29bb5', '#fff4e6')}${flower(138, 82, 26, '#c3a6ec', '#fff4e6')}${flower(100, 52, 28, '#f6c6d2', '#f2b25c')}${flower(100, 104, 20, '#fffaf6', '#f5c542')}` +
      `<path d="M50 112 L150 112 L112 230 H88Z" fill="#fff4e6" stroke="#ead9cf" stroke-width="3" stroke-linejoin="round"/><path d="M50 112 L100 230 L150 112" fill="none" stroke="#f6c6d2" stroke-width="3" stroke-dasharray="6 6"/>` +
      `<g transform="translate(100 176) scale(0.4) translate(-100 -94)">${BOW('#f29bb5', '#d9668a')}</g>`,
  ),
  st('maceta-rosa', 'Macetita', 'Flores', 200, 200, potted('#f6c6d2', '#f29bb5', '#fffaf6', '#f5c542')),
  st('maceta-menta', 'Macetita menta', 'Flores', 200, 200, potted('#9fd0b8', '#7fbf9d', '#f29bb5', '#fff4e6')),
  st('girasol', 'Girasol', 'Flores', 200, 200, petals(100, 100, 50, 18, '#ffd36e', '#8a5a3c', 0.3) + petals(100, 100, 40, 18, '#f5c542', '#8a5a3c', 0.3) + `<circle cx="100" cy="100" r="30" fill="#8a5a3c"/>` + `<circle cx="100" cy="100" r="30" fill="url(#p)"/><defs>${pat('p', '<circle cx="3" cy="3" r="1.6" fill="#6b4029"/>', 7)}</defs>`),
  st(
    'lavanda',
    'Lavanda',
    'Flores',
    160,
    220,
    [
      [56, -10],
      [80, 0],
      [104, 10],
    ]
      .map(
        ([x, r]) =>
          `<g transform="rotate(${r} 80 200)"><path d="M${x} 200 C${x} 140 80 120 ${x} 40" stroke="#8cc4a8" stroke-width="4" fill="none"/>` +
          Array.from({ length: 8 }, (_, i) => `<ellipse cx="${x + (i % 2 ? 6 : -6)}" cy="${44 + i * 10}" rx="7" ry="9" fill="${i % 3 ? '#b799e6' : '#c3a6ec'}"/>`).join('') +
          `</g>`,
      )
      .join('') + `<g transform="translate(80 170) scale(0.36) translate(-100 -94)">${BOW('#f6c6d2', '#e889a6')}</g>`,
  ),
  st(
    'nomeolvides',
    'Nomeolvides',
    'Flores',
    200,
    200,
    `${leaf(100, 110, 60, 140)}${leaf(100, 110, 60, 40)}` +
      [
        [70, 80, 24],
        [130, 76, 22],
        [100, 120, 26],
        [58, 132, 18],
        [146, 128, 18],
        [104, 54, 16],
      ]
        .map(([x, y, r]) => petals(x, y, r, 5, '#a9cdee', '#ffe7a3', 0.75))
        .join(''),
  ),
  st(
    'trebol',
    'Trébol',
    'Flores',
    200,
    200,
    `<path d="M100 100 C104 140 118 166 140 186" stroke="#74b394" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      [0, 90, 180, 270].map((a) => `<g transform="rotate(${a + 45} 100 100)">${heartAt(100, 62, 0.34, '#9fd0b8')}</g>`).join('') +
      `<circle cx="100" cy="100" r="8" fill="#7fbf9d"/>`,
  ),
  st(
    'hongo',
    'Honguito',
    'Flores',
    200,
    200,
    `<path d="M72 112 C68 150 70 176 80 186 H120 C130 176 132 150 128 112Z" fill="#fff4e6" stroke="#ead9cf" stroke-width="3"/>${face(100, 146, 0.6)}` +
      `<path d="M20 116 C20 50 64 18 100 18 C136 18 180 50 180 116 C140 126 60 126 20 116Z" fill="#e0475f"/>` +
      `<circle cx="64" cy="62" r="13" fill="#fff"/><circle cx="118" cy="44" r="10" fill="#fff"/><circle cx="146" cy="86" r="12" fill="#fff"/><circle cx="96" cy="92" r="9" fill="#fff"/><circle cx="40" cy="98" r="7" fill="#fff"/>`,
  ),
  st(
    'corona-flores',
    'Corona de flores',
    'Flores',
    200,
    200,
    `<circle cx="100" cy="100" r="68" fill="none" stroke="#9fd0b8" stroke-width="6"/>` +
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 360
        return `<g transform="rotate(${a} 100 100)">${leaf(100, 32, 22, i % 2 ? 20 : 160)}</g>`
      }).join('') +
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2
        return flower(+(100 + Math.cos(a) * 68).toFixed(1), +(100 + Math.sin(a) * 68).toFixed(1), 15, ['#f29bb5', '#fffaf6', '#c3a6ec'][i % 3], '#f2b25c')
      }).join(''),
  ),
  st('flor-carita', 'Florecita feliz', 'Flores', 200, 200, flower(100, 100, 50, '#f6c6d2', '#ffe7a3') + `<circle cx="100" cy="100" r="32" fill="#ffe7a3"/>${face(100, 96, 0.75, 'felices')}`),
  st(
    'flor-tallo',
    'Flor con tallo',
    'Flores',
    140,
    220,
    `<path d="M70 210 C66 160 76 120 70 76" stroke="#7fbf9d" stroke-width="6" fill="none" stroke-linecap="round"/>${leaf(69, 170, 44, -35)}${leaf(71, 140, 40, 215)}${petals(70, 56, 38, 6, '#c3a6ec', '#ffe7a3', 0.6)}`,
  ),
  st(
    'campanitas',
    'Campanitas',
    'Flores',
    180,
    220,
    `<path d="M40 210 C60 120 90 60 150 40" stroke="#7fbf9d" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M36 214 C10 150 30 90 60 70 C60 120 56 170 36 214Z" fill="#9fd0b8"/>` +
      [
        [70, 104],
        [96, 76],
        [124, 56],
        [146, 46],
      ]
        .map(([x, y], i) => {
          const s = 1 - i * 0.12
          return `<path d="M${x} ${y} V${y + 14 * s}" stroke="#7fbf9d" stroke-width="3"/><path d="M${x - 14 * s} ${y + 34 * s} C${x - 16 * s} ${y + 16 * s} ${x - 10 * s} ${y + 12 * s} ${x} ${y + 12 * s} C${x + 10 * s} ${y + 12 * s} ${x + 16 * s} ${y + 16 * s} ${x + 14 * s} ${y + 34 * s} L${x + 8 * s} ${y + 30 * s} L${x + 3 * s} ${y + 35 * s} L${x - 3 * s} ${y + 30 * s} L${x - 8 * s} ${y + 35 * s}Z" fill="#fffaf6" stroke="#e6dce8" stroke-width="2"/>`
        })
        .join(''),
  ),
  st(
    'limon',
    'Limoncito',
    'Flores',
    200,
    200,
    `${leaf(118, 40, 50, -30)}<ellipse cx="100" cy="110" rx="72" ry="58" transform="rotate(-20 100 110)" fill="#ffe27a"/><circle cx="168" cy="84" r="8" fill="#ffe27a"/><circle cx="32" cy="136" r="8" fill="#ffe27a"/>` +
      `<ellipse cx="74" cy="92" rx="18" ry="9" transform="rotate(-30 74 92)" fill="#fff" opacity="0.6"/>${face(104, 112, 0.8)}`,
  ),
]

// ───────────────────────── Brillitos ─────────────────────────

const moon = (fill: string, extra = '') =>
  `<defs><mask id="m"><rect width="200" height="200" fill="#fff"/><circle cx="134" cy="76" r="64" fill="#000"/></mask></defs><circle cx="96" cy="106" r="78" fill="${fill}" mask="url(#m)"/>${extra}`

const BRILLITOS: BuiltinSticker[] = [
  st('brillo-rosa', 'Brillito rosa', 'Brillitos', 200, 200, sparkle(100, 100, 90, '#f29bb5') + sparkle(100, 100, 40, '#fde3ea')),
  st('brillo-lila', 'Brillito lila', 'Brillitos', 200, 200, sparkle(100, 100, 90, '#c3a6ec') + sparkle(100, 100, 40, '#efe6fb')),
  st('brillo-menta', 'Brillito menta', 'Brillitos', 200, 200, sparkle(100, 100, 90, '#9fd0b8') + sparkle(100, 100, 40, '#e3f4ec')),
  st('brillo-celeste', 'Brillito celeste', 'Brillitos', 200, 200, sparkle(100, 100, 90, '#a9cdee') + sparkle(100, 100, 40, '#eaf3fb')),
  st('estrella-rosa', 'Estrellita rosa', 'Brillitos', 200, 200, roundStar(100, 106, 84, '#f6c6d2') + `<path d="M62 84 L78 82" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.7"/>`),
  st('estrella-lila', 'Estrellita lila', 'Brillitos', 200, 200, roundStar(100, 106, 84, '#c3a6ec') + `<path d="M62 84 L78 82" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.6"/>`),
  st('estrella-menta', 'Estrellita menta', 'Brillitos', 200, 200, roundStar(100, 106, 84, '#9fd0b8') + `<path d="M62 84 L78 82" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.6"/>`),
  st('estrella-dorada', 'Estrella dorada', 'Brillitos', 200, 200, roundStar(100, 106, 84, '#ffd36e', '#f2b25c') + roundStar(100, 108, 44, '#ffe7a3')),
  st('estrella-contorno', 'Estrella de línea', 'Brillitos', 200, 200, `<polygon points="${star5(100, 106, 84, 40)}" fill="#fffaf6" stroke="#f2b25c" stroke-width="9" stroke-linejoin="round"/>`),
  st('estrella-carita', 'Estrellita feliz', 'Brillitos', 200, 200, roundStar(100, 106, 84, '#f6c6d2') + face(100, 110, 0.8, 'felices')),
  st('luna', 'Luna', 'Brillitos', 200, 200, moon('#ffe7a3', `<path d="M52 66 C40 86 38 116 50 138" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>`)),
  st('luna-dormida', 'Luna dormilona', 'Brillitos', 200, 200, moon('#ffd36e', `<path d="M38 112 Q48 120 58 112" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="46" cy="130" rx="8" ry="5" fill="#f29bb5" opacity="0.8"/><path d="M56 144 Q62 148 68 144" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`)),
  st('luna-estrellas', 'Luna y estrellas', 'Brillitos', 200, 200, moon('#c3a6ec', roundStar(150, 120, 20, '#ffe7a3') + roundStar(170, 170, 12, '#ffe7a3') + sparkle(130, 34, 14, '#f29bb5'))),
  st(
    'estrella-fugaz',
    'Estrella fugaz',
    'Brillitos',
    240,
    170,
    [
      ['#f29bb5', 0],
      ['#ffe7a3', 18],
      ['#c3a6ec', 36],
    ]
      .map(([c, d]) => `<path d="M10 ${120 + +d * 0.6} C70 ${100 + +d * 0.6} 120 ${70 + +d * 0.3} 160 ${66 + +d * 0.4}" stroke="${c}" stroke-width="12" fill="none" stroke-linecap="round"/>`)
      .join('') + roundStar(176, 66, 50, '#ffd36e', '#f2b25c') + face(176, 70, 0.55, 'felices'),
  ),
  st(
    'varita',
    'Varita de estrella',
    'Brillitos',
    200,
    200,
    `<path d="M30 180 L112 98" stroke="#d9c8ef" stroke-width="10" stroke-linecap="round"/><path d="M30 180 L112 98" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="6 14" opacity="0.8"/>` +
      roundStar(130, 72, 50, '#ffd36e', '#f2b25c') + `<g transform="translate(100 112) scale(0.3) translate(-100 -94)">${BOW('#f29bb5', '#d9668a')}</g>` + sparkle(180, 140, 14, '#f29bb5') + sparkle(60, 40, 12, '#c3a6ec'),
  ),
  st(
    'diamante',
    'Diamante',
    'Brillitos',
    200,
    180,
    `<path d="M50 20 H150 L190 66 L100 170 L10 66Z" fill="#c7def2"/><path d="M10 66 H190" stroke="#fff" stroke-width="3"/><path d="M50 20 L72 66 L100 20 L128 66 L150 20" fill="#e5f0fa" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M72 66 L100 170 L128 66Z" fill="#d9e9f7"/><path d="M10 66 L100 170 L72 66Z" fill="#a9cdee"/><path d="M190 66 L100 170 L128 66Z" fill="#b8d6f1"/>` +
      `<path d="M50 20 H150 L190 66 L100 170 L10 66Z" fill="none" stroke="#94bde3" stroke-width="4" stroke-linejoin="round"/>${sparkle(160, 30, 14, '#fff')}`,
  ),
  st(
    'perla',
    'Perla',
    'Brillitos',
    200,
    200,
    `<defs><radialGradient id="g" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#fbeef0"/><stop offset="1" stop-color="#e2cdd8"/></radialGradient></defs><circle cx="100" cy="100" r="78" fill="url(#g)"/><ellipse cx="72" cy="70" rx="18" ry="12" transform="rotate(-35 72 70)" fill="#fff"/><circle cx="100" cy="100" r="78" fill="none" stroke="#ead9cf" stroke-width="3"/>`,
  ),
  st(
    'constelacion',
    'Constelación',
    'Brillitos',
    280,
    200,
    `<path d="M30 150 L80 110 L140 130 L180 60 L250 40 M140 130 L210 160" stroke="#c3a6ec" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" fill="none"/>` +
      [
        [30, 150, 14, '#f29bb5'],
        [80, 110, 18, '#ffd36e'],
        [140, 130, 12, '#c3a6ec'],
        [180, 60, 22, '#ffd36e'],
        [250, 40, 14, '#f29bb5'],
        [210, 160, 16, '#a9cdee'],
      ]
        .map(([x, y, r, c]) => sparkle(+x, +y, +r, `${c}`))
        .join(''),
  ),
  st(
    'lluvia-brillos',
    'Lluvia de brillitos',
    'Brillitos',
    200,
    200,
    [
      [50, 50, 30, '#f29bb5'],
      [140, 40, 18, '#c3a6ec'],
      [160, 120, 34, '#ffd36e'],
      [70, 140, 22, '#9fd0b8'],
      [110, 90, 14, '#a9cdee'],
      [30, 110, 10, '#ffd36e'],
      [120, 176, 12, '#f29bb5'],
      [180, 70, 8, '#9fd0b8'],
    ]
      .map(([x, y, r, c]) => sparkle(+x, +y, +r, `${c}`))
      .join(''),
  ),
  st('brillo-corazon', 'Corazón brillito', 'Brillitos', 200, 200, sparkle(100, 100, 92, '#fde3ea') + heartAt(100, 100, 0.42, '#e0475f') + sparkle(160, 40, 14, '#f2b25c') + sparkle(40, 160, 10, '#f2b25c')),
  st(
    'arcoiris',
    'Arcoíris con nubes',
    'Brillitos',
    240,
    150,
    ['#f29bb5', '#f7b89a', '#ffe7a3', '#9fd0b8', '#a9cdee', '#c3a6ec']
      .map((c, i) => `<path d="M${30 + i * 12} 130 A${90 - i * 12} ${90 - i * 12} 0 0 1 ${210 - i * 12} 130" stroke="${c}" stroke-width="13" fill="none"/>`)
      .join('') +
      `<g fill="#fff" stroke="#e1ecf6" stroke-width="3"><path d="M10 140 C6 120 24 108 38 116 C44 100 70 104 70 122 C84 122 84 144 70 144 H18 C12 144 10 142 10 140Z"/><path d="M170 140 C166 120 184 108 198 116 C204 100 230 104 230 122 C244 122 244 144 230 144 H178 C172 144 170 142 170 140Z"/></g>`,
  ),
  st(
    'gema-corazon',
    'Gema de corazón',
    'Brillitos',
    200,
    200,
    `<path d="${HEART}" fill="#f29bb5"/><path d="M100 64 L70 92 L100 172 L130 92Z" fill="#f6c6d2"/><path d="M30 62 L70 92 L100 64 M170 62 L130 92 L100 64 M70 92 L30 62 M70 92 H130" stroke="#fde3ea" stroke-width="3" fill="none" stroke-linejoin="round"/>` +
      `<path d="M70 92 L100 172 L22 96Z" fill="#e889a6" opacity="0.6"/><path d="${HEART}" fill="none" stroke="#e0477a" stroke-width="4" stroke-linejoin="round"/>${sparkle(56, 64, 12, '#fff')}`,
  ),
  st(
    'burbujas',
    'Burbujitas',
    'Brillitos',
    200,
    200,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6c6d2"/><stop offset="0.5" stop-color="#d9c8ef"/><stop offset="1" stop-color="#c7def2"/></linearGradient></defs>` +
      [
        [80, 110, 60],
        [150, 60, 32],
        [154, 150, 22],
        [40, 40, 16],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g)" opacity="0.35"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="url(#g)" stroke-width="${Math.max(3, r / 9)}"/><ellipse cx="${x - r * 0.4}" cy="${y - r * 0.4}" rx="${r * 0.22}" ry="${r * 0.13}" transform="rotate(-40 ${x - r * 0.4} ${y - r * 0.4})" fill="#fff"/>`)
        .join(''),
  ),
  st('estrellas-trio', 'Tres estrellitas', 'Brillitos', 240, 200, roundStar(80, 120, 66, '#ffd36e', '#f2b25c') + roundStar(180, 64, 40, '#f29bb5') + roundStar(196, 160, 26, '#c3a6ec')),
  st(
    'sol',
    'Solecito',
    'Brillitos',
    200,
    200,
    Array.from({ length: 12 }, (_, i) => `<rect x="94" y="8" width="12" height="30" rx="6" fill="#ffd36e" transform="rotate(${i * 30} 100 100)"/>`).join('') +
      `<circle cx="100" cy="100" r="54" fill="#ffe27a" stroke="#ffd36e" stroke-width="6"/>${face(100, 98, 0.9, 'felices')}`,
  ),
  st(
    'planeta',
    'Planeta lila',
    'Brillitos',
    220,
    180,
    `<ellipse cx="110" cy="96" rx="100" ry="28" fill="none" stroke="#ffd36e" stroke-width="10" transform="rotate(-14 110 96)"/>` +
      `<circle cx="110" cy="90" r="60" fill="#c3a6ec"/><path d="M58 76 C80 66 120 70 164 84 M54 104 C90 96 130 104 166 112" stroke="#d9c8ef" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      `<defs><clipPath id="c"><rect x="-20" y="96" width="260" height="90"/></clipPath></defs><ellipse cx="110" cy="96" rx="100" ry="28" fill="none" stroke="#ffd36e" stroke-width="10" transform="rotate(-14 110 96)" clip-path="url(#c)"/>` +
      `<ellipse cx="88" cy="62" rx="12" ry="7" transform="rotate(-30 88 62)" fill="#fff" opacity="0.6"/>${sparkle(30, 30, 12, '#f29bb5')}${sparkle(196, 150, 10, '#9fd0b8')}`,
  ),
  st(
    'chispas',
    'Chispitas',
    'Brillitos',
    200,
    200,
    Array.from({ length: 12 }, (_, i) => `<path d="M100 ${i % 2 ? 40 : 18} V${i % 2 ? 62 : 58}" stroke="${i % 2 ? '#f29bb5' : '#f2b25c'}" stroke-width="10" stroke-linecap="round" transform="rotate(${i * 30} 100 100)"/>`).join('') +
      `<circle cx="100" cy="100" r="14" fill="#c3a6ec"/>`,
  ),
  st(
    'anillo',
    'Anillito',
    'Brillitos',
    200,
    200,
    `<circle cx="100" cy="126" r="58" fill="none" stroke="#f2c45c" stroke-width="14"/><circle cx="100" cy="126" r="58" fill="none" stroke="#ffe7a3" stroke-width="4" stroke-dasharray="40 300"/>` +
      `<path d="M74 52 H126 L140 68 L100 100 L60 68Z" fill="#f6c6d2" stroke="#e889a6" stroke-width="4" stroke-linejoin="round"/><path d="M60 68 H140 M86 52 L80 68 L100 100 L120 68 L114 52" stroke="#fde3ea" stroke-width="2.5" fill="none"/>${sparkle(150, 40, 14, '#f2b25c')}`,
  ),
]

// ───────────────────────── Washi ─────────────────────────

const WASHI: BuiltinSticker[] = (
  [
    ['washi-vichy-lila', 'Washi vichy lila', P.vichy('#9a78d1'), '#efe6fb'],
    ['washi-vichy-menta', 'Washi vichy menta', P.vichy('#5fa884'), '#e3f4ec'],
    ['washi-vichy-celeste', 'Washi vichy celeste', P.vichy('#6fa3d6'), '#eaf3fb'],
    ['washi-vichy-rojo', 'Washi vichy rojo', P.vichy('#e0475f'), '#fff'],
    ['washi-lunares-rosa', 'Washi lunares rosa', P.lunares('#fff'), '#f29bb5'],
    ['washi-lunares-rojo', 'Washi lunares rojos', P.lunares('#e0475f', 2.6), '#fff4e6'],
    ['washi-lunares-menta', 'Washi lunares menta', P.lunares('#fff'), '#9fd0b8'],
    ['washi-rayas-rosa', 'Washi rayas rosa', P.rayas('#fff'), '#f6c6d2'],
    ['washi-rayas-celeste', 'Washi rayas celeste', P.rayas('#fff'), '#a9cdee'],
    ['washi-rayas-amarillo', 'Washi rayas amarillo', P.rayas('#fff'), '#ffd36e'],
    ['washi-franjas-lila', 'Washi franjas lila', P.franjas('#c3a6ec', 0.6), '#fffaf6'],
    ['washi-corazones-rosa', 'Washi corazones rosa', P.corazones2('#fff'), '#f29bb5'],
    ['washi-corazones-lila', 'Washi corazones lila', P.corazones('#9a78d1'), '#efe6fb'],
    ['washi-estrellas', 'Washi estrellas', P.estrellas('#ffe7a3'), '#a9cdee'],
    ['washi-estrellas-rosa', 'Washi estrellas rosa', P.estrellas('#fff'), '#f6c6d2'],
    ['washi-flores-menta', 'Washi flores menta', P.flores('#fff', '#f2b25c'), '#9fd0b8'],
    ['washi-flores-crema', 'Washi flores crema', P.flores('#f29bb5', '#ffe7a3'), '#fff4e6'],
    ['washi-cuadritos', 'Washi cuadritos', P.cuadritos('#e6b35a'), '#fff4d0'],
    ['washi-zigzag', 'Washi zigzag', P.zigzag('#fff'), '#c3a6ec'],
    ['washi-ondas', 'Washi ondas', P.ondas('#6fa3d6'), '#eaf3fb'],
    ['washi-confeti', 'Washi confeti', P.confeti(), '#fffaf6'],
    ['washi-cerezas', 'Washi cerezas', P.cerezas(), '#fff4e6'],
    ['washi-monos', 'Washi moñitos', P.monos('#e0475f'), '#fde3ea'],
    ['washi-arcoiris', 'Washi arcoíris', P.arcoiris(), '#fff'],
    ['washi-lisa-rosa', 'Washi rosa', '', '#f29bb5'],
    ['washi-lisa-lila', 'Washi lila', '', '#c3a6ec'],
    ['washi-lisa-menta', 'Washi menta', '', '#9fd0b8'],
  ] as const
).map(([id, name, pattern, base]) => ({ id, name, category: 'Washi', ratio: 4, svg: washi('w', pattern, base) }))

// ───────────────────────── Marcos ─────────────────────────

function laceRect(edge: string, inner: string) {
  const bumps: string[] = []
  for (let x = 20; x <= 220; x += 16) bumps.push(`<circle cx="${x}" cy="20" r="10"/><circle cx="${x}" cy="160" r="10"/>`)
  for (let y = 36; y <= 144; y += 16) bumps.push(`<circle cx="20" cy="${y}" r="10"/><circle cx="220" cy="${y}" r="10"/>`)
  return `<g fill="${edge}">${bumps.join('')}</g><rect x="20" y="20" width="200" height="140" fill="${edge}"/><rect x="32" y="32" width="176" height="116" rx="6" fill="${inner}"/><rect x="38" y="38" width="164" height="104" rx="4" fill="none" stroke="${edge}" stroke-width="2" stroke-dasharray="5 5"/>`
}

const sticky = (fill: string, fold: string, tape: string) =>
  `<path d="M14 26 H186 V160 L152 194 H14Z" fill="${fill}"/><path d="M186 160 L152 194 L156 164Z" fill="${fold}"/>` +
  `<path d="M28 62 H172 M28 92 H172 M28 122 H150" stroke="${fold}" stroke-width="2" opacity="0.6"/><rect x="66" y="10" width="68" height="28" fill="${tape}" opacity="0.8" transform="rotate(-4 100 24)"/>`

const ticket = (fill: string, edge: string) =>
  `<path d="M12 14 H248 V44 A16 16 0 0 0 248 76 V106 H12 V76 A16 16 0 0 0 12 44Z" fill="${fill}" stroke="${edge}" stroke-width="4" stroke-linejoin="round"/>` +
  `<path d="M196 18 V102" stroke="${edge}" stroke-width="3" stroke-dasharray="6 6"/><rect x="28" y="28" width="152" height="64" rx="8" fill="none" stroke="${edge}" stroke-width="2"/>${heartAt(222, 60, 0.14, edge)}`

const tag = (fill: string, edge: string) =>
  `<path d="M4 20 C40 6 40 50 20 60" stroke="#c9a0b0" stroke-width="3" fill="none" stroke-linecap="round"/>` +
  `<path d="M60 16 H226 Q234 16 234 24 V96 Q234 104 226 104 H60 L24 60Z" fill="${fill}" stroke="${edge}" stroke-width="4" stroke-linejoin="round"/>` +
  `<circle cx="52" cy="60" r="8" fill="#fff" stroke="${edge}" stroke-width="3"/><path d="M74 28 H220 V92 H74" fill="none" stroke="${edge}" stroke-width="2" stroke-dasharray="5 5"/>`

const banner = (fill: string, dark: string) =>
  `<path d="M8 40 H58 V92 H8 L24 66Z" fill="${dark}"/><path d="M292 40 H242 V92 H292 L276 66Z" fill="${dark}"/><path d="M40 78 L58 92 V78Z M260 78 L242 92 V78Z" fill="#000" opacity="0.18"/>` +
  `<rect x="40" y="18" width="220" height="60" rx="4" fill="${fill}"/><rect x="48" y="26" width="204" height="44" rx="2" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/>`

const MARCOS: BuiltinSticker[] = [
  { id: 'marco-menta', name: 'Marco menta', category: 'Marcos', ratio: 1, svg: frameScallop('#9fd0b8', '#fffaf6') },
  { id: 'marco-amarillo', name: 'Marco amarillo', category: 'Marcos', ratio: 1, svg: frameScallop('#ffe7a3', '#fffaf6') },
  { id: 'marco-celeste', name: 'Marco celeste', category: 'Marcos', ratio: 1, svg: frameScallop('#c7def2', '#fffaf6') },
  st('marco-encaje', 'Marco de encaje', 'Marcos', 240, 180, laceRect('#f6c6d2', '#fffaf6')),
  st('marco-encaje-lila', 'Marco de encaje lila', 'Marcos', 240, 180, laceRect('#d9c8ef', '#fffaf6')),
  st(
    'polaroid',
    'Foto polaroid',
    'Marcos',
    170,
    200,
    `<rect x="10" y="10" width="150" height="180" rx="4" fill="#fff" stroke="#eadfe3" stroke-width="3"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7def2"/><stop offset="1" stop-color="#fde3ea"/></linearGradient></defs>` +
      `<rect x="22" y="22" width="126" height="126" fill="url(#g)"/><circle cx="118" cy="52" r="12" fill="#fff4e6"/><path d="M22 148 L62 100 L90 128 L112 108 L148 148Z" fill="#9fd0b8" opacity="0.8"/>`,
  ),
  st(
    'polaroid-cinta',
    'Polaroid con cinta',
    'Marcos',
    170,
    200,
    `<g transform="rotate(-4 85 105)"><rect x="12" y="16" width="146" height="176" rx="4" fill="#fff" stroke="#eadfe3" stroke-width="3"/><rect x="24" y="28" width="122" height="122" fill="#fdf2f5"/></g>` +
      `<rect x="50" y="2" width="70" height="26" fill="#c3a6ec" opacity="0.75" transform="rotate(6 85 15)"/>${heartAt(85, 90, 0.2, '#f6c6d2')}`,
  ),
  st('nota-rosa', 'Notita rosa', 'Marcos', 200, 200, sticky('#fde3ea', '#f6b3c6', '#9fd0b8')),
  st('nota-amarilla', 'Notita amarilla', 'Marcos', 200, 200, sticky('#fff1b8', '#f2d27a', '#f29bb5')),
  st(
    'globo-dialogo',
    'Globo de diálogo',
    'Marcos',
    240,
    200,
    `<path d="M120 16 C184 16 228 48 228 88 C228 128 184 158 120 158 C108 158 96 157 86 154 L44 184 L56 142 C28 128 12 108 12 88 C12 48 56 16 120 16Z" fill="#fff" stroke="#f29bb5" stroke-width="6" stroke-linejoin="round"/>`,
  ),
  st(
    'globo-pensamiento',
    'Globo de pensamiento',
    'Marcos',
    240,
    200,
    `<g fill="#fff" stroke="#c3a6ec" stroke-width="5"><circle cx="34" cy="186" r="7"/><circle cx="54" cy="164" r="11"/></g>` +
      `<path d="M66 140 C30 140 24 100 50 90 C40 56 80 36 104 54 C118 22 170 20 182 52 C214 46 236 78 218 102 C238 124 214 156 182 146 C166 166 120 166 106 146 C94 156 72 154 66 140Z" fill="#fff" stroke="#c3a6ec" stroke-width="5" stroke-linejoin="round"/>`,
  ),
  st('globo-corazon', 'Globo de diálogo corazón', 'Marcos', 200, 200, `<path d="${HEART}" fill="#fff" stroke="#e0475f" stroke-width="6" stroke-linejoin="round"/><path d="M60 138 L36 186 L84 156" fill="#fff" stroke="#e0475f" stroke-width="6" stroke-linejoin="round"/><path d="M62 136 L80 154" stroke="#fff" stroke-width="8"/>`),
  st('cinta-rosa', 'Cinta rosa', 'Marcos', 300, 100, banner('#f29bb5', '#d9668a')),
  st('cinta-lila', 'Cinta lila', 'Marcos', 300, 100, banner('#c3a6ec', '#9a78d1')),
  st('boleto', 'Boleto', 'Marcos', 260, 120, ticket('#fde3ea', '#e889a6')),
  st('boleto-menta', 'Boleto menta', 'Marcos', 260, 120, ticket('#e3f4ec', '#74b394')),
  st('etiqueta-regalo', 'Etiqueta de regalo', 'Marcos', 240, 120, tag('#fff4e6', '#e889a6')),
  st('etiqueta-lila', 'Etiqueta lila', 'Marcos', 240, 120, tag('#efe6fb', '#9a78d1')),
  st('marco-corazon', 'Marco de corazón', 'Marcos', 200, 200, `<path d="${HEART}" fill="#f29bb5"/>${heartAt(100, 100, 0.74, '#fffaf6')}${heartAt(100, 100, 0.84, 'none', 'stroke="#fff" stroke-width="4" stroke-dasharray="6 6"')}`),
  st(
    'camafeo',
    'Marco ovalado',
    'Marcos',
    180,
    220,
    `<ellipse cx="90" cy="120" rx="76" ry="92" fill="#d9c8ef"/><ellipse cx="90" cy="120" rx="76" ry="92" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="0 14" stroke-linecap="round"/><ellipse cx="90" cy="120" rx="58" ry="74" fill="#fffaf6"/>` +
      `<g transform="translate(90 30) scale(0.42) translate(-100 -94)">${BOW('#f29bb5', '#d9668a')}</g>`,
  ),
  st(
    'arco',
    'Marco de arco',
    'Marcos',
    170,
    220,
    `<path d="M10 210 V85 A75 75 0 0 1 160 85 V210Z" fill="#9fd0b8"/><path d="M26 196 V87 A59 59 0 0 1 144 87 V196Z" fill="#fffaf6"/><path d="M34 188 V88 A51 51 0 0 1 136 88 V188Z" fill="none" stroke="#9fd0b8" stroke-width="2" stroke-dasharray="5 5"/>${flower(30, 196, 16, '#f29bb5', '#fff4e6')}${flower(140, 196, 16, '#f6c6d2', '#f2b25c')}`,
  ),
  st(
    'banderines',
    'Banderines',
    'Marcos',
    300,
    120,
    `<path d="M4 12 Q150 50 296 12" stroke="#c9a0b0" stroke-width="3" fill="none"/>` +
      Array.from({ length: 7 }, (_, i) => {
        const t = (i + 0.5) / 7
        const x = 4 + t * 292
        const y = 12 + 4 * 19 * t * (1 - t)
        const c = ['#f29bb5', '#ffe7a3', '#c3a6ec', '#9fd0b8', '#a9cdee'][i % 5]
        return `<path d="M${x - 18} ${y - 2} L${x + 18} ${y - 2} L${x} ${y + 52}Z" fill="${c}"/><circle cx="${x}" cy="${y + 16}" r="4" fill="#fff" opacity="0.8"/>`
      }).join(''),
  ),
  st(
    'hoja-cuaderno',
    'Hoja de cuaderno',
    'Marcos',
    200,
    240,
    `<path d="M14 10 H186 V214 L172 226 L158 214 L144 228 L130 214 L116 228 L102 214 L88 228 L74 214 L60 228 L46 214 L32 228 L14 214Z" fill="#fff" stroke="#e6e0ea" stroke-width="2"/>` +
      Array.from({ length: 8 }, (_, i) => `<path d="M14 ${50 + i * 22} H186" stroke="#c7def2" stroke-width="2"/>`).join('') +
      `<path d="M48 10 V214" stroke="#f29bb5" stroke-width="2"/>${[40, 112, 184].map((y) => `<circle cx="30" cy="${y}" r="6" fill="#fdf6ee" stroke="#e6e0ea" stroke-width="2"/>`).join('')}`,
  ),
  st(
    'tarjeta',
    'Tarjetita',
    'Marcos',
    240,
    160,
    `<rect x="10" y="10" width="220" height="140" rx="6" fill="#fffaf6" stroke="#ead9cf" stroke-width="3"/><path d="M10 44 H230" stroke="#f29bb5" stroke-width="3"/>` +
      [70, 94, 118].map((y) => `<path d="M10 ${y} H230" stroke="#c7def2" stroke-width="2"/>`).join('') +
      `<rect x="92" y="0" width="56" height="22" fill="#ffe7a3" opacity="0.85" transform="rotate(-3 120 11)"/>`,
  ),
  st(
    'sobre-lila',
    'Sobrecito lila',
    'Marcos',
    280,
    200,
    `<rect x="10" y="30" width="260" height="160" rx="12" fill="#efe6fb" stroke="#9a78d1" stroke-width="4"/><path d="M14 36 L140 120 L266 36" fill="none" stroke="#9a78d1" stroke-width="4" stroke-linejoin="round"/><circle cx="140" cy="118" r="18" fill="#f29bb5"/>${heartAt(140, 118, 0.1, '#fff')}`,
  ),
  st(
    'nube-rosa',
    'Nubecita rosa',
    'Marcos',
    320,
    200,
    `<path d="M70 170 C24 170 16 116 56 104 C50 58 108 42 132 76 C150 30 228 34 232 90 C282 84 300 150 252 170Z" fill="#fde3ea" stroke="#f29bb5" stroke-width="6" stroke-linejoin="round"/>${face(160, 128, 1, 'felices')}`,
  ),
  st(
    'marco-flores',
    'Marco de florecitas',
    'Marcos',
    200,
    200,
    `<circle cx="100" cy="100" r="80" fill="#fffaf6" stroke="#9fd0b8" stroke-width="5"/><circle cx="100" cy="100" r="70" fill="none" stroke="#9fd0b8" stroke-width="2" stroke-dasharray="4 6"/>` +
      `${leaf(48, 48, 24, 110)}${leaf(48, 48, 24, -20)}${flower(48, 48, 18, '#f29bb5', '#fff4e6')}${leaf(152, 152, 24, 290)}${leaf(152, 152, 24, 160)}${flower(152, 152, 18, '#c3a6ec', '#fff4e6')}${flower(156, 50, 11, '#ffe7a3', '#f29bb5')}${flower(44, 152, 11, '#f6c6d2', '#f2b25c')}`,
  ),
  st(
    'etiqueta-redonda',
    'Etiqueta redonda',
    'Marcos',
    200,
    220,
    `<path d="M70 150 L46 214 L70 200 L84 216 L96 160Z M130 150 L154 214 L130 200 L116 216 L104 160Z" fill="#e0475f"/>` +
      Array.from({ length: 20 }, (_, i) => `<circle cx="${(100 + Math.cos((i / 20) * Math.PI * 2) * 78).toFixed(1)}" cy="${(90 + Math.sin((i / 20) * Math.PI * 2) * 78).toFixed(1)}" r="12" fill="#f29bb5"/>`).join('') +
      `<circle cx="100" cy="90" r="78" fill="#f29bb5"/><circle cx="100" cy="90" r="62" fill="#fffaf6"/><circle cx="100" cy="90" r="56" fill="none" stroke="#f29bb5" stroke-width="2" stroke-dasharray="5 5"/>`,
  ),
]

/** Todos los dibujos hechos a mano que se agregaron después de los primeros 26. */
export const DRAWN_STICKERS: BuiltinSticker[] = [...MONOS, ...CORAZONES, ...FLORES, ...BRILLITOS, ...WASHI, ...MARCOS]
