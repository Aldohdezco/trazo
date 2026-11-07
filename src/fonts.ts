// Fuentes autoalojadas (funcionan sin internet). Solo el subconjunto latino: incluye acentos y ñ.
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-400-italic.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-700-italic.css'
import '@fontsource/quicksand/latin-400.css'
import '@fontsource/quicksand/latin-700.css'
import '@fontsource/playfair-display/latin-400.css'
import '@fontsource/playfair-display/latin-400-italic.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-700-italic.css'
import '@fontsource/dancing-script/latin-400.css'
import '@fontsource/dancing-script/latin-700.css'
import '@fontsource/great-vibes/latin-400.css'
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/tinos/latin-400.css'
import '@fontsource/tinos/latin-400-italic.css'
import '@fontsource/tinos/latin-700.css'
import '@fontsource/tinos/latin-700-italic.css'
import '@fontsource/special-elite/latin-400.css'

import { FONTS } from './lib/catalog'
import { invalidateTextCache } from './lib/canvas/text'

/** El canvas no dispara la descarga de fuentes por sí solo: las pedimos todas al iniciar. */
export function preloadFonts() {
  if (!document.fonts) return
  const loads = FONTS.flatMap((f) => [`400 20px "${f.family}"`, `700 20px "${f.family}"`, `italic 400 20px "${f.family}"`].map((spec) => document.fonts.load(spec, 'Aáñ').catch(() => [])))
  void Promise.all(loads).then(() => invalidateTextCache())
  document.fonts.addEventListener('loadingdone', () => invalidateTextCache())
}
