
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  validateFinancialMigrationStorage,
} from './financialProfileMigrationValidation'

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

describe('Validação do armazenamento para migração', () => {
  it('aceita armazenamento vazio', () => {
    const report = validateFinancialMigrationStorage()

    expect(report.safe).toBe(true)
    expect(report.checkedAreas).toBe(8)
    expect(report.messages).toEqual([])
  })

  it('aceita estruturas básicas válidas', () => {
    const keys = [
      'personal-finance-transactions',
      'personal-finance-credit-cards',
      'personal-finance-card-purchases',
      'personal-finance-card-payments',
      'personal-finance-goals',
      'personal-finance-budgets-v1',
      'personal-finance-manual-forecasts',
    ]

    keys.forEach(key => {
      simulatedStorage.set(key, '[]')
    })

    simulatedStorage.set(
      'personal-finance-debtors-v1',
      JSON.stringify({
        debtors: [],
        debts: [],
        payments: [],
      })
    )

    const report = validateFinancialMigrationStorage()

    expect(report.safe).toBe(true)
    expect(report.checkedAreas).toBe(8)
  })

  it('bloqueia JSON corrompido', () => {
    simulatedStorage.set(
      'personal-finance-goals',
      '{json-invalido'
    )

    const report = validateFinancialMigrationStorage()

    expect(report.safe).toBe(false)
    expect(
      report.messages.some(message =>
        message.includes('goals')
      )
    ).toBe(true)
  })

  it('bloqueia lista em formato inesperado', () => {
    simulatedStorage.set(
      'personal-finance-transactions',
      '{"id":"incorreto"}'
    )

    const report = validateFinancialMigrationStorage()

    expect(report.safe).toBe(false)
    expect(
      report.messages.some(message =>
        message.includes('transactions')
      )
    ).toBe(true)
  })

  it('bloqueia estrutura incompleta de devedores', () => {
    simulatedStorage.set(
      'personal-finance-debtors-v1',
      JSON.stringify({
        debtors: [],
        debts: [],
      })
    )

    const report = validateFinancialMigrationStorage()

    expect(report.safe).toBe(false)
    expect(
      report.messages.some(message =>
        message.includes('devedores')
      )
    ).toBe(true)
  })

  it('bloqueia falhas de acesso ao armazenamento', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Armazenamento indisponível')
      },
    })

    const report = validateFinancialMigrationStorage()

    expect(report.safe).toBe(false)
    expect(report.messages.length).toBe(8)
  })

  it('não altera os dados originais', () => {
    const original = '[{"id":"original"}]'

    simulatedStorage.set(
      'personal-finance-transactions',
      original
    )

    validateFinancialMigrationStorage()

    expect(
      simulatedStorage.get(
        'personal-finance-transactions'
      )
    ).toBe(original)
  })
})
