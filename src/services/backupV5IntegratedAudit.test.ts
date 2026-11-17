
import { describe, expect, it } from 'vitest'
import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

const createdAt = '2026-11-15T12:00:00.000Z'

function createBackup(transactionId?: string) {
  return {
    version: 5,
    createdAt,
    transactions: [
      {
        id: 'transaction-1',
        description: 'Recebimento de teste',
        amount: 25,
        type: 'income',
        category: 'Outros',
        date: '2026-11-15',
      },
    ],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
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
    },
  }
}

describe('Auditoria integrada do Backup V5', () => {
  it('rejeita recebimento vinculado a transação inexistente', () => {
    const backup = createBackup('transaction-inexistente')

    const result = safelyAuditBackupRestore(backup)

    expect(result.valid).toBe(false)
    expect(
      result.errors.some(error =>
        error.includes('transação inexistente')
      )
    ).toBe(true)
  })

  it('não rejeita o vínculo quando a transação existe', () => {
    const backup = createBackup('transaction-1')

    const result = safelyAuditBackupRestore(backup)

    expect(
      result.errors.some(error =>
        error.includes('transação inexistente')
      )
    ).toBe(false)
  })

  it('não exige transactionId em recebimentos antigos', () => {
    const backup = createBackup()

    const result = safelyAuditBackupRestore(backup)

    expect(
      result.errors.some(error =>
        error.includes('transação inexistente')
      )
    ).toBe(false)
  })
})
