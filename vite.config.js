import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', 
  server: {
    host: '127.0.0.1', // مجبوش می‌کنه از IPv4 استفاده کنه
    port: 5173
  }
})