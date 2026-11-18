import { describe, expect, it } from 'vitest'
import { buildMonthInsights } from './monthInsights'

const tx = (date: string, amount: number, category: string, type: 'income' | 'expense' = 'expense') => ({
  date,
  amount,
  category,
  type,
})

const data = [
  // outubro
  tx('2026-10-05', 3000, 'Salário', 'income'),
  tx('2026-10-06', 400, 'Alimentação / Supermercado'),
  tx('2026-10-10', 300, 'Transporte / Combustível'),
  tx('2026-10-25', 999, 'Lazer / Streaming'), // depois do dia 18: fora da comparação do mês atual
  // novembro
  tx('2026-11-05', 3000, 'Salário', 'income'),
  tx('2026-11-06', 560, 'Alimentação / Supermercado'),
  tx('2026-11-10', 150, 'Transporte / Combustível'),
]

describe('comparativos do mês', () => {
  const insights = buildMonthInsights(data, '2026-11', new Date(2026, 10, 18, 12))
  const byId = Object.fromEntries(insights.map(item => [item.id, item]))

  it('no mês atual compara até o mesmo dia do mês passado', () => {
    // 710 agora contra 700 até o dia 18 de outubro (o lazer do dia 25 fica de fora)
    expect(byId.total.title).toBe('Seus gastos estão parecidos com outubro')
  })

  it('aponta a categoria que mais subiu e a que mais caiu', () => {
    expect(byId.up.title).toBe('Alimentação: 40% a mais')
    expect(byId.down.title).toBe('Transporte: 50% a menos')
    expect(byId.up.tone).toBe('bad')
    expect(byId.down.tone).toBe('good')
  })

  it('mostra quanto sobrou das entradas', () => {
    expect(byId.left.title).toBe('Sobrou 76% das suas entradas')
  })

  it('mês passado inteiro quando o mês escolhido já acabou', () => {
    const october = buildMonthInsights(data, '2026-10', new Date(2026, 10, 18))
    expect(october.find(item => item.id === 'biggest')?.title).toBe('Lazer é 59% das suas saídas')
  })

  it('sem dados, nenhum destaque', () => {
    expect(buildMonthInsights([], '2026-11', new Date(2026, 10, 18))).toEqual([])
  })
})
