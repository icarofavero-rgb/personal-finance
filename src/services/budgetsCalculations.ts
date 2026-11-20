
import type { Transaction } from './storage'
import type { Budget } from './budgetsStorage'

export type BudgetSummary = {
  limitCents: number
  spentCents: number
  remainingCents: number
  progressPercent: number
  exceeded: boolean
}

/**
 * A transação entra no orçamento? O orçamento é de uma categoria inteira
 * ("Alimentação" pega "Alimentação / Supermercado", "Alimentação / Delivery"…)
 * ou de uma subcategoria ("Assinaturas" pega "Lazer / Assinaturas").
 */
export function matchesBudgetCategory(transactionCategory: string, budgetCategory: string): boolean {
  if (transactionCategory === budgetCategory) return true
  if (transactionCategory.startsWith(`${budgetCategory} /`)) return true
  return transactionCategory.endsWith(`/ ${budgetCategory}`)
}

export function calculateBudgetSummary(
  budget: Budget,
  transactions: Transaction[]
): BudgetSummary {
  const spentCents = transactions
    .filter(transaction =>
      transaction.type === 'expense' &&
      matchesBudgetCategory(transaction.category, budget.category) &&
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
