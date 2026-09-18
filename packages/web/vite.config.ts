import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwind()],
  // GitHub Pages serves project sites under /<repo>/. Override with BASE_PATH=/
  // if a custom domain is attached later.
  base: process.env.BASE_PATH ?? '/fxtrack/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
})
