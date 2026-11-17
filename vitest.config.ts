import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Todos os testes do projeto. Os roteiros antigos (*.check.ts)
    // são executados por src/services/legacyChecks.test.ts.
    include: ['src/**/*.test.ts'],
  },
})
