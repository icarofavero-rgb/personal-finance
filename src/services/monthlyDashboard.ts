
import type { Transaction } from './storage'

export type MonthlyDashboardSummary = {
  month: string
  income: number
  expense: number
  balance: number
  transactionCount: number
}

export function calculateMonthlyDashboard(
  transactions: Transaction[],
  month: string
): MonthlyDashboardSummary {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Mês de referência inválido.')
  }

  const monthlyTransactions = transactions.filter(
    transaction => transaction.date.slice(0, 7) === month
  )

  const incomeCents = monthlyTransactions
    .filter(transaction => transaction.type === 'income')
    .reduce(
      (total, transaction) =>
        total + Math.round(transaction.amount * 100),
      0
    )

  const expenseCents = monthlyTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce(
      (total, transaction) =>
        total + Math.round(transaction.amount * 100),
      0
    )

  return {
    month,
    income: incomeCents / 100,
    expense: expenseCents / 100,
    balance: (incomeCents - expenseCents) / 100,
    transactionCount: monthlyTransactions.length,
  }
}
