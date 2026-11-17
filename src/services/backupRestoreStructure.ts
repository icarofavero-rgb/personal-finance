
import type { BackupRestorePlan } from './backupRestorePlan'

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

export function hasValidRestoreStructure(
  value: unknown
): value is BackupRestorePlan {
  if (!isRecord(value)) {
    return false
  }

  if (
    value.version !== 1 &&
    value.version !== 2 &&
    value.version !== 3 &&
    value.version !== 4 &&
    value.version !== 5
  ) {
    return false
  }

  const validBase =
    Array.isArray(value.transactions) &&
    Array.isArray(value.cards) &&
    Array.isArray(value.purchases) &&
    Array.isArray(value.payments)

  if (!validBase) {
    return false
  }

  if (value.version === 5) {
    if (!isRecord(value.debtorsData)) {
      return false
    }

    return (
      Array.isArray(value.debtorsData.debtors) &&
      Array.isArray(value.debtorsData.debts) &&
      Array.isArray(value.debtorsData.payments)
    )
  }

  return true
}
