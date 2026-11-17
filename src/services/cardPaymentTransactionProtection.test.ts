
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  checkTransactionProtection,
} from './cardPaymentTransactionProtection'

const simulatedStorage = new Map<string, string>()

beforeEach(() => {
  simulatedStorage.clear()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      simulatedStorage.get(key) ?? null,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Proteção de transações vinculadas a faturas', () => {
  it('protege uma transação vinculada a pagamento', () => {
    simulatedStorage.set(
      'personal-finance-card-payments',
      JSON.stringify([
        {
          id: 'pagamento-001',
          cardId: 'cartao-001',
          invoiceMonth: '2026-11',
          amount: 100,
          date: '2026-11-08',
          transactionId: 'transacao-001',
        },
      ])
    )

    const result =
      checkTransactionProtection('transacao-001')

    expect(result.protected).toBe(true)
  })

  it('não protege uma transação sem vínculo', () => {
    simulatedStorage.set(
      'personal-finance-card-payments',
      '[]'
    )

    const result =
      checkTransactionProtection('transacao-001')

    expect(result.protected).toBe(false)
  })

it('bloqueia alterações quando os pagamentos estão corrompidos', () => {
  simulatedStorage.set(
    'personal-finance-card-payments',
    '{json-invalido'
  )

  expect(() =>
    checkTransactionProtection('transacao-001')
  ).toThrow(
    'Não foi possível validar os pagamentos de faturas.'
  )
})

it('bloqueia alterações quando a leitura do armazenamento falha', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('Falha simulada de leitura')
    },
  })

  expect(() =>
    checkTransactionProtection('transacao-001')
  ).toThrow(
    'Não foi possível validar os pagamentos de faturas.'
  )
})

it('bloqueia pagamentos com estrutura interna inválida', () => {
  simulatedStorage.set(
    'personal-finance-card-payments',
    JSON.stringify([
      {
        id: 'pagamento-001',
        cardId: 'cartao-001',
        invoiceMonth: '2026-11',
        amount: -100,
        date: '2026-11-08',
        transactionId: 'transacao-001',
      },
    ])
  )

  expect(() =>
    checkTransactionProtection('transacao-001')
  ).toThrow(
    'Não foi possível validar os pagamentos de faturas.'
  )
})

})
