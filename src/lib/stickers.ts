/** Stickers incluidos: dibujos vectoriales (SVG) que se convierten en imagen al usarlos. */

export interface BuiltinSticker {
  id: string
  name: string
  category: string
  /** Proporción ancho / alto del dibujo. */
  ratio: number
  svg: string
}

const BOW = (fill: string, knot: string, shine = 'rgba(255,255,255,0.45)') => `
  <path d="M100 92 C74 52 16 38 16 78 C16 112 66 106 100 92Z" fill="${fill}"/>
  <path d="M100 92 C126 52 184 38 184 78 C184 112 134 106 100 92Z" fill="${fill}"/>
  <path d="M88 84 C70 66 40 62 36 78" stroke="${shine}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M112 84 C130 66 160 62 164 78" stroke="${shine}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M94 98 L66 164 L82 158 L92 174 L106 100Z" fill="${fill}"/>
  <path d="M106 98 L134 164 L118 158 L108 174 L94 100Z" fill="${fill}"/>
  <ellipse cx="100" cy="94" rx="15" ry="18" fill="${knot}"/>`

const HEART = 'M100 172 C30 126 14 92 30 62 C46 32 86 34 100 64 C114 34 154 32 170 62 C186 92 170 126 100 172Z'

const svg = (w: number, h: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}">${body}</svg>`

function flower(cx: number, cy: number, r: number, petal: string, center: string) {
  return [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="${cx}" cy="${cy - r}" rx="${r * 0.62}" ry="${r * 0.95}" transform="rotate(${a} ${cx} ${cy})" fill="${petal}"/>`)
    .join('') + `<circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="${center}"/>`
}

function washi(id: string, pattern: string, base: string) {
  const zig = Array.from({ length: 9 }, (_, i) => `${i % 2 ? 6 : 0},${i * 7.5}`).join(' ')
  return svg(
    240,
    60,
    `<defs><pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse">${pattern}</pattern>
      <clipPath id="${id}c"><polygon points="${zig} ${Array.from({ length: 9 }, (_, i) => `${i % 2 ? 234 : 240},${60 - i * 7.5}`).join(' ')}"/></clipPath></defs>
    <g clip-path="url(#${id}c)" opacity="0.88"><rect width="240" height="60" fill="${base}"/><rect width="240" height="60" fill="url(#${id})"/></g>`,
  )
}

function frameScallop(fill: string, inner: string) {
  const bumps = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    return `<circle cx="${(100 + Math.cos(a) * 82).toFixed(1)}" cy="${(100 + Math.sin(a) * 82).toFixed(1)}" r="13" fill="${fill}"/>`
  }).join('')
  return svg(200, 200, `${bumps}<circle cx="100" cy="100" r="82" fill="${fill}"/><circle cx="100" cy="100" r="66" fill="${inner}"/><circle cx="100" cy="100" r="66" fill="none" stroke="${fill}" stroke-width="2" stroke-dasharray="5 5" opacity="0.7"/>`)
}

function sparkle(cx: number, cy: number, r: number, fill: string) {
  return `<path d="M${cx} ${cy - r} C${cx + r * 0.12} ${cy - r * 0.12} ${cx + r * 0.12} ${cy - r * 0.12} ${cx + r} ${cy} C${cx + r * 0.12} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.12} ${cx} ${cy + r} C${cx - r * 0.12} ${cy + r * 0.12} ${cx - r * 0.12} ${cy + r * 0.12} ${cx - r} ${cy} C${cx - r * 0.12} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.12} ${cx} ${cy - r}Z" fill="${fill}"/>`
}

export const BUILTIN_STICKERS: BuiltinSticker[] = [
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

export const STICKER_CATEGORIES = [...new Set(BUILTIN_STICKERS.map((s) => s.category))]

export function builtinSticker(blobId: string): BuiltinSticker | undefined {
  return BUILTIN_STICKERS.find((s) => 'builtin:' + s.id === blobId)
}

/** URL de imagen para mostrar un sticker incluido en la biblioteca. */
export function stickerDataUrl(s: BuiltinSticker): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg)
}

/** Convierte un sticker incluido en imagen (a ~600 px de ancho, nítido al acercar). */
export async function rasterizeBuiltin(s: BuiltinSticker): Promise<ImageBitmap> {
  const img = new Image()
  img.src = stickerDataUrl(s)
  await img.decode()
  const w = 600
  const h = Math.round(w / s.ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
  return createImageBitmap(canvas)
}
