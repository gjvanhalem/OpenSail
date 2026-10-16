import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'OpenSail Navigation',
        short_name: 'OpenSail',
        description: 'Marine navigation system for modern devices',
        theme_color: '#0ea5e9',
        background_color: '#0c4a6e',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // Chart tiles and label glyphs are NOT cached here: the map loads them
        // through the opensail:// protocol, which serves downloaded regions from
        // IndexedDB (src/components/chart/tileProtocol.ts). Caching them here too
        // would store every tile twice. PMTiles archives under /charts/ are read
        // with range requests, which the Cache API can't store either.
        navigateFallbackDenylist: [/\/charts\//],
        runtimeCaching: [
          {
            // Chart catalog - network first, so the download panel still lists
            // the ENC regions after the app was last online
            urlPattern: ({ url }) => url.pathname.endsWith('/charts/index.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'chart-catalog',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Base map TileJSON - network first so a new weekly build is picked up
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/planet$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'chart-tilejson',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // API data - network first with cache fallback
            urlPattern: /^https:\/\/api\..*\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-data',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          }
        ],
        // Handle quota exceeded
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/database': path.resolve(__dirname, './src/database'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-map': ['maplibre-gl'],
          'vendor-db': ['dexie'],
          
          // Feature chunks
          'protocols': [
            './src/protocols/NMEA0183Parser',
            './src/protocols/NMEA2000Parser',
            './src/protocols/SeaTalkParser'
          ],
          'connections': [
            './src/services/connections/SerialConnection',
            './src/services/connections/BluetoothConnection'
          ],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: true,
  },
})
