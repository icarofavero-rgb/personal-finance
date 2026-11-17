
import { describe, expect, it } from 'vitest'

import {
  getFinancialProfileStorageKey,
} from './financialProfileKeys'

describe('Chaves dos perfis financeiros', () => {
  it('gera chaves diferentes para perfis diferentes', () => {
    const keyA = getFinancialProfileStorageKey(
      'perfil-a',
      'transactions'
    )

    const keyB = getFinancialProfileStorageKey(
      'perfil-b',
      'transactions'
    )

    expect(keyA).not.toBe(keyB)
  })

  it('gera chaves diferentes para áreas diferentes', () => {
    const transactionsKey = getFinancialProfileStorageKey(
      'perfil-a',
      'transactions'
    )

    const cardsKey = getFinancialProfileStorageKey(
      'perfil-a',
      'cards'
    )

    expect(transactionsKey).not.toBe(cardsKey)
  })

  it('rejeita identificadores vazios', () => {
    expect(() =>
      getFinancialProfileStorageKey('', 'transactions')
    ).toThrow('Identificador do perfil inválido.')
  })
})
