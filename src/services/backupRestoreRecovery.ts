
import type { BackupRestorePlan } from './backupRestorePlan'

import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

export type PendingBackupRestore = {
  operationId: string
  createdAt: string
  previousData: BackupRestorePlan
  targetData: BackupRestorePlan
}

const RECOVERY_KEY = 'personal-finance-pending-backup-restore'

export function getPendingBackupRestore():
  PendingBackupRestore | null {
  const saved = localStorage.getItem(RECOVERY_KEY)

  if (saved === null) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      'O registro de recuperação do backup está corrompido.'
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      'O registro de recuperação do backup é inválido.'
    )
  }

  const operation = parsed as Record<string, unknown>

  if (
    typeof operation.operationId !== 'string' ||
    operation.operationId.trim().length === 0 ||
    typeof operation.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(operation.createdAt)) ||
    !operation.previousData ||
    !operation.targetData
  ) {
    throw new Error(
      'O registro de recuperação está incompleto.'
    )
  }

  
  const previousAudit = safelyAuditBackupRestore(
    operation.previousData
  )

  const targetAudit = safelyAuditBackupRestore(
    operation.targetData
  )

  if (!previousAudit.valid || !targetAudit.valid) {
    throw new Error(
      'O registro de recuperação contém dados financeiros inválidos. ' +
      'A restauração deve permanecer bloqueada.'
    )
  }

  return parsed as PendingBackupRestore

}


export function savePendingBackupRestore(
  operation: PendingBackupRestore
): void {
  // Impede sobrescrever qualquer registro existente,
  // inclusive um registro corrompido.
  if (localStorage.getItem(RECOVERY_KEY) !== null) {
    throw new Error(
      'Já existe um registro de recuperação. ' +
      'Resolva a pendência antes de iniciar outra restauração.'
    )
  }

  if (
    typeof operation.operationId !== 'string' ||
    !operation.operationId.trim() ||
    typeof operation.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(operation.createdAt))
  ) {
    throw new Error(
      'Os dados de identificação da restauração são inválidos.'
    )
  }

  const previousAudit = safelyAuditBackupRestore(
    operation.previousData
  )

  const targetAudit = safelyAuditBackupRestore(
    operation.targetData
  )

  if (!previousAudit.valid || !targetAudit.valid) {
    throw new Error(
      'Não é possível registrar uma restauração ' +
      'com dados financeiros inválidos.'
    )
  }

  localStorage.setItem(
    RECOVERY_KEY,
    JSON.stringify(operation)
  )
}


export function clearPendingBackupRestore(): void {
  localStorage.removeItem(RECOVERY_KEY)
}
