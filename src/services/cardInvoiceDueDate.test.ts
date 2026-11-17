
import { describe, expect, it } from 'vitest'

import {
  getCardInvoiceDueDate,
  getDaysUntilDue,
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
