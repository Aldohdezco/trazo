import { mount } from 'svelte'
import './fonts'
import './app.css'
import App from './App.svelte'
import { preloadFonts } from './fonts'

preloadFonts()

// Safari: evita el zoom de toda la página con dos dedos (el lienzo tiene su propio zoom).
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false })
}

export default mount(App, { target: document.getElementById('app')! })
