
import { describe, expect, it } from 'vitest'
import { validateBackupDebtors } from './backupDebtorsValidation'

const createdAt = '2026-11-15T12:00:00.000Z'

function createDebtorsData(transactionId?: string) {
  return {
    debtors: [
      {
        id: 'debtor-1',
        name: 'Pessoa de teste',
        createdAt,
      },
    ],
    debts: [
      {
        id: 'debt-1',
        debtorId: 'debtor-1',
        description: 'Empréstimo de teste',
        amountCents: 10000,
        installments: 1,
        date: '2026-11-15',
        createdAt,
      },
    ],
    payments: [
      {
        id: 'payment-1',
        debtId: 'debt-1',
        amountCents: 2500,
        date: '2026-11-15',
        createdAt,
        ...(transactionId !== undefined
          ? { transactionId }
          : {}),
      },
    ],
  }
}

const transactions = [
  {
    id: 'transaction-1',
    description: 'Recebimento de teste',
    amount: 25,
    type: 'income' as const,
    category: 'Outros',
    date: '2026-11-15',
  },
]

describe('Vínculos de recebimentos dos Devedores', () => {
  it('aceita recebimento sem transactionId', () => {
    expect(() =>
      validateBackupDebtors(
        createDebtorsData(),
        [],
        transactions
      )
    ).not.toThrow()
  })

  it('aceita vínculo com transação existente', () => {
    expect(() =>
      validateBackupDebtors(
        createDebtorsData('transaction-1'),
        [],
        transactions
      )
    ).not.toThrow()
  })

  it('rejeita vínculo com transação inexistente', () => {
    expect(() =>
      validateBackupDebtors(
        createDebtorsData('transaction-inexistente'),
        [],
        transactions
      )
    ).toThrow('transação inexistente')
  })

  it('rejeita vínculo quando não há transações', () => {
    expect(() =>
      validateBackupDebtors(
        createDebtorsData('transaction-1'),
        [],
        []
      )
    ).toThrow('transação inexistente')
  })
})
