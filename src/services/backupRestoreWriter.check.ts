
import { writeBackupRestoreData } from './backupRestoreWriter'
import type { BackupRestorePlan } from './backupRestorePlan'

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }

  console.log(`OK: ${message}`)
}

const plan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

writeBackupRestoreData(plan)

assert(
  memory.get('personal-finance-transactions') === '[]',
  'Transações gravadas'
)

assert(
  memory.get('personal-finance-credit-cards') === '[]',
  'Cartões gravados'
)

assert(
  memory.get('personal-finance-card-purchases') === '[]',
  'Compras gravadas'
)

assert(
  memory.get('personal-finance-card-payments') === '[]',
  'Pagamentos gravados'
)

let oldVersionBlocked = false

try {
  writeBackupRestoreData({
    ...plan,
    version: 3,
  })
} catch {
  oldVersionBlocked = true
}

assert(
  oldVersionBlocked,
  'Versões antigas bloqueadas'
)

console.log('Todos os testes de gravação passaram!')
