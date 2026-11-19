
import { describe, expect, it } from 'vitest'

import {
  getCardInvoiceDueDate,
  getDaysUntilDue,
  getCurrentInvoiceMonth,
} from './cardInvoiceDueDate'

describe('Datas de vencimento das faturas', () => {
  it('calcula o vencimento no mês seguinte', () => {
    expect(
      getCardInvoiceDueDate('2026-11', 20)
    ).toBe('2026-12-20')
  })

  it('ajusta o dia 31 para fevereiro de 2027', () => {
    expect(
      getCardInvoiceDueDate('2027-01', 31)
    ).toBe('2027-02-28')
  })

  it('considera fevereiro de ano bissexto', () => {
    expect(
      getCardInvoiceDueDate('2028-01', 31)
    ).toBe('2028-02-29')
  })

  it('ajusta o dia 31 para abril', () => {
    expect(
      getCardInvoiceDueDate('2027-03', 31)
    ).toBe('2027-04-30')
  })

  it('calcula corretamente a virada de ano', () => {
    expect(
      getCardInvoiceDueDate('2026-12', 15)
    ).toBe('2027-01-15')
  })

  it('identifica três dias antes do vencimento', () => {
    expect(
      getDaysUntilDue('2026-12-20', '2026-12-17')
    ).toBe(3)
  })

  it('identifica vencimento no dia atual', () => {
    expect(
      getDaysUntilDue('2026-12-20', '2026-12-20')
    ).toBe(0)
  })

  it('identifica fatura vencida há dois dias', () => {
    expect(
      getDaysUntilDue('2026-12-20', '2026-12-22')
    ).toBe(-2)
  })
})

it('com o fechamento: vence no próprio mês quando o vencimento é depois do fechamento', () => {
  expect(getCardInvoiceDueDate('2026-12', 20, 10)).toBe('2026-12-20')
  expect(getCardInvoiceDueDate('2026-11', 5, 28)).toBe('2026-12-05')
})

it('fatura da vez: muda depois do vencimento', () => {
  const card = { closingDay: 10, dueDay: 20 }
  expect(getCurrentInvoiceMonth(card, '2026-11-18')).toBe('2026-11')
  expect(getCurrentInvoiceMonth(card, '2026-11-20')).toBe('2026-11')
  expect(getCurrentInvoiceMonth(card, '2026-11-21')).toBe('2026-12')
  expect(getCurrentInvoiceMonth({ closingDay: 28, dueDay: 5 }, '2026-11-18')).toBe('2026-11')
  expect(getCurrentInvoiceMonth({ closingDay: 28, dueDay: 5 }, '2026-12-06')).toBe('2026-12')
})
