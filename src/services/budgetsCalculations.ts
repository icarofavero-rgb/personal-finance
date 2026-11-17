
import type { Transaction } from './storage'
import type { Budget } from './budgetsStorage'

export type BudgetSummary = {
  limitCents: number
  spentCents: number
  remainingCents: number
  progressPercent: number
  exceeded: boolean
}

export function calculateBudgetSummary(
  budget: Budget,
  transactions: Transaction[]
): BudgetSummary {
  const spentCents = transactions
    .filter(transaction =>
      transaction.type === 'expense' &&
      transaction.category === budget.category &&
      transaction.date.startsWith(budget.month)
    )
    .reduce(
      (total, transaction) =>
        total + Math.round(transaction.amount * 100),
      0
    )

  const remainingCents = budget.limitCents - spentCents

  const progressPercent =
    budget.limitCents > 0
      ? (spentCents / budget.limitCents) * 100
      : 0

  return {
    limitCents: budget.limitCents,
    spentCents,
    remainingCents,
    progressPercent,
    exceeded: spentCents > budget.limitCents,
  }
}
