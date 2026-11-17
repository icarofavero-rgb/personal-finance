
import { writeBackupRestoreData } from './backupRestoreWriter'
import type { BackupRestorePlan } from './backupRestorePlan'

const memory = new Map<string, string>()

const KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
}

let failOnPurchases = false

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },

    setItem(key: string, value: string): void {
      if (
        failOnPurchases &&
        key === KEYS.purchases
      ) {
        throw new Error('Falha simulada na gravação')
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

// Dados fictícios existentes antes da restauração
memory.set(KEYS.transactions, '[{"id":"original"}]')
memory.set(KEYS.cards, '[{"id":"original-card"}]')
memory.set(KEYS.purchases, '[]')
memory.set(KEYS.payments, '[]')

const plan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

failOnPurchases = true

let failureDetected = false

try {
  writeBackupRestoreData(plan)
} catch {
  failureDetected = true
}

assert(
  failureDetected,
  'Falha durante a restauração detectada'
)

assert(
  memory.get(KEYS.transactions) === '[]',
  'Gravação parcial identificada'
)

assert(
  memory.get(KEYS.cards) === '[]',
  'Cartões foram gravados antes da falha'
)

assert(
  memory.get(KEYS.purchases) === '[]',
  'Compras anteriores permaneceram armazenadas'
)

console.log('Teste de interrupção concluído!')
