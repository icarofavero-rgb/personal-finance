
import {
  createBackupRestoreSnapshotJournal,
  getBackupRestoreSnapshotJournal,
} from './backupRestoreSnapshotJournal'

const memory = new Map<string, string>()

const JOURNAL_KEY =
  'personal-finance-pending-backup-snapshot'

let failJournalWrite = false
let failTransactionRead = false

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      if (
        failTransactionRead &&
        key === 'personal-finance-transactions'
      ) {
        throw new Error('Falha simulada de leitura')
      }

      return memory.get(key) ?? null
    },

    setItem(key: string, value: string): void {
      if (failJournalWrite && key === JOURNAL_KEY) {
        throw new Error('Falha simulada de gravação')
      }

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

const TRANSACTIONS_KEY = 'personal-finance-transactions'
const CARDS_KEY = 'personal-finance-credit-cards'

// Dados fictícios para os testes
memory.set(TRANSACTIONS_KEY, '[{"id":"original"}]')
memory.set(CARDS_KEY, '[{"id":"card-original"}]')

const originalTransactions = memory.get(TRANSACTIONS_KEY)
const originalCards = memory.get(CARDS_KEY)

// Teste 1: falha ao gravar o registro
failJournalWrite = true

let writeFailureDetected = false

try {
  createBackupRestoreSnapshotJournal('restore-failure-1')
} catch {
  writeFailureDetected = true
}

assert(
  writeFailureDetected,
  'Falha de gravação detectada'
)

assert(
  memory.get(TRANSACTIONS_KEY) === originalTransactions &&
    memory.get(CARDS_KEY) === originalCards,
  'Dados financeiros preservados após falha de gravação'
)

assert(
  !memory.has(JOURNAL_KEY),
  'Nenhum registro incompleto foi gravado'
)

failJournalWrite = false

// Teste 2: falha ao ler dados financeiros
failTransactionRead = true

let readFailureDetected = false

try {
  createBackupRestoreSnapshotJournal('restore-failure-2')
} catch {
  readFailureDetected = true
}

assert(
  readFailureDetected,
  'Falha de leitura detectada'
)

assert(
  !memory.has(JOURNAL_KEY),
  'Registro não criado após falha de leitura'
)

failTransactionRead = false

// Teste 3: criação normal após falhas
const journal =
  createBackupRestoreSnapshotJournal('restore-recovered')

assert(
  journal.snapshot.transactions === originalTransactions &&
    journal.snapshot.cards === originalCards,
  'Snapshot preserva os dados originais'
)

assert(
  getBackupRestoreSnapshotJournal()?.operationId ===
    'restore-recovered',
  'Registro válido pode ser consultado'
)

console.log('Todos os testes de falha passaram!')
