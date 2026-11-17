
import type { Budget } from './budgetsStorage'
import type { Transaction } from './storage'
import { calculateBudgetSummary } from './budgetsCalculations'

export type BudgetHistoryMonth = {
  month: string
  limitCents: number
  spentCents: number
  remainingCents: number
  progressPercent: number
  budgetCount: number
}

export function calculateBudgetsHistory(
  budgets: Budget[],
  transactions: Transaction[]
): BudgetHistoryMonth[] {
  const months = [...new Set(budgets.map(budget => budget.month))]
    .sort((a, b) => b.localeCompare(a))

  return months.map(month => {
    const monthlyBudgets = budgets.filter(
      budget => budget.month === month
    )

    const summaries = monthlyBudgets.map(budget =>
      calculateBudgetSummary(budget, transactions)
    )

    const limitCents = summaries.reduce(
      (total, summary) => total + summary.limitCents,
      0
    )

    const spentCents = summaries.reduce(
      (total, summary) => total + summary.spentCents,
      0
    )

    return {
      month,
      limitCents,
      spentCents,
      remainingCents: limitCents - spentCents,
      progressPercent:
        limitCents > 0
          ? (spentCents / limitCents) * 100
          : 0,
      budgetCount: monthlyBudgets.length,
    }
  })
}
