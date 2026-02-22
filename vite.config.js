import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawTarget = (env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000').trim()
  const normalizedTarget = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '')

  return {
    plugins: [react(), tailwindcss()],
    base: './',
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
