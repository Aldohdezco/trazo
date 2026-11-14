// Copia a public/stickers/tw/ solo los SVG de Twemoji que usa la biblioteca de stickers.
// Uso: node scripts/copiar-twemoji.mjs   (requiere `npm i -D @twemoji/svg`)
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWEMOJI_SECTIONS, twemojiCode } from '../src/lib/stickersTwemoji.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = dirname(createRequire(import.meta.url).resolve('@twemoji/svg/package.json'))
const out = join(root, 'public', 'stickers', 'tw')
mkdirSync(out, { recursive: true })

const wanted = new Set(Object.values(TWEMOJI_SECTIONS).flat().map(([e]) => twemojiCode(e) + '.svg'))
let missing = 0
for (const file of wanted) {
  const from = join(src, file)
  if (!existsSync(from)) {
    console.error('No existe en Twemoji:', file)
    missing++
    continue
  }
  copyFileSync(from, join(out, file))
}
for (const file of readdirSync(out)) if (!wanted.has(file)) rmSync(join(out, file))
console.log(`${wanted.size - missing} SVG copiados a public/stickers/tw`)
if (missing) process.exit(1)
