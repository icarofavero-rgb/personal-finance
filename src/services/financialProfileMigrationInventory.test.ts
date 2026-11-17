
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getFinancialProfileMigrationInventory,
} from './financialProfileMigrationInventory'

const simulatedStorage = new Map<string, string>()

beforeEach(() => {
  simulatedStorage.clear()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      simulatedStorage.get(key) ?? null,
  })
})

describe('Inventário da migração financeira', () => {
  it('identifica armazenamento vazio', () => {
    const inventory =
      getFinancialProfileMigrationInventory()

    expect(inventory.totalAreasWithData).toBe(0)

    expect(
      Object.values(inventory.areas).every(
        exists => exists === false
      )
    ).toBe(true)
  })

  it('identifica áreas com dados armazenados', () => {
    simulatedStorage.set(
      'personal-finance-transactions',
      '[]'
    )

    simulatedStorage.set(
      'personal-finance-credit-cards',
      '[]'
    )

    const inventory =
      getFinancialProfileMigrationInventory()

    expect(inventory.areas.transactions).toBe(true)
    expect(inventory.areas.cards).toBe(true)
    expect(inventory.areas.purchases).toBe(false)
    expect(inventory.totalAreasWithData).toBe(2)
  })

  it('identifica as cinco áreas financeiras', () => {
    const keys = [
      'personal-finance-transactions',
      'personal-finance-credit-cards',
      'personal-finance-card-purchases',
      'personal-finance-card-payments',
      'personal-finance-debtors-v1',
    ]

    keys.forEach(key => {
      simulatedStorage.set(key, '[]')
    })

    const inventory =
      getFinancialProfileMigrationInventory()

    expect(inventory.totalAreasWithData).toBe(5)
  })

  it('não modifica os dados originais', () => {
    const original = '[{"id":"original"}]'

    simulatedStorage.set(
      'personal-finance-transactions',
      original
    )

    getFinancialProfileMigrationInventory()

    expect(
      simulatedStorage.get(
        'personal-finance-transactions'
      )
    ).toBe(original)
  })

  it('registra uma data válida de captura', () => {
    const inventory =
      getFinancialProfileMigrationInventory()

    expect(
      Number.isFinite(
        Date.parse(inventory.capturedAt)
      )
    ).toBe(true)
  })

it('identifica as três novas áreas financeiras', () => {
  simulatedStorage.set(
    'personal-finance-goals',
    '[]'
  )

  simulatedStorage.set(
    'personal-finance-budgets-v1',
    '[]'
  )

  simulatedStorage.set(
    'personal-finance-manual-forecasts',
    '[]'
  )

  const inventory =
    getFinancialProfileMigrationInventory()

  expect(inventory.areas.goals).toBe(true)
  expect(inventory.areas.budgets).toBe(true)
  expect(inventory.areas.manualForecast).toBe(true)
  expect(inventory.totalAreasWithData).toBe(3)
})

it('identifica todas as oito áreas financeiras', () => {
  const keys = [
    'personal-finance-transactions',
    'personal-finance-credit-cards',
    'personal-finance-card-purchases',
    'personal-finance-card-payments',
    'personal-finance-debtors-v1',
    'personal-finance-goals',
    'personal-finance-budgets-v1',
    'personal-finance-manual-forecasts',
  ]

  keys.forEach(key => {
    simulatedStorage.set(key, '[]')
  })

  const inventory =
    getFinancialProfileMigrationInventory()

  expect(inventory.totalAreasWithData).toBe(8)

  expect(
    Object.values(inventory.areas).every(Boolean)
  ).toBe(true)
})

it('não altera valores armazenados inválidos', () => {
  const invalidGoals = '{json-invalido'

  simulatedStorage.set(
    'personal-finance-goals',
    invalidGoals
  )

  const inventory =
    getFinancialProfileMigrationInventory()

  expect(inventory.areas.goals).toBe(true)

  expect(
    simulatedStorage.get('personal-finance-goals')
  ).toBe(invalidGoals)
})

})
