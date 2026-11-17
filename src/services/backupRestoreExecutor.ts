
import type { BackupRestorePlan } from './backupRestorePlan'

import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'
import { checkBackupRestoreSafety } from './backupRestoreSafety'
import { verifyBackupRestoreData } from './backupRestoreVerification'

import {
  createBackupRestoreSnapshotJournal,
  getBackupRestoreSnapshotJournal,
  finishBackupRestoreSnapshot,
  recoverBackupRestoreSnapshot,
} from './backupRestoreSnapshotJournal'

import { writeBackupRestoreData } from './backupRestoreWriter'

export function executeBackupRestore(
  plan: BackupRestorePlan
): void {
  const safety = checkBackupRestoreSafety()

  if (!safety.safe) {
    throw new Error(safety.message)
  }

  if (plan.version !== 4 && plan.version !== 5) {
    throw new Error(
      'A restauração exige um backup V4 ou V5.'
    )
  }

  const audit = safelyAuditBackupRestore(plan)

  if (!audit.valid) {
    throw new Error(
      'O backup contém dados financeiros inválidos.'
    )
  }

  const pendingPayment = localStorage.getItem(
    'personal-finance-pending-payment'
  )

  if (pendingPayment !== null) {
    throw new Error(
      'Existe uma operação de pagamento pendente. ' +
      'Resolva essa operação antes de restaurar um backup.'
    )
  }

  const operationId = crypto.randomUUID()

createBackupRestoreSnapshotJournal(operationId)

// Conferir o registro efetivamente armazenado.
const journal = getBackupRestoreSnapshotJournal()

if (journal === null) {
  throw new Error(
    'Não foi possível confirmar o registro de recuperação.'
  )
}

  // O Backup V5 exige um snapshot que inclua Devedores.
  if (
    plan.version === 5 &&
    !Object.prototype.hasOwnProperty.call(
      journal.snapshot,
      'debtors'
    )
  ) {
    throw new Error(
      'O snapshot dos Devedores está incompleto. ' +
      'A restauração foi interrompida antes de alterar ' +
      'os dados financeiros. O registro de recuperação ' +
      'foi preservado para análise.'
    )
  }

  try {
    writeBackupRestoreData(plan)
  } catch {
    try {
      recoverBackupRestoreSnapshot()
    } catch {
      throw new Error(
        'A restauração falhou e a recuperação automática ' +
        'não foi concluída. O registro de recuperação foi ' +
        'preservado. Não altere os dados até resolver a pendência.'
      )
    }

    throw new Error(
      'A restauração falhou. Os dados anteriores foram recuperados.'
    )
  }

  // O registro só será removido após a gravação
  // e a verificação dos dados exigidos pela versão.

  let verified = false

  try {
    verified = verifyBackupRestoreData(plan)
  } catch {
    verified = false
  }

  if (!verified) {
    try {
      recoverBackupRestoreSnapshot()
    } catch {
      throw new Error(
        'A verificação da restauração falhou e a recuperação ' +
        'automática não foi concluída. O registro foi preservado.'
      )
    }

    throw new Error(
      'Não foi possível confirmar a restauração. ' +
      'Os dados anteriores foram recuperados.'
    )
  }

  finishBackupRestoreSnapshot()
}
