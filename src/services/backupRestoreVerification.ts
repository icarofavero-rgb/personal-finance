
import type { BackupRestorePlan } from './backupRestorePlan'

export function verifyBackupRestoreData(
  plan: BackupRestorePlan
): boolean {
  if (plan.version !== 4 && plan.version !== 5) {
    return false
  }

  const expected: Record<string, string> = {
    'personal-finance-transactions':
      JSON.stringify(plan.transactions),

    'personal-finance-credit-cards':
      JSON.stringify(plan.cards),

    'personal-finance-card-purchases':
      JSON.stringify(plan.purchases),

    'personal-finance-card-payments':
      JSON.stringify(plan.payments),
  }

  if (plan.version === 5) {
    expected['personal-finance-debtors-v1'] =
      JSON.stringify(plan.debtorsData)
  }

  return Object.entries(expected).every(
    ([key, value]) => localStorage.getItem(key) === value
  )
}
