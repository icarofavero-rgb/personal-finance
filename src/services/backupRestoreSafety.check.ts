
import {
  checkBackupRestoreSafety,
} from './backupRestoreSafety'

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

const KEY = 'personal-finance-pending-backup-restore'

// Teste 1: nenhuma restauração pendente
const normal = checkBackupRestoreSafety()

assert(
  normal.safe === true,
  'Importação permitida sem pendências'
)

// Teste 2: restauração pendente
const emptyPlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

memory.set(
  KEY,
  JSON.stringify({
    operationId: 'restore-test',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: emptyPlan,
  })
)

const pending = checkBackupRestoreSafety()

assert(
  pending.safe === false,
  'Importação bloqueada com restauração pendente'
)

// Teste 3: registro corrompido
memory.set(KEY, '{invalid-json')

const corrupted = checkBackupRestoreSafety()

assert(
  corrupted.safe === false,
  'Importação bloqueada com registro corrompido'
)

memory.delete(KEY)

console.log('Todos os testes de segurança passaram!')
