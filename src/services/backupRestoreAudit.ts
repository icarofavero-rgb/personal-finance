
import type { BackupRestorePlan } from './backupRestorePlan'

import { inspectRestoreIntegrity } from './backupRestoreIntegrity'
import { inspectRestoreRelationships } from './backupRestoreRelationships'
import { inspectRestorePaymentLinks } from './backupRestorePaymentLinks'

export type BackupRestoreAuditReport = {
  valid: boolean
  errors: string[]
}

export function auditBackupRestore(
  plan: BackupRestorePlan
): BackupRestoreAuditReport {
  const integrity = inspectRestoreIntegrity(plan)

  const relationships = inspectRestoreRelationships(plan)

  const paymentLinks = inspectRestorePaymentLinks(plan)

  const errors = [
    ...integrity.errors,
    ...relationships.errors,
    ...paymentLinks.errors,
  ]

  return {
    valid: errors.length === 0,
    errors,
  }
}
