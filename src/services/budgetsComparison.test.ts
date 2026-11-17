
import { describe, expect, it } from 'vitest'
import {
  compareBudgetMonths,
  findBudgetHistoryMonth,
  getPreviousBudgetMonth,
  getBudgetVariationType
} from './budgetsComparison'
import type { BudgetHistoryMonth } from './budgetsHistory'

const october: BudgetHistoryMonth = {
  month: '2026-10',
  limitCents: 120000,
  spentCents: 85000,
  remainingCents: 35000,
  progressPercent: 70.8333333333,
  budgetCount: 2,
}

const november: BudgetHistoryMonth = {
  month: '2026-11',
  limitCents: 140000,
  spentCents: 95000,
  remainingCents: 45000,
  progressPercent: 67.8571428571,
  budgetCount: 2,
}

describe('compareBudgetMonths', () => {
  it('calcula a diferença entre os limites', () => {
    const result = compareBudgetMonths(november, october)

    expect(result.limitDifferenceCents).toBe(20000)
  })

  it('calcula a diferença entre os gastos', () => {
    const result = compareBudgetMonths(november, october)

    expect(result.spentDifferenceCents).toBe(10000)
  })

  it('calcula a variação do percentual de consumo', () => {
    const result = compareBudgetMonths(november, october)

    expect(result.progressDifference).toBeCloseTo(-2.97619, 4)
  })

  it('identifica corretamente os meses comparados', () => {
    const result = compareBudgetMonths(november, october)

    expect(result.currentMonth).toBe('2026-11')
    expect(result.previousMonth).toBe('2026-10')
  })

  it('retorna diferenças zero para meses com valores iguais', () => {
    const result = compareBudgetMonths(november, {
      ...november,
      month: '2026-10',
    })

    expect(result.limitDifferenceCents).toBe(0)
    expect(result.spentDifferenceCents).toBe(0)
    expect(result.progressDifference).toBe(0)
  })

  it('não modifica os dados originais', () => {
    const currentCopy = structuredClone(november)
    const previousCopy = structuredClone(october)

    compareBudgetMonths(november, october)

    expect(november).toEqual(currentCopy)
    expect(october).toEqual(previousCopy)
  })
})

describe('seleção dos meses para comparação', () => {
  it('identifica o mês anterior', () => {
    expect(getPreviousBudgetMonth('2026-11')).toBe('2026-10')
  })

  it('identifica dezembro do ano anterior', () => {
    expect(getPreviousBudgetMonth('2026-01')).toBe('2025-12')
  })

  it('rejeita meses inválidos', () => {
    expect(() => getPreviousBudgetMonth('2026-13')).toThrow()
  })

  it('encontra um mês existente no histórico', () => {
    const result = findBudgetHistoryMonth(
      [november, october],
      '2026-10'
    )

    expect(result).toEqual(october)
  })

  it('retorna valores zerados para mês sem orçamento', () => {
    const result = findBudgetHistoryMonth(
      [november],
      '2026-09'
    )

    expect(result).toEqual({
      month: '2026-09',
      limitCents: 0,
      spentCents: 0,
      remainingCents: 0,
      progressPercent: 0,
      budgetCount: 0,
    })
  })
  
})

describe('getBudgetVariationType', () => {
  it('identifica um aumento', () => {
    expect(getBudgetVariationType(15000)).toBe('increase')
  })

  it('identifica uma redução', () => {
    expect(getBudgetVariationType(-8500)).toBe('decrease')
  })

  it('identifica ausência de variação', () => {
    expect(getBudgetVariationType(0)).toBe('neutral')
  })

  it('trata pequenas diferenças de precisão como neutras', () => {
    expect(getBudgetVariationType(0.0000001)).toBe('neutral')
  })

  it('rejeita valores inválidos', () => {
    expect(() => getBudgetVariationType(NaN)).toThrow()
    expect(() => getBudgetVariationType(Infinity)).toThrow()
  })
})
