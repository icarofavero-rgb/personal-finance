
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { createBackupV5 } from './backupV5Builder'

const memory = new Map<string, string>()

const storageMock = {
  getItem(key: string): string | null {
    return memory.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    memory.set(key, value)
  },

  removeItem(key: string): void {
    memory.delete(key)
  },
}

describe('Construção do Backup V5', () => {
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('localStorage', storageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gera um backup V5 com dados vazios válidos', () => {
    const backup = createBackupV5()

    expect(backup.version).toBe(5)
    expect(backup.transactions).toEqual([])
    expect(backup.cards).toEqual([])
    expect(backup.purchases).toEqual([])
    expect(backup.payments).toEqual([])

    expect(backup.debtorsData).toEqual({
      debtors: [],
      debts: [],
      payments: [],
    })

    expect(Number.isFinite(Date.parse(backup.createdAt))).toBe(
      true
    )
  })

  it('não altera o armazenamento durante a criação', () => {
    const before = new Map(memory)

    createBackupV5()

    expect(memory).toEqual(before)
  })

  it('rejeita dados de devedores corrompidos', () => {
    memory.set(
      'personal-finance-debtors-v1',
      '{json-invalido'
    )

    expect(() => createBackupV5()).toThrow()

    expect(
      memory.get('personal-finance-debtors-v1')
    ).toBe('{json-invalido')
  })

  it('rejeita dívidas vinculadas a devedores inexistentes', () => {
    memory.set(
      'personal-finance-debtors-v1',
      JSON.stringify({
        debtors: [],
        debts: [
          {
            id: 'divida-1',
            debtorId: 'devedor-inexistente',
            amountCents: 10000,
            installments: 1,
          },
        ],
        payments: [],
      })
    )

    expect(() => createBackupV5()).toThrow()

    expect(memory.has(
      'personal-finance-debtors-v1'
    )).toBe(true)
  })

it('preserva os devedores em um backup válido', () => {
  const debtorsData = {
    debtors: [
      {
        id: 'devedor-1',
        name: 'Pessoa de teste',
        createdAt: new Date().toISOString(),
      },
    ],
    debts: [],
    payments: [],
  }

  memory.set(
    'personal-finance-debtors-v1',
    JSON.stringify(debtorsData)
  )

  const before = new Map(memory)
  const backup = createBackupV5()

  expect(backup.version).toBe(5)
  expect(backup.debtorsData).toEqual(debtorsData)

  // A exportação não pode modificar os dados originais.
  expect(memory).toEqual(before)
})

it('rejeita recebimentos sem dívida correspondente', () => {
  const invalidData = {
    debtors: [],
    debts: [],
    payments: [
      {
        id: 'recebimento-1',
        debtId: 'divida-inexistente',
        amountCents: 2500,
        date: '2026-11-15',
        createdAt: new Date().toISOString(),
      },
    ],
  }

  memory.set(
    'personal-finance-debtors-v1',
    JSON.stringify(invalidData)
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  // Mesmo após a falha, os dados precisam permanecer intactos.
  expect(memory).toEqual(before)
})

it('inclui as transações existentes no Backup V5', () => {
  const transactions = [
    {
      id: 'transacao-teste-1',
      description: 'Salário de teste',
      amount: 2800,
      type: 'income',
      category: 'Salário',
      date: '2026-11-15',
    },
  ]

  memory.set(
    'personal-finance-transactions',
    JSON.stringify(transactions)
  )

  const before = new Map(memory)
  const backup = createBackupV5()

  expect(backup.version).toBe(5)
  expect(backup.transactions).toEqual(transactions)
  expect(memory).toEqual(before)
})

it('rejeita transações com valores inválidos', () => {
  const invalidTransactions = [
    {
      id: 'transacao-invalida',
      description: 'Valor inválido',
      amount: -100,
      type: 'income',
      category: 'Outros',
      date: '2026-11-15',
    },
  ]

  memory.set(
    'personal-finance-transactions',
    JSON.stringify(invalidTransactions)
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  // Nenhum dado pode ser alterado após a rejeição.
  expect(memory).toEqual(before)
})

it('preserva cartões e compras vinculadas', () => {
  const cards = [
    {
      id: 'cartao-1',
      name: 'Cartão de teste',
      bank: 'Banco de teste',
      limit: 5000,
      closingDay: 10,
      dueDay: 20,
    },
  ]

  const purchases = [
    {
      id: 'compra-1',
      cardId: 'cartao-1',
      description: 'Compra de teste',
      category: 'Compras',
      amount: 120,
      installments: 1,
      date: '2026-11-15',
    },
  ]

  memory.set(
    'personal-finance-credit-cards',
    JSON.stringify(cards)
  )

  memory.set(
    'personal-finance-card-purchases',
    JSON.stringify(purchases)
  )

  const before = new Map(memory)
  const backup = createBackupV5()

  expect(backup.version).toBe(5)
  expect(backup.cards).toEqual(cards)
  expect(backup.purchases).toEqual(purchases)

  // Criar o backup não pode modificar os dados.
  expect(memory).toEqual(before)
})

it('rejeita compras vinculadas a cartões inexistentes', () => {
  const purchases = [
    {
      id: 'compra-sem-cartao',
      cardId: 'cartao-inexistente',
      description: 'Compra inválida',
      category: 'Compras',
      amount: 100,
      installments: 1,
      date: '2026-11-15',
    },
  ]

  memory.set(
    'personal-finance-card-purchases',
    JSON.stringify(purchases)
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  // A rejeição não pode alterar o armazenamento.
  expect(memory).toEqual(before)
})

it('preserva uma lista vazia de pagamentos', () => {
  memory.set(
    'personal-finance-card-payments',
    JSON.stringify([])
  )

  const before = new Map(memory)
  const backup = createBackupV5()

  expect(backup.version).toBe(5)
  expect(backup.payments).toEqual([])
  expect(memory).toEqual(before)
})

it('rejeita pagamentos com estrutura inválida', () => {
  const invalidPayments = [
    {
      id: 'pagamento-invalido',
      amount: -100,
    },
  ]

  memory.set(
    'personal-finance-card-payments',
    JSON.stringify(invalidPayments)
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  // Uma falha de validação não pode alterar os dados.
  expect(memory).toEqual(before)
})

it('rejeita transações armazenadas com JSON corrompido', () => {
  memory.set(
    'personal-finance-transactions',
    '{json-invalido'
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  expect(memory).toEqual(before)
})

it('rejeita cartões armazenados com estrutura inválida', () => {
  memory.set(
    'personal-finance-credit-cards',
    JSON.stringify({ cards: [] })
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  expect(memory).toEqual(before)
})

it('rejeita compras armazenadas com JSON corrompido', () => {
  memory.set(
    'personal-finance-card-purchases',
    '{compras-invalidas'
  )

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  expect(memory).toEqual(before)
})

it('rejeita alterações inesperadas durante a leitura', () => {
  const originalTransactions = [
    {
      id: 'transacao-original',
      description: 'Transação original',
      amount: 100,
      type: 'income',
      category: 'Outros',
      date: '2026-11-15',
    },
  ]

  const modifiedTransactions = [
    {
      ...originalTransactions[0],
      amount: 200,
    },
  ]

  const key = 'personal-finance-transactions'

  memory.set(key, JSON.stringify(originalTransactions))

  const originalStorage = globalThis.localStorage
  let transactionReads = 0

  vi.stubGlobal('localStorage', {
    getItem(storageKey: string): string | null {
      if (storageKey === key) {
        transactionReads++

        if (transactionReads === 2) {
          return JSON.stringify(modifiedTransactions)
        }
      }

      return originalStorage.getItem(storageKey)
    },

    setItem(storageKey: string, value: string): void {
      originalStorage.setItem(storageKey, value)
    },

    removeItem(storageKey: string): void {
      originalStorage.removeItem(storageKey)
    },
  })

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  expect(memory).toEqual(before)
})

it('detecta alterações após a leitura de um conjunto financeiro', () => {
  const key = 'personal-finance-transactions'

  const originalTransactions = [
    {
      id: 'transacao-1',
      description: 'Valor original',
      amount: 100,
      type: 'income',
      category: 'Outros',
      date: '2026-11-15',
    },
  ]

  const modifiedTransactions = [
    {
      ...originalTransactions[0],
      amount: 200,
    },
  ]

  memory.set(key, JSON.stringify(originalTransactions))

  const originalStorage = globalThis.localStorage
  let changed = false

  vi.stubGlobal('localStorage', {
    getItem(storageKey: string): string | null {
      if (
        storageKey === 'personal-finance-credit-cards' &&
        !changed
      ) {
        changed = true

        memory.set(
          key,
          JSON.stringify(modifiedTransactions)
        )
      }

      return originalStorage.getItem(storageKey)
    },

    setItem(storageKey: string, value: string): void {
      originalStorage.setItem(storageKey, value)
    },

    removeItem(storageKey: string): void {
      originalStorage.removeItem(storageKey)
    },
  })

  const before = new Map(memory)

  expect(() => createBackupV5()).toThrow()

  expect(memory.get(key)).toBe(
    JSON.stringify(modifiedTransactions)
  )

  expect(changed).toBe(true)

  // O construtor não deve realizar gravações adicionais.
  expect(memory.size).toBe(before.size)
})

it('detecta quando uma chave ausente passa a existir', () => {
  const key = 'personal-finance-transactions'

  // A chave começa inexistente.
  expect(memory.has(key)).toBe(false)

  const originalStorage = globalThis.localStorage
  let changed = false

  vi.stubGlobal('localStorage', {
    getItem(storageKey: string): string | null {
      if (
        storageKey === 'personal-finance-credit-cards' &&
        !changed
      ) {
        changed = true

        // Simula uma gravação externa durante o backup.
        memory.set(key, '[]')
      }

      return originalStorage.getItem(storageKey)
    },

    setItem(storageKey: string, value: string): void {
      originalStorage.setItem(storageKey, value)
    },

    removeItem(storageKey: string): void {
      originalStorage.removeItem(storageKey)
    },
  })

  expect(() => createBackupV5()).toThrow()

  expect(changed).toBe(true)
  expect(memory.get(key)).toBe('[]')
})

it('rejeita pagamentos parcialmente inválidos sem perder registros', () => {
  const paymentsKey = 'personal-finance-card-payments'

  const payments = [
    {
      id: 'pagamento-valido',
      cardId: 'cartao-1',
      invoiceMonth: '2026-11',
      amount: 100,
      date: '2026-11-15',
    },
    {
      id: 'pagamento-invalido',
      cardId: 'cartao-1',
      invoiceMonth: '2026-11',
      amount: -50,
      date: '2026-11-15',
    },
  ]

  memory.set(paymentsKey, JSON.stringify(payments))

  const originalValue = memory.get(paymentsKey)

  expect(() => createBackupV5()).toThrow()

  // Os dados originais devem permanecer intactos.
  expect(memory.get(paymentsKey)).toBe(originalValue)
})

})
