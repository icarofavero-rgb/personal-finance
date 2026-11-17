
import { describe, expect, it } from 'vitest'
import { calculateBudgetsHistory } from './budgetsHistory'
import type { Budget } from './budgetsStorage'
import type { Transaction } from './storage'

const budgets: Budget[] = [
  {
    id: 'budget-nov',
    category: 'Alimentação',
    month: '2026-11',
    limitCents: 60000,
    createdAt: '2026-11-01T12:00:00.000Z',
  },
  {
    id: 'budget-oct',
    category: 'Alimentação',
    month: '2026-10',
    limitCents: 40000,
    createdAt: '2026-10-01T12:00:00.000Z',
  },
]

const transactions: Transaction[] = [
  {
    id: 'expense-nov',
    description: 'Mercado',
    amount: 150,
    type: 'expense',
    category: 'Alimentação',
    date: '2026-11-10',
  },
  {
    id: 'expense-oct',
    description: 'Mercado',
    amount: 100,
    type: 'expense',
    category: 'Alimentação',
    date: '2026-10-10',
  },
]

describe('calculateBudgetsHistory', () => {
  it('retorna vazio quando não existem orçamentos', () => {
    expect(calculateBudgetsHistory([], transactions)).toEqual([])
  })

  it('ordena os meses do mais recente para o mais antigo', () => {
    const history = calculateBudgetsHistory(budgets, transactions)

    expect(history.map(item => item.month)).toEqual([
      '2026-11',
      '2026-10',
    ])
  })

  it('calcula o limite e os gastos de novembro', () => {
    const history = calculateBudgetsHistory(budgets, transactions)
    const november = history.find(item => item.month === '2026-11')

    expect(november?.limitCents).toBe(60000)
    expect(november?.spentCents).toBe(15000)
    expect(november?.remainingCents).toBe(45000)
    expect(november?.progressPercent).toBe(25)
    expect(november?.budgetCount).toBe(1)
  })

  it('não mistura despesas de meses diferentes', () => {
    const history = calculateBudgetsHistory(budgets, transactions)
    const october = history.find(item => item.month === '2026-10')

    expect(october?.spentCents).toBe(10000)
    expect(october?.remainingCents).toBe(30000)
  })

  it('não modifica os dados recebidos', () => {
    const originalBudgets = structuredClone(budgets)
    const originalTransactions = structuredClone(transactions)

    calculateBudgetsHistory(budgets, transactions)

    expect(budgets).toEqual(originalBudgets)
    expect(transactions).toEqual(originalTransactions)
  })
})
