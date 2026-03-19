import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png', 'web-app-manifest-192x192.png', 'web-app-manifest-512x512.png'],
      manifest: false,
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm,webp}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Mapbox API (styles only — fonts/sprites handled by assets rule below)
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-api-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          // Mapbox vector tiles — limited for iOS ~50MB quota
          {
            urlPattern: /^https:\/\/.*\.tiles\.mapbox\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          // Mapbox static assets (fonts, sprites, glyphs)
          {
            urlPattern: /^https:\/\/.*\.mapbox\.com\/(fonts|sprites)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-assets-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('mapbox-gl') || id.includes('react-map-gl')) {
            return 'mapbox';
          }
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/scheduler/') ||
              id.includes('/@supabase/') ||
              id.includes('/@headlessui/') ||
              id.includes('/@heroicons/') ||
              id.includes('/zustand/')
            ) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
})
