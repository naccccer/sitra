import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import process from 'node:process'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawTarget = (env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000').trim()
  const rawBase = (env.VITE_APP_BASE || '/').trim()
  const normalizedTarget = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '')
  const normalizedBase =
    rawBase === '/' || rawBase === './'
      ? '/'
      : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'pwa/icon-192.png',
          'pwa/icon-512.png',
          'pwa/icon-512-maskable.png',
          'pwa/apple-touch-icon.png',
        ],
        manifest: {
          id: normalizedBase,
          name: 'سیستم سفارشات سیترا',
          short_name: 'Sitra ERP',
          description: 'سامانه یکپارچه مدیریت سفارشات و عملیات سیترا',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          scope: normalizedBase,
          start_url: normalizedBase,
          lang: 'fa',
          dir: 'rtl',
          icons: [
            {
              src: 'pwa/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'pwa/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.method === 'GET'
                && /\/api\/catalog\.php($|\?)/.test(url.pathname),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'sitra-api-catalog-cache',
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 40,
                  maxAgeSeconds: 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'font',
              handler: 'CacheFirst',
              options: {
                cacheName: 'sitra-font-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        '@kernel': path.resolve(process.cwd(), 'src/kernel'),
        '@components': path.resolve(process.cwd(), 'src/components'),
        '@services': path.resolve(process.cwd(), 'src/services'),
        '@hooks': path.resolve(process.cwd(), 'src/hooks'),
      },
    },
    base: normalizedBase,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')

            if (!normalizedId.includes('node_modules')) {
              return undefined
            }

            if (normalizedId.includes('/react-multi-date-picker/') || normalizedId.includes('/react-date-object/')) {
              return 'vendor-date-picker'
            }

            if (normalizedId.includes('/lucide-react/')) {
              return 'vendor-icons'
            }

            return undefined
          },
        },
      },
    },
    server: {
      host: '127.0.0.1', // Use IPv4 explicitly.
      port: 5173,
      proxy: {
        '/api': {
          target: normalizedTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
