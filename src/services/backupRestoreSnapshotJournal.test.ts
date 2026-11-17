
import {
  createBackupRestoreSnapshotJournal,
  getBackupRestoreSnapshotJournal,
} from './backupRestoreSnapshotJournal'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      memory.set(key, value)
    },
    removeItem(key: string): void {
      memory.delete(key)
    },
  },
})

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }

  console.log(`OK: ${message}`)
}

const JOURNAL_KEY =
  'personal-finance-pending-backup-snapshot'

// Teste 1: nenhum registro pendente
assert(
  getBackupRestoreSnapshotJournal() === null,
  'Nenhum snapshot pendente inicialmente'
)

// Teste 2: preservar dados originais
memory.set('personal-finance-transactions', '[]')
memory.set('personal-finance-card-payments', '{invalid-json')

const journal =
  createBackupRestoreSnapshotJournal('restore-snapshot-1')

assert(
  journal.snapshot.transactions === '[]' &&
    journal.snapshot.payments === '{invalid-json',
  'Dados originais preservados exatamente'
)

// Teste 3: registro persistido
assert(
  getBackupRestoreSnapshotJournal()?.operationId ===
    'restore-snapshot-1',
  'Registro de snapshot salvo'
)

// Teste 4: impedir sobrescrita
let duplicateBlocked = false

try {
  createBackupRestoreSnapshotJournal('restore-snapshot-2')
} catch {
  duplicateBlocked = true
}

assert(
  duplicateBlocked,
  'Sobrescrita do snapshot bloqueada'
)

// Teste 5: verificar corrupção
memory.set(JOURNAL_KEY, '{invalid-json')

let corruptionDetected = false

try {
  getBackupRestoreSnapshotJournal()
} catch {
  corruptionDetected = true
}

assert(
  corruptionDetected,
  'Snapshot corrompido detectado'
)

console.log('Todos os testes do journal passaram!')
