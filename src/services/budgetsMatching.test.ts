import { describe, expect, it } from 'vitest'

import { calculateBudgetSummary, matchesBudgetCategory } from './budgetsCalculations'

describe('orçamentos por categoria', () => {
  it('a categoria inteira pega todas as subcategorias', () => {
    expect(matchesBudgetCategory('Alimentação / Supermercado', 'Alimentação')).toBe(true)
    expect(matchesBudgetCategory('Alimentação / Delivery', 'Alimentação')).toBe(true)
    expect(matchesBudgetCategory('Alimentação', 'Alimentação')).toBe(true)
    expect(matchesBudgetCategory('Moradia / Aluguel', 'Alimentação')).toBe(false)
  })

  it('"Assinaturas" pega a subcategoria de mesmo nome', () => {
    expect(matchesBudgetCategory('Lazer / Assinaturas', 'Assinaturas')).toBe(true)
    expect(matchesBudgetCategory('Lazer / Jogos', 'Assinaturas')).toBe(false)
  })

  it('o gasto do mês entra no orçamento (antes ficava sempre zerado)', () => {
    const summary = calculateBudgetSummary(
      { id: 'b1', category: 'Alimentação', month: '2026-11', limitCents: 50000 } as never,
      [
        { id: 't1', description: 'Mercado', amount: 300, type: 'expense', category: 'Alimentação / Supermercado', date: '2026-11-05' },
        { id: 't2', description: 'iFood', amount: 250, type: 'expense', category: 'Alimentação / Delivery', date: '2026-11-08' },
        { id: 't3', description: 'Aluguel', amount: 1500, type: 'expense', category: 'Moradia / Aluguel', date: '2026-11-08' },
      ]
    )
    expect(summary.spentCents).toBe(55000)
    expect(summary.exceeded).toBe(true)
  })
})
