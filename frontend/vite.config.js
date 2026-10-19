import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // O build é versionado em backend/static: o deploy na VPS é só "git pull" (ver DEPLOY.md).
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
