import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '').API_PROXY_TARGET || 'http://127.0.0.1:5000' },
  },
}))
