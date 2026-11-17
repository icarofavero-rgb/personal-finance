
import { describe, expect, it } from 'vitest'

import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'
import type { BackupRestorePlan } from './backupRestorePlan'

function makePlan(): Extract<
  BackupRestorePlan,
  { version: 5 }
> {
  return {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [
        {
          id: 'person-1',
          name: 'Mariana',
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      debts: [
        {
          id: 'debt-1',
          debtorId: 'person-1',
          description: 'Empréstimo',
          amountCents: 50000,
          installments: 5,
          date: '2026-11-08',
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      payments: [],
    },
  }
}

describe('Auditoria segura do Backup V5', () => {
  it('aceita backup V5 válido', () => {
    const result = safelyAuditBackupRestore(makePlan())

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejeita V5 sem dados de Devedores', () => {
    const plan = makePlan()

    const { debtorsData: _removed, ...incomplete } = plan

    const result = safelyAuditBackupRestore(incomplete)

    expect(result.valid).toBe(false)
  })

  it('rejeita dívida com valor inválido', () => {
    const plan = makePlan()

    plan.debtorsData.debts[0].amountCents = -100

    const result = safelyAuditBackupRestore(plan)

    expect(result.valid).toBe(false)
  })

  it('rejeita recebimento acima da dívida', () => {
    const plan = makePlan()

    plan.debtorsData.payments.push({
      id: 'payment-1',
      debtId: 'debt-1',
      amountCents: 60000,
      date: '2026-11-08',
      createdAt: '2026-11-08T10:00:00.000Z',
    })

    const result = safelyAuditBackupRestore(plan)

    expect(result.valid).toBe(false)
  })

  it('aceita recebimento parcial', () => {
    const plan = makePlan()

    plan.debtorsData.payments.push({
      id: 'payment-1',
      debtId: 'debt-1',
      amountCents: 3783,
      date: '2026-11-08',
      createdAt: '2026-11-08T10:00:00.000Z',
    })

    const result = safelyAuditBackupRestore(plan)

    expect(result.valid).toBe(true)
  })

  it('rejeita dívida com devedor inexistente', () => {
    const plan = makePlan()

    plan.debtorsData.debts[0].debtorId = 'inexistente'

    const result = safelyAuditBackupRestore(plan)

    expect(result.valid).toBe(false)
  })

  
it('não modifica os dados recebidos', () => {
  const plan = makePlan()
  const original = JSON.stringify(plan)

  safelyAuditBackupRestore(plan)

  expect(JSON.stringify(plan)).toBe(original)
})
})