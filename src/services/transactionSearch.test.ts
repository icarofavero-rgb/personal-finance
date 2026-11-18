import { describe, expect, it } from 'vitest'
import { matchesSearch, summarize } from './transactionSearch'

const farmacia = { description: 'Drogaria São Paulo', category: 'Saúde / Farmácia', amount: 45.9, type: 'expense' as const }
const salario = { description: 'Salário', category: 'Salário', amount: 3500, type: 'income' as const }

describe('busca nas transações', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(matchesSearch(farmacia, 'FARMACIA')).toBe(true)
    expect(matchesSearch(farmacia, 'sao paulo')).toBe(true)
    expect(matchesSearch(salario, 'salario')).toBe(true)
  })

  it('encontra pelo valor, com vírgula ou ponto', () => {
    expect(matchesSearch(farmacia, '45,90')).toBe(true)
    expect(matchesSearch(farmacia, '45.9')).toBe(true)
    expect(matchesSearch(salario, '3.500')).toBe(true)
  })

  it('todas as palavras precisam aparecer', () => {
    expect(matchesSearch(farmacia, 'drogaria saude')).toBe(true)
    expect(matchesSearch(farmacia, 'drogaria mercado')).toBe(false)
  })

  it('busca vazia mostra tudo; "entrada" e "gasto" filtram o tipo', () => {
    expect(matchesSearch(farmacia, '   ')).toBe(true)
    expect(matchesSearch(salario, 'entrada')).toBe(true)
    expect(matchesSearch(farmacia, 'gasto')).toBe(true)
    expect(matchesSearch(salario, 'gasto')).toBe(false)
  })

  it('soma os resultados', () => {
    expect(summarize([farmacia, salario])).toEqual({ count: 2, income: 3500, expense: 45.9 })
  })
})
