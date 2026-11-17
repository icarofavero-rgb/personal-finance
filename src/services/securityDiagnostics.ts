
export type SecurityDiagnostics = {
  storageAvailable: boolean
  pendingBackupRestore: boolean
  pendingCardPayment: boolean
  pendingSnapshotRecovery: boolean
  warnings: string[]
}

const RECOVERY_KEYS = {
  backup: 'personal-finance-pending-backup-restore',
  cardPayment: 'personal-finance-pending-payment',
} as const

export function getSecurityDiagnostics(): SecurityDiagnostics {
  const warnings: string[] = []

  let storageAvailable = false
  let pendingBackupRestore = false
  let pendingCardPayment = false
  let pendingSnapshotRecovery = false

  try {
    localStorage.getItem('personal-finance-appearance')
    storageAvailable = true

    pendingBackupRestore =
      localStorage.getItem(RECOVERY_KEYS.backup) !== null

    pendingCardPayment =
      localStorage.getItem(RECOVERY_KEYS.cardPayment) !== null

    pendingSnapshotRecovery =
  localStorage.getItem(
    'personal-finance-pending-backup-snapshot'
  ) !== null

    if (pendingBackupRestore) {
      warnings.push(
        'Existe um registro de restauração de backup pendente.'
      )
    }

    if (pendingCardPayment) {
      warnings.push(
        'Existe um registro de pagamento pendente.'
      )
    }

    if (pendingSnapshotRecovery) {
      warnings.push(
        'Existe um registro de snapshot de recuperação.'
      )
    }
  } catch {
    warnings.push(
      'Não foi possível consultar o armazenamento local.'
    )
  }

  return {
    storageAvailable,
    pendingBackupRestore,
    pendingCardPayment,
    pendingSnapshotRecovery,
    warnings,
  }
}
