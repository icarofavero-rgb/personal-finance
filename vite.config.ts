import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run arquivo` gera UM único .html com tudo embutido, que abre
  // com clique duplo, sem servidor e sem internet.
  if (mode === 'arquivo') {
    return {
      plugins: [react(), viteSingleFile()],
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
  }
})
