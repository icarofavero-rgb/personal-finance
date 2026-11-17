
import { checkBackupRestoreOnStartup } from './backupRestoreStartupCheck'

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

const RECOVERY_KEY = 'personal-finance-pending-backup-restore'

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }

  console.log(`OK: ${message}`)
}

// Teste 1: inicialização normal
const normalStartup = checkBackupRestoreOnStartup()

assert(
  normalStartup.needsAttention === false &&
    normalStartup.message === '',
  'Inicialização sem restauração pendente'
)

// Teste 2: restauração pendente válida
const emptyPlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

memory.set(
  RECOVERY_KEY,
  JSON.stringify({
    operationId: 'restore-pending-1',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: emptyPlan,
  })
)

const pendingStartup = checkBackupRestoreOnStartup()

assert(
  pendingStartup.needsAttention === true &&
    pendingStartup.message.includes('pendente'),
  'Restauração pendente detectada'
)

// Teste 3: registro corrompido
memory.set(RECOVERY_KEY, '{invalid-json')

const corruptedStartup = checkBackupRestoreOnStartup()

assert(
  corruptedStartup.needsAttention === true &&
    corruptedStartup.message.includes('corrompido'),
  'Registro corrompido detectado'
)

// Teste 4: estrutura inválida
memory.set(
  RECOVERY_KEY,
  JSON.stringify({
    operationId: 'restore-invalid-1',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: {
      version: 4,
      transactions: [],
    },
  })
)

const invalidStartup = checkBackupRestoreOnStartup()

assert(
  invalidStartup.needsAttention === true,
  'Estrutura inválida detectada'
)

memory.delete(RECOVERY_KEY)

console.log('Todos os testes de inicialização passaram!')
