
import type { ManualForecast } from './manualForecastStorage'

export type ManualForecastSummary = {
  month: string
  income: number
  expense: number
  balance: number
  count: number
}

export function calculateManualForecastSummary(
  forecasts: ManualForecast[],
  month: string
): ManualForecastSummary {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Mês de referência inválido.')
  }

  let incomeCents = 0
  let expenseCents = 0
  let count = 0

  for (const forecast of forecasts) {
    if (forecast.date.slice(0, 7) !== month) {
      continue
    }

    const cents = Math.round(forecast.amount * 100)

    if (forecast.type === 'income') {
      incomeCents += cents
    } else {
      expenseCents += cents
    }

    count++
  }

  return {
    month,
    income: incomeCents / 100,
    expense: expenseCents / 100,
    balance: (incomeCents - expenseCents) / 100,
    count,
  }
}
