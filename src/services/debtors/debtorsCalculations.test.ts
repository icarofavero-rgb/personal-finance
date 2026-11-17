
import { describe, expect, it } from 'vitest'
import {
  calculateDebtSummary,
  validateDebtorPayment,
} from './debtorsCalculations'
import type {
  DebtorDebt,
  DebtorPayment,
} from './debtorsTypes'

const debt: DebtorDebt = {
  id: 'debt-1',
  debtorId: 'person-1',
  description: 'Notebook',
  amountCents: 120000,
  installments: 6,
  date: '2026-11-08',
  createdAt: '2026-11-08T10:00:00',
}

function payment(
  id: string,
  amountCents: number
): DebtorPayment {
  return {
    id,
    debtId: debt.id,
    amountCents,
    date: '2026-11-08',
    createdAt: '2026-11-08T11:00:00',
  }
}

describe('Cálculos de devedores', () => {
  it('calcula dívida sem pagamentos', () => {
    const result = calculateDebtSummary(debt, [])

    expect(result.remainingCents).toBe(120000)
    expect(result.paidInstallments).toBe(0)
    expect(result.status).toBe('pending')
  })

  it('aceita pagamentos parciais', () => {
    const result = calculateDebtSummary(
      debt,
      [payment('p1', 3750)]
    )

    expect(result.receivedCents).toBe(3750)
    expect(result.remainingCents).toBe(116250)
    expect(result.status).toBe('partial')
  })

  it('calcula parcelas totalmente cobertas', () => {
    const result = calculateDebtSummary(
      debt,
      [
        payment('p1', 15000),
        payment('p2', 30000),
      ]
    )

    expect(result.paidInstallments).toBe(2)
    expect(result.remainingCents).toBe(75000)
  })

  it('permite quitação completa', () => {
    const result = calculateDebtSummary(
      debt,
      [payment('p1', 120000)]
    )

    expect(result.remainingCents).toBe(0)
    expect(result.paidInstallments).toBe(6)
    expect(result.status).toBe('paid')
  })

  it('impede pagamento acima do saldo', () => {
    expect(() =>
      validateDebtorPayment(
        debt,
        [payment('p1', 100000)],
        25000
      )
    ).toThrow(
      'O pagamento não pode ultrapassar o saldo restante.'
    )
  })

  it('impede valores negativos', () => {
    expect(() =>
      validateDebtorPayment(debt, [], -100)
    ).toThrow('Informe um valor válido.')
  })
})
