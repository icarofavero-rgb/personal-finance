import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

/** No arquivo único, o ícone da aba vai embutido (não há arquivos ao lado). */
function inlineFavicon() {
  return {
    name: 'inline-favicon',
    transformIndexHtml(html: string) {
      const svg = readFileSync(new URL('./public/favicon.svg', import.meta.url), 'utf8')
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
      return html
        .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${dataUrl}" />`)
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/\s*<link rel="manifest"[^>]*>/, '')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run arquivo` gera UM único .html com tudo embutido, que abre
  // com clique duplo, sem servidor e sem internet.
  if (mode === 'arquivo') {
    return {
      plugins: [react(), viteSingleFile(), inlineFavicon()],
      base: './',
      build: {
        outDir: 'dist-arquivo',
        emptyOutDir: true,
        chunkSizeWarningLimit: 4000,
      },
    }
  }

  return {
    plugins: [react()],
    // Caminhos relativos: funciona no Android, no arquivo único e em
    // endereços com subpasta (ex.: usuario.github.io/personal-finance/).
    base: './',
  }
})
