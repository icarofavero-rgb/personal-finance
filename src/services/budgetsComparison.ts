
import type { BudgetHistoryMonth } from './budgetsHistory'

export type BudgetComparison = {
  currentMonth: string
  previousMonth: string
  limitDifferenceCents: number
  spentDifferenceCents: number
  progressDifference: number
}

export function compareBudgetMonths(
  current: BudgetHistoryMonth,
  previous: BudgetHistoryMonth
): BudgetComparison {
  return {
    currentMonth: current.month,
    previousMonth: previous.month,
    limitDifferenceCents:
      current.limitCents - previous.limitCents,
    spentDifferenceCents:
      current.spentCents - previous.spentCents,
    progressDifference:
      current.progressPercent - previous.progressPercent,
  }
}

export function getPreviousBudgetMonth(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Informe um mês válido.')
  }

  const [year, monthNumber] = month.split('-').map(Number)

  const previousYear = monthNumber === 1 ? year - 1 : year
  const previousMonth = monthNumber === 1 ? 12 : monthNumber - 1

  if (previousYear < 1) {
    throw new Error('Não existe mês anterior válido.')
  }

  return `${String(previousYear).padStart(4, '0')}-${String(
    previousMonth
  ).padStart(2, '0')}`
}

export function findBudgetHistoryMonth(
  history: BudgetHistoryMonth[],
  month: string
): BudgetHistoryMonth {
  const existing = history.find(item => item.month === month)

  if (existing) {
    return existing
  }

  return {
    month,
    limitCents: 0,
    spentCents: 0,
    remainingCents: 0,
    progressPercent: 0,
    budgetCount: 0,
  }
}

export type BudgetVariationType =
  | 'increase'
  | 'decrease'
  | 'neutral'

export function getBudgetVariationType(
  value: number
): BudgetVariationType {
  if (!Number.isFinite(value)) {
    throw new Error('Informe uma variação válida.')
  }

  if (value > 0.000001) return 'increase'
  if (value < -0.000001) return 'decrease'

  return 'neutral'
}
