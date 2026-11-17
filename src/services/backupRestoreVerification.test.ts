
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyBackupRestoreData } from './backupRestoreVerification'
import type { BackupRestorePlan } from './backupRestorePlan'

type PlanV5 = Extract<BackupRestorePlan, { version: 5 }>

function makePlan(): PlanV5 {
  return {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [],
      debts: [],
      payments: [],
    },
  }
}

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
  })
})

describe('Verificação da restauração V5', () => {
  it('aceita os cinco conjuntos gravados corretamente', () => {
    const plan = makePlan()

    storage.set(
      'personal-finance-transactions',
      JSON.stringify(plan.transactions)
    )
    storage.set(
      'personal-finance-credit-cards',
      JSON.stringify(plan.cards)
    )
    storage.set(
      'personal-finance-card-purchases',
      JSON.stringify(plan.purchases)
    )
    storage.set(
      'personal-finance-card-payments',
      JSON.stringify(plan.payments)
    )
    storage.set(
      'personal-finance-debtors-v1',
      JSON.stringify(plan.debtorsData)
    )

    expect(verifyBackupRestoreData(plan)).toBe(true)
  })

  it('rejeita dados dos Devedores ausentes', () => {
    const plan = makePlan()

    storage.set('personal-finance-transactions', '[]')
    storage.set('personal-finance-credit-cards', '[]')
    storage.set('personal-finance-card-purchases', '[]')
    storage.set('personal-finance-card-payments', '[]')

    expect(verifyBackupRestoreData(plan)).toBe(false)
  })

  it('rejeita dados dos Devedores diferentes', () => {
    const plan = makePlan()

    storage.set('personal-finance-transactions', '[]')
    storage.set('personal-finance-credit-cards', '[]')
    storage.set('personal-finance-card-purchases', '[]')
    storage.set('personal-finance-card-payments', '[]')
    storage.set(
      'personal-finance-debtors-v1',
      JSON.stringify({
        debtors: [{ id: 'outro-devedor' }],
        debts: [],
        payments: [],
      })
    )

    expect(verifyBackupRestoreData(plan)).toBe(false)
  })

  it('rejeita transações ausentes', () => {
    const plan = makePlan()

    storage.set('personal-finance-credit-cards', '[]')
    storage.set('personal-finance-card-purchases', '[]')
    storage.set('personal-finance-card-payments', '[]')
    storage.set(
      'personal-finance-debtors-v1',
      JSON.stringify(plan.debtorsData)
    )

    expect(verifyBackupRestoreData(plan)).toBe(false)
  })

  it('não modifica os dados armazenados', () => {
    const plan = makePlan()

    storage.set('personal-finance-transactions', '[]')

    const before = Array.from(storage.entries())

    verifyBackupRestoreData(plan)

    expect(Array.from(storage.entries())).toEqual(before)
  })
})
