
import { describe, expect, it } from 'vitest'
import { calculateMonthlyForecast } from './monthlyForecast'
import type { Transaction } from './storage'

const transactions: Transaction[] = [
  {
    id: '1',
    description: 'Salário',
    amount: 2800,
    type: 'income',
    category: 'Trabalho',
    date: '2026-11-05',
  },
  {
    id: '2',
    description: 'Conta paga',
    amount: 150,
    type: 'expense',
    category: 'Casa',
    date: '2026-11-08',
  },
  {
    id: '3',
    description: 'Conta futura',
    amount: 300,
    type: 'expense',
    category: 'Casa',
    date: '2026-11-15',
  },
  {
    id: '4',
    description: 'Receita futura',
    amount: 500,
    type: 'income',
    category: 'Outros',
    date: '2026-11-25',
  },
  {
    id: '5',
    description: 'Outro mês',
    amount: 900,
    type: 'expense',
    category: 'Outros',
    date: '2026-10-10',
  },
]

describe('Projeção mensal', () => {
  const today = '2026-11-08'

  it('calcula entradas até a data de referência', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-11', today
    )
    expect(result.recordedIncome).toBe(2800)
  })

  it('calcula saídas até a data de referência', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-11', today
    )
    expect(result.recordedExpense).toBe(150)
  })

  it('identifica entradas futuras', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-11', today
    )
    expect(result.futureIncome).toBe(500)
  })

  it('identifica saídas futuras', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-11', today
    )
    expect(result.futureExpense).toBe(300)
  })

  it('calcula o resultado previsto do mês', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-11', today
    )
    expect(result.expectedBalance).toBe(2850)
  })

  it('não mistura transações de outros meses', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-10', today
    )
    expect(result.recordedExpense).toBe(900)
    expect(result.futureExpense).toBe(0)
  })

  it('retorna valores zerados para meses vazios', () => {
    const result = calculateMonthlyForecast(
      transactions, '2026-12', today
    )
    expect(result.expectedBalance).toBe(0)
  })

  it('não modifica as transações originais', () => {
    const original = JSON.stringify(transactions)
    calculateMonthlyForecast(transactions, '2026-11', today)
    expect(JSON.stringify(transactions)).toBe(original)
  })
})
