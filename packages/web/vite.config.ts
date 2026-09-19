import { writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'

/** Canonical origin. Used for the sitemap; keep in step with the <link rel=canonical>. */
const SITE = process.env.SITE_URL ?? 'https://fxtrack.anjula.dev'

/** A single-page app has one public URL; stamp it at build time. */
function sitemap(site: string): Plugin {
  return {
    name: 'fxtrack-sitemap',
    apply: 'build',
    writeBundle() {
      const url = `${site.replace(/\/$/, '')}/`
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
      writeFileSync(new URL('./dist/sitemap.xml', import.meta.url), xml)
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwind(), sitemap(SITE)],
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
