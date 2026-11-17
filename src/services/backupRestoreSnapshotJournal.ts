
import {
  captureBackupStorageSnapshot,
  type BackupStorageSnapshot,
} from './backupRestoreSnapshot'

export type BackupRestoreSnapshotJournal = {
  operationId: string
  createdAt: string
  snapshot: BackupStorageSnapshot
}

const JOURNAL_KEY =
  'personal-finance-pending-backup-snapshot'

function isValidSnapshot(
  value: unknown
): value is BackupStorageSnapshot {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }

  const snapshot = value as Record<string, unknown>

  return (
    (typeof snapshot.transactions === 'string' ||
      snapshot.transactions === null) &&
    (typeof snapshot.cards === 'string' ||
      snapshot.cards === null) &&
    (typeof snapshot.purchases === 'string' ||
      snapshot.purchases === null) &&
    (typeof snapshot.payments === 'string' ||
  snapshot.payments === null) &&
(snapshot.debtors === undefined ||
  typeof snapshot.debtors === 'string' ||
  snapshot.debtors === null)
  )
}

export function getBackupRestoreSnapshotJournal():
  BackupRestoreSnapshotJournal | null {
  const saved = localStorage.getItem(JOURNAL_KEY)

  if (saved === null) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      'O registro de recuperação do snapshot está corrompido.'
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      'O registro de recuperação possui formato inválido.'
    )
  }

  const journal = parsed as Record<string, unknown>

  if (
    typeof journal.operationId !== 'string' ||
    !journal.operationId.trim() ||
    typeof journal.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(journal.createdAt)) ||
    !isValidSnapshot(journal.snapshot)
  ) {
    throw new Error(
      'O registro de recuperação contém dados inválidos.'
    )
  }

  return parsed as BackupRestoreSnapshotJournal
}


export function createBackupRestoreSnapshotJournal(
  operationId: string
): BackupRestoreSnapshotJournal {
  if (localStorage.getItem(JOURNAL_KEY) !== null) {
    throw new Error(
      'Já existe um snapshot de recuperação pendente.'
    )
  }

  if (!operationId.trim()) {
    throw new Error(
      'O identificador da restauração é obrigatório.'
    )
  }

  const journal: BackupRestoreSnapshotJournal = {
    operationId,
    createdAt: new Date().toISOString(),
    snapshot: captureBackupStorageSnapshot(),
  }

  const serializedJournal = JSON.stringify(journal)

  localStorage.setItem(
    JOURNAL_KEY,
    serializedJournal
  )

  // Confirma que o snapshot foi realmente persistido.
  const persistedJournal = localStorage.getItem(JOURNAL_KEY)

  if (persistedJournal !== serializedJournal) {
    throw new Error(
      'Não foi possível confirmar a gravação do snapshot de recuperação. A restauração foi interrompida.'
    )
  }

  return journal
}


const RESTORE_KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  debtors: 'personal-finance-debtors-v1',
} as const


export function recoverBackupRestoreSnapshot(): void {
  const journal = getBackupRestoreSnapshotJournal()

  if (journal === null) {
    throw new Error(
      'Não existe um registro de recuperação disponível.'
    )
  }

  const snapshot = journal.snapshot

  for (const key of Object.keys(RESTORE_KEYS) as
    Array<keyof typeof RESTORE_KEYS>) {
    const storageKey = RESTORE_KEYS[key]
    const originalValue = snapshot[key]

    // Snapshots antigos não possuem a propriedade debtors.
    // Nesse caso, preservamos os dados atuais.
    if (originalValue === undefined) {
      if (key === 'debtors') {
        continue
      }

      throw new Error(
        'O snapshot contém dados obrigatórios ausentes.'
      )
    }

    if (originalValue === null) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, originalValue)
    }
  }

// Confirmar que todos os valores foram recuperados.
for (const key of Object.keys(RESTORE_KEYS) as
  Array<keyof typeof RESTORE_KEYS>) {
  const originalValue = snapshot[key]

  // Preservar compatibilidade com snapshots antigos.
  if (originalValue === undefined && key === 'debtors') {
    continue
  }

  const restoredValue = localStorage.getItem(
    RESTORE_KEYS[key]
  )

  if (restoredValue !== originalValue) {
    throw new Error(
      'A recuperação não pôde confirmar a integridade ' +
      `dos dados de ${key}. ` +
      'O registro de recuperação foi preservado.'
    )
  }
}

  // Removemos o registro somente após a recuperação.
  localStorage.removeItem(
    'personal-finance-pending-backup-snapshot'
  )
}



export function finishBackupRestoreSnapshot(): void {
  const journal = getBackupRestoreSnapshotJournal()

  if (journal === null) {
    throw new Error(
      'Não existe uma restauração pendente para finalizar.'
    )
  }

  localStorage.removeItem(
    'personal-finance-pending-backup-snapshot'
  )

  // Confirmar que o registro foi realmente removido.
  const remaining = localStorage.getItem(
    'personal-finance-pending-backup-snapshot'
  )

  if (remaining !== null) {
    throw new Error(
      'Não foi possível confirmar a finalização da restauração. ' +
      'O registro de recuperação permanece armazenado.'
    )
  }
}

