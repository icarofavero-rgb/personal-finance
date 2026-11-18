import { describe, expect, it } from 'vitest'
import { nextOccurrence, occurrenceDate, planRecurring, type RecurringRule } from './recurringStorage'

const rule = (changes: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  description: 'Aluguel',
  amount: 1200,
  type: 'expense',
  category: 'Moradia / Aluguel',
  dayOfMonth: 10,
  startMonth: '2026-09',
  generatedThrough: '2026-09',
  createdAt: '2026-09-10T00:00:00Z',
  ...changes,
})

describe('transações recorrentes', () => {
  it('lança os meses que já chegaram e para no mês que ainda não chegou', () => {
    const result = planRecurring([rule()], new Set(), '2026-11-18')

    expect(result.transactions.map(item => item.date)).toEqual(['2026-10-10', '2026-11-10'])
    expect(result.transactions[0].id).toBe('rec-r1-2026-10')
    expect(result.rules[0].generatedThrough).toBe('2026-11')
  })

  it('antes do dia do mês, ainda não lança', () => {
    const result = planRecurring([rule({ generatedThrough: '2026-10' })], new Set(), '2026-11-09')
    expect(result.transactions).toEqual([])
    expect(result.changed).toBe(false)
  })

  it('nunca duplica: id já existente (ex.: veio de outro aparelho) não é criado de novo', () => {
    const result = planRecurring([rule()], new Set(['rec-r1-2026-10']), '2026-11-18')
    expect(result.transactions.map(item => item.id)).toEqual(['rec-r1-2026-11'])
  })

  it('regra pausada não lança nada', () => {
    expect(planRecurring([rule({ paused: true })], new Set(), '2027-01-01').transactions).toEqual([])
  })

  it('dia 31 vira o último dia em meses curtos', () => {
    expect(occurrenceDate({ dayOfMonth: 31 }, '2026-02')).toBe('2026-02-28')
    expect(occurrenceDate({ dayOfMonth: 31 }, '2026-04')).toBe('2026-04-30')
  })

  it('mostra a próxima data', () => {
    expect(nextOccurrence(rule({ generatedThrough: '2026-11' }))).toBe('2026-12-10')
  })
})
