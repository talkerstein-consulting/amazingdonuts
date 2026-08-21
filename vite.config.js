import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  server: {
    // honour the harness's assigned port instead of Vite's own 5173 default
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
