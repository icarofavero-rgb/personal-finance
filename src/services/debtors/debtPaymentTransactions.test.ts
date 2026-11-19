import { beforeEach, describe, expect, it } from 'vitest'

import { buildDebtPaymentTransactions, syncDebtPaymentTransactions } from './debtPaymentTransactions'
import type { DebtorsData } from './debtorsStorage'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
})

const now = '2026-11-19T10:00:00.000Z'
const data = (payments: DebtorsData['payments']): DebtorsData => ({
  debtors: [
    { id: 'me', name: 'João', createdAt: now, kind: 'i-owe' },
    { id: 'other', name: 'Ana', createdAt: now },
  ],
  debts: [
    { id: 'd1', debtorId: 'me', description: 'Empréstimo', amountCents: 50000, installments: 1, date: '2026-11-10', createdAt: now },
    { id: 'd2', debtorId: 'other', description: 'Almoço', amountCents: 3000, installments: 1, date: '2026-11-10', createdAt: now },
  ],
  payments,
})

const transactions = () => JSON.parse(memory.get('personal-finance-transactions') ?? '[]') as { id: string; amount: number; type: string }[]

describe('Eu devo: pagamentos viram saídas', () => {
  beforeEach(() => memory.clear())

  it('só os pagamentos do que EU devo viram saída', () => {
    const result = buildDebtPaymentTransactions(
      data([
        { id: 'p1', debtId: 'd1', amountCents: 20000, date: '2026-11-19', createdAt: now },
        { id: 'p2', debtId: 'd2', amountCents: 3000, date: '2026-11-19', createdAt: now },
      ])
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'debt-payment-p1', amount: 200, type: 'expense', category: 'Finanças / Dívidas com pessoas' })
  })

  it('cria, atualiza e remove junto com o pagamento, sem mexer nas outras transações', () => {
    memory.set('personal-finance-transactions', JSON.stringify([{ id: 't1', description: 'Salário', amount: 3000, type: 'income', category: 'Renda', date: '2026-11-05' }]))

    syncDebtPaymentTransactions(data([{ id: 'p1', debtId: 'd1', amountCents: 20000, date: '2026-11-19', createdAt: now }]))
    expect(transactions().map(item => item.id)).toEqual(['t1', 'debt-payment-p1'])

    syncDebtPaymentTransactions(data([{ id: 'p1', debtId: 'd1', amountCents: 25000, date: '2026-11-19', createdAt: now }]))
    expect(transactions().find(item => item.id === 'debt-payment-p1')?.amount).toBe(250)

    syncDebtPaymentTransactions(data([]))
    expect(transactions().map(item => item.id)).toEqual(['t1'])
  })
})
