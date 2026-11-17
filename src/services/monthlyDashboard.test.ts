
import { describe, expect, it } from 'vitest'

import { calculateMonthlyDashboard } from './monthlyDashboard'
import type { Transaction } from './storage'

const transactions: Transaction[] = [
  {
    id: '1',
    description: 'Salário',
    amount: 3000,
    type: 'income',
    category: 'Trabalho',
    date: '2026-11-05',
  },
  {
    id: '2',
    description: 'Aluguel',
    amount: 1200,
    type: 'expense',
    category: 'Moradia',
    date: '2026-11-10',
  },
  {
    id: '3',
    description: 'Receita anterior',
    amount: 500,
    type: 'income',
    category: 'Outros',
    date: '2026-10-15',
  },
]

describe('Dashboard mensal', () => {
  it('calcula as entradas do mês selecionado', () => {
    const result = calculateMonthlyDashboard(
      transactions,
      '2026-11'
    )

    expect(result.income).toBe(3000)
  })

  it('calcula as saídas do mês selecionado', () => {
    const result = calculateMonthlyDashboard(
      transactions,
      '2026-11'
    )

    expect(result.expense).toBe(1200)
  })

  it('calcula o resultado mensal corretamente', () => {
    const result = calculateMonthlyDashboard(
      transactions,
      '2026-11'
    )

    expect(result.balance).toBe(1800)
  })

  it('não mistura transações de meses diferentes', () => {
    const result = calculateMonthlyDashboard(
      transactions,
      '2026-10'
    )

    expect(result.income).toBe(500)
    expect(result.expense).toBe(0)
  })

  it('retorna valores zerados para meses vazios', () => {
    const result = calculateMonthlyDashboard(
      transactions,
      '2026-09'
    )

    expect(result.balance).toBe(0)
    expect(result.transactionCount).toBe(0)
  })

  it('rejeita meses inválidos', () => {
    expect(() =>
      calculateMonthlyDashboard(transactions, '2026-13')
    ).toThrow()
  })

  it('preserva as transações originais', () => {
    const original = JSON.stringify(transactions)

    calculateMonthlyDashboard(transactions, '2026-11')

    expect(JSON.stringify(transactions)).toBe(original)
  })

  it('calcula valores decimais sem erros de centavos', () => {
    const result = calculateMonthlyDashboard(
      [
        {
          id: 'decimal-1',
          description: 'Receita',
          amount: 0.1,
          type: 'income',
          category: 'Outros',
          date: '2026-11-01',
        },
        {
          id: 'decimal-2',
          description: 'Receita',
          amount: 0.2,
          type: 'income',
          category: 'Outros',
          date: '2026-11-02',
        },
      ],
      '2026-11'
    )

    expect(result.income).toBe(0.3)
  })
})
