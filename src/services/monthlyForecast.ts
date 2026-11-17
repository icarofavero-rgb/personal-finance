

import type { Transaction } from './storage'

export type MonthlyForecast = {
  month: string
  recordedIncome: number
  recordedExpense: number
  futureIncome: number
  futureExpense: number
  recordedBalance: number
  futureBalance: number
  expectedBalance: number
}

export function calculateMonthlyForecast(
  transactions: Transaction[],
  month: string,
  today: string
): MonthlyForecast {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('Mês inválido.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error('Data de referência inválida.')
  }

  let recordedIncome = 0
  let recordedExpense = 0
  let futureIncome = 0
  let futureExpense = 0

  for (const transaction of transactions) {
    if (transaction.date.slice(0, 7) !== month) {
      continue
    }

    const cents = Math.round(transaction.amount * 100)
    const isFuture = transaction.date > today

    if (transaction.type === 'income') {
      if (isFuture) {
        futureIncome += cents
      } else {
        recordedIncome += cents
      }
    } else if (transaction.type === 'expense') {
      if (isFuture) {
        futureExpense += cents
      } else {
        recordedExpense += cents
      }
    }
  }

  return {
    month,
    recordedIncome: recordedIncome / 100,
    recordedExpense: recordedExpense / 100,
    futureIncome: futureIncome / 100,
    futureExpense: futureExpense / 100,
    recordedBalance: (recordedIncome - recordedExpense) / 100,
    futureBalance: (futureIncome - futureExpense) / 100,
    expectedBalance:
      (recordedIncome + futureIncome -
        recordedExpense - futureExpense) / 100,
  }
}
