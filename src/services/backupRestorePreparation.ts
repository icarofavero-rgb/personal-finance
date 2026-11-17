
import type { BackupRestorePlan } from './backupRestorePlan'

import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

export type PreparedBackup = {
  plan: BackupRestorePlan
  readyForRestore: boolean
  warnings: string[]
}

export function prepareBackupRestore(
  plan: BackupRestorePlan
): PreparedBackup {
  const warnings: string[] = []

  if (plan.version !== 4) {
    warnings.push(
      'Backup antigo: a compatibilidade precisa ser verificada.'
    )
  }

  const audit = safelyAuditBackupRestore(plan)

  if (!audit.valid) {
    warnings.push(...audit.errors)
  }

  if (
    plan.transactions.length === 0 &&
    plan.cards.length === 0 &&
    plan.purchases.length === 0 &&
    plan.payments.length === 0
  ) {
    warnings.push(
      'O backup não contém registros financeiros.'
    )
  }

  return {
    plan,
    readyForRestore:
      plan.version === 4 &&
      audit.valid,
    warnings,
  }
}
