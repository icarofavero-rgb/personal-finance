
import { executeBackupRestore } from './backupRestoreExecutor'
import type { BackupRestorePlan } from './backupRestorePlan'

const memory = new Map<string, string>()

const KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  journal: 'personal-finance-pending-backup-snapshot',
}

let failOnPurchases = false

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },

    setItem(key: string, value: string): void {
      if (failOnPurchases && key === KEYS.purchases) {
        throw new Error('Falha simulada')
      }

      memory.set(key, value)
    },

    removeItem(key: string): void {
      memory.delete(key)
    },
  },
})

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FALHA: ${message}`)
  console.log(`OK: ${message}`)
}

const plan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

async function run() {
  // Teste 1: restauração normal
  memory.clear()
  failOnPurchases = false

  executeBackupRestore(plan)

  assert(
    memory.get(KEYS.transactions) === '[]',
    'Transações restauradas'
  )

  assert(
    memory.get(KEYS.payments) === '[]',
    'Pagamentos restaurados'
  )

  assert(
    !memory.has(KEYS.journal),
    'Registro removido após sucesso'
  )

  // Teste 2: falha e recuperação
  memory.clear()

  memory.set(KEYS.transactions, '[{"id":"original"}]')
  memory.set(KEYS.cards, '[{"id":"cartao-original"}]')
  memory.set(KEYS.purchases, '[]')
  memory.set(KEYS.payments, '[]')

  failOnPurchases = true

  let failed = false

  try {
    executeBackupRestore(plan)
  } catch {
    failed = true
  }

  assert(failed, 'Falha detectada')

  assert(
    memory.get(KEYS.transactions) ===
      '[{"id":"original"}]',
    'Transações anteriores recuperadas'
  )

  assert(
    memory.get(KEYS.cards) ===
      '[{"id":"cartao-original"}]',
    'Cartões anteriores recuperados'
  )

  assert(
    memory.has(KEYS.journal),
    'Registro preservado quando a recuperação falha'
  )

  // Teste 3: nova restauração bloqueada
  failOnPurchases = false

  let blocked = false

  try {
    executeBackupRestore(plan)
  } catch {
    blocked = true
  }

  assert(
    blocked,
    'Nova restauração bloqueada enquanto existe pendência'
  )

  console.log('Testes integrados concluídos!')
}

run().catch(error => {
  console.error(error)
  throw error
})
