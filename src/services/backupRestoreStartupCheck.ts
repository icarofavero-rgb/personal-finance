
import { getPendingBackupRestore } from './backupRestoreRecovery'

export type BackupRestoreStartupResult = {
  needsAttention: boolean
  message: string
}

export function checkBackupRestoreOnStartup():
  BackupRestoreStartupResult {
  try {
    const pending = getPendingBackupRestore()

    if (pending === null) {
      return {
        needsAttention: false,
        message: '',
      }
    }

    return {
      needsAttention: true,
      message:
        'Existe uma restauração de backup pendente. ' +
        'Os dados financeiros precisam ser verificados ' +
        'antes de iniciar outra restauração.',
    }
  } catch {
    return {
      needsAttention: true,
      message:
        'Não foi possível verificar o registro de recuperação ' +
        'do backup. Ele pode estar corrompido ou conter ' +
        'dados inválidos. Não tente restaurar outro backup ' +
        'antes de verificar a situação.',
    }
  }
}
