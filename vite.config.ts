import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'WhoU',
        short_name: 'WhoU',
        description: 'Соціальний рандомайзер персонажів — кімнати, спільні стріки, колекція результатів',
        lang: 'uk',
        theme_color: '#2a1c10',
        background_color: '#2a1c10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Force the new SW to activate immediately (don't wait for every open
        // tab to close) and take control of already-open pages right away.
        skipWaiting: true,
        clientsClaim: true,
        // Drop precache entries left behind by previous SW versions instead
        // of leaving them in storage.
        cleanupOutdatedCaches: true,
        // Bumping this changes every Workbox cache name, orphaning whatever
        // an already-installed client had cached and forcing a clean refetch.
        // Bump again any time a deploy needs to force-bust installed PWAs.
        cacheId: 'whou-v2',
      },
    }),
  ],
})
