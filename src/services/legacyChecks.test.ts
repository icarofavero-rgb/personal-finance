/**
 * Executa os roteiros de verificação antigos (*.check.ts) como testes.
 *
 * Esses arquivos foram escritos como scripts: fazem as verificações direto
 * no corpo do arquivo e lançam erro quando algo falha. Aqui cada um é
 * importado isoladamente — se o import lançar erro, o teste falha.
 */
import { describe, expect, it, vi } from 'vitest'

const checks = import.meta.glob('./*.check.ts')

describe('verificações legadas', () => {
  it('encontra os roteiros de verificação', () => {
    expect(Object.keys(checks).length).toBeGreaterThan(0)
  })

  for (const [path, load] of Object.entries(checks)) {
    it(path.replace('./', ''), async () => {
      vi.resetModules()

      const log = vi.spyOn(console, 'log').mockImplementation(() => {})

      try {
        await load()
        // Alguns roteiros disparam verificações assíncronas sem aguardar.
        await new Promise(resolve => setTimeout(resolve, 50))
      } finally {
        log.mockRestore()
      }
    })
  }
})
