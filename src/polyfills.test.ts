import { describe, expect, it } from 'vitest'

import { createRandomUUID } from './polyfills'

describe('gerador de UUID para a rede local', () => {
  it('gera identificadores no formato UUID v4', () => {
    const id = createRandomUUID()

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  it('não repete identificadores', () => {
    const ids = new Set(Array.from({ length: 5000 }, createRandomUUID))

    expect(ids.size).toBe(5000)
  })
})
