import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/trazo/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png', 'favicon.ico'],
      manifest: {
        name: 'Trazo',
        short_name: 'Trazo',
        description: 'Cuadernos lindos para dibujar y escribir',
        lang: 'es',
        theme_color: '#f6c6d2',
        background_color: '#fdf6ee',
        display: 'standalone',
        orientation: 'any',
        start_url: '/trazo/',
        scope: '/trazo/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // Motor del recortador de sujetos: grande, se guarda la primera vez que se usa.
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm') || url.pathname.endsWith('.mjs'),
            handler: 'CacheFirst',
            options: { cacheName: 'trazo-motores', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
})
