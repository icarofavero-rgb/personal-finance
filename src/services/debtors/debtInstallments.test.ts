import { describe, expect, it } from 'vitest'

import { getMonthInstallment, getOpenInstallments, installmentAmounts, installmentDueDate } from './debtInstallments'
import type { DebtorDebt, DebtorPayment } from './debtorsTypes'

const debt: DebtorDebt = {
  id: 'd1',
  debtorId: 'p1',
  description: 'Celular',
  amountCents: 100000, // R$ 1.000 em 3x
  installments: 3,
  date: '2026-10-05',
  dueDate: '2026-10-15',
  createdAt: '2026-10-05T10:00:00.000Z',
}

const pay = (amountCents: number): DebtorPayment => ({ id: `p${amountCents}`, debtId: 'd1', amountCents, date: '2026-10-15', createdAt: '' })

describe('parcela do mês', () => {
  it('divide o valor e os centavos que sobram vão para as primeiras', () => {
    expect(installmentAmounts(100000, 3)).toEqual([33334, 33333, 33333])
  })

  it('vence todo mês no mesmo dia (dia 31 vira o último dia do mês)', () => {
    expect(installmentDueDate(debt, 2)).toBe('2026-11-15')
    expect(installmentDueDate({ date: '2026-01-31' }, 2)).toBe('2026-02-28')
  })

  it('mostra a parcela do mês atual', () => {
    const november = getMonthInstallment(debt, [pay(33334)], '2026-11')
    expect(november).toMatchObject({ number: 2, total: 3, amountCents: 33333, status: 'open', overdueCents: 0, dueDate: '2026-11-15' })
  })

  it('pagamento parcial e parcelas anteriores em atraso', () => {
    expect(getMonthInstallment(debt, [pay(40000)], '2026-11')).toMatchObject({ status: 'partial', remainingCents: 33333 - (40000 - 33334) })
    expect(getMonthInstallment(debt, [], '2026-11')).toMatchObject({ status: 'open', overdueCents: 33334 })
  })

  it('fora do período das parcelas não há parcela do mês', () => {
    expect(getMonthInstallment(debt, [], '2026-09')).toBeNull()
    expect(getMonthInstallment(debt, [], '2027-01')).toBeNull()
  })
})

describe('adiantar parcelas', () => {
  it('lista as parcelas que faltam, já descontando o que foi pago', () => {
    expect(getOpenInstallments(debt, [pay(40000)]).map(item => [item.number, item.remainingCents])).toEqual([
      [2, 33333 - (40000 - 33334)],
      [3, 33333],
    ])
  })
})
