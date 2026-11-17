
export const FINANCIAL_MIGRATION_KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  debtors: 'personal-finance-debtors-v1',
  goals: 'personal-finance-goals',
  budgets: 'personal-finance-budgets-v1',
  manualForecast: 'personal-finance-manual-forecasts',
} as const

export type FinancialMigrationArea =
  keyof typeof FINANCIAL_MIGRATION_KEYS

export type FinancialMigrationValidationReport = {
  safe: boolean
  checkedAreas: number
  messages: string[]
}

export function validateFinancialMigrationStorage():
  FinancialMigrationValidationReport {
  const messages: string[] = []

  const areas = Object.entries(
    FINANCIAL_MIGRATION_KEYS
  ) as [FinancialMigrationArea, string][]

  for (const [area, key] of areas) {
    let stored: string | null

    try {
      stored = localStorage.getItem(key)
    } catch {
      messages.push(
        `Não foi possível acessar o armazenamento de ${area}.`
      )
      continue
    }

    if (stored === null) {
      continue
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(stored)
    } catch {
      messages.push(
        `Os dados de ${area} possuem JSON inválido.`
      )
      continue
    }

    if (area === 'debtors') {
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        messages.push(
          'Os dados de devedores possuem formato inválido.'
        )
        continue
      }

      const data = parsed as Record<string, unknown>

      if (
        !Array.isArray(data.debtors) ||
        !Array.isArray(data.debts) ||
        !Array.isArray(data.payments)
      ) {
        messages.push(
          'A estrutura de devedores está incompleta.'
        )
      }

      continue
    }

    if (!Array.isArray(parsed)) {
      messages.push(
        `Os dados de ${area} deveriam conter uma lista.`
      )
    }
  }

  return {
    safe: messages.length === 0,
    checkedAreas: areas.length,
    messages,
  }
}
