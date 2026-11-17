
import {
  checkBackupRestoreOnStartup,
} from './backupRestoreStartupCheck'

import {
  getBackupRestoreSnapshotJournal,
} from './backupRestoreSnapshotJournal'

export type BackupRestoreSafetyResult = {
  safe: boolean
  message: string
}

export function checkBackupRestoreSafety():
  BackupRestoreSafetyResult {
  const restoreStatus = checkBackupRestoreOnStartup()

  if (restoreStatus.needsAttention) {
    return {
      safe: false,
      message: restoreStatus.message,
    }
  }

  try {
    const snapshot = getBackupRestoreSnapshotJournal()

    if (snapshot !== null) {
      return {
        safe: false,
        message:
          'Existe um snapshot de recuperação pendente. ' +
          'Verifique os dados antes de importar outro backup.',
      }
    }
  } catch {
    return {
      safe: false,
      message:
        'O registro de recuperação do backup está inválido. ' +
        'A importação foi bloqueada para proteger seus dados.',
    }
  }

  return {
    safe: true,
    message: '',
  }
}
