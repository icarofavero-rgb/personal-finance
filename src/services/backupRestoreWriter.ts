
import type { BackupRestorePlan } from './backupRestorePlan'

const STORAGE_KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  debtors: 'personal-finance-debtors-v1',
} as const

export function writeBackupRestoreData(
  plan: BackupRestorePlan
): void {
  if (plan.version !== 4 && plan.version !== 5) {
    throw new Error(
      'Este serviço aceita apenas backups V4 e V5.'
    )
  }

  const entries: Array<[string, string]> = [
    [
      STORAGE_KEYS.transactions,
      JSON.stringify(plan.transactions),
    ],
    [
      STORAGE_KEYS.cards,
      JSON.stringify(plan.cards),
    ],
    [
      STORAGE_KEYS.purchases,
      JSON.stringify(plan.purchases),
    ],
    [
      STORAGE_KEYS.payments,
      JSON.stringify(plan.payments),
    ],
  ]

  if (plan.version === 5) {
    entries.push([
      STORAGE_KEYS.debtors,
      JSON.stringify(plan.debtorsData),
    ])
  }

  for (const [key, value] of entries) {
    localStorage.setItem(key, value)
  }
}
