
import {
  getPendingBackupRestore,
  savePendingBackupRestore,
  clearPendingBackupRestore,
} from './backupRestoreRecovery'

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

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }

  console.log(`OK: ${message}`)
}

const emptyPlan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

// Teste 1: não existe restauração pendente
assert(
  getPendingBackupRestore() === null,
  'Nenhuma restauração pendente inicialmente'
)

// Teste 2: registrar operação
savePendingBackupRestore({
  operationId: 'restore-test-1',
  createdAt: new Date().toISOString(),
  previousData: emptyPlan,
  targetData: emptyPlan,
})

assert(
  getPendingBackupRestore()?.operationId === 'restore-test-1',
  'Registro de restauração salvo'
)

// Teste 3: impedir segunda operação
let duplicateBlocked = false

try {
  savePendingBackupRestore({
    operationId: 'restore-test-2',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: emptyPlan,
  })
} catch {
  duplicateBlocked = true
}

assert(
  duplicateBlocked,
  'Segunda restauração pendente bloqueada'
)

// Teste 4: remover registro
clearPendingBackupRestore()

assert(
  getPendingBackupRestore() === null,
  'Registro de restauração removido'
)

// Teste 5: detectar registro corrompido
memory.set(
  'personal-finance-pending-backup-restore',
  '{invalid-json'
)

let corruptionDetected = false

try {
  getPendingBackupRestore()
} catch {
  corruptionDetected = true
}

assert(
  corruptionDetected,
  'Registro corrompido detectado'
)

memory.clear()

// Teste 8: impedir gravação de dados financeiros inválidos
let invalidSaveBlocked = false

try {
  savePendingBackupRestore({
    operationId: 'restore-invalid-save',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: {
      ...emptyPlan,
      transactions: [
        {
          id: 'invalid-expense',
          description: 'Despesa inválida',
          amount: -50,
          type: 'expense',
          category: 'Teste',
          date: '2026-11-03',
        },
      ],
    },
  })
} catch {
  invalidSaveBlocked = true
}

assert(
  invalidSaveBlocked,
  'Gravação de dados financeiros inválidos bloqueada'
)

assert(
  memory.size === 0,
  'Nenhum registro inválido foi armazenado'
)

// Teste 9: impedir sobrescrita de registro corrompido
const recoveryKey = 'personal-finance-pending-backup-restore'

memory.set(recoveryKey, '{corrupted-json')

let overwriteBlocked = false

try {
  savePendingBackupRestore({
    operationId: 'restore-overwrite-test',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: emptyPlan,
  })
} catch {
  overwriteBlocked = true
}

assert(
  overwriteBlocked,
  'Sobrescrita de registro corrompido bloqueada'
)

assert(
  memory.get(recoveryKey) === '{corrupted-json',
  'Registro original preservado'
)

memory.delete(recoveryKey)

console.log('Todos os testes de recuperação passaram!')

const RECOVERY_KEY = 'personal-finance-pending-backup-restore'

// Teste 6: detectar dados financeiros inválidos
memory.set(
  RECOVERY_KEY,
  JSON.stringify({
    operationId: 'restore-invalid-1',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: {
      ...emptyPlan,
      transactions: [
        {
          id: 'invalid-transaction',
          description: 'Transação inválida',
          amount: -100,
          type: 'expense',
          category: 'Teste',
          date: '2026-11-03',
        },
      ],
    },
  })
)

let invalidFinancialDataBlocked = false

try {
  getPendingBackupRestore()
} catch {
  invalidFinancialDataBlocked = true
}

assert(
  invalidFinancialDataBlocked,
  'Dados financeiros inválidos bloqueados'
)

// Teste 7: detectar estrutura incompleta
memory.set(
  RECOVERY_KEY,
  JSON.stringify({
    operationId: 'restore-incomplete-1',
    createdAt: new Date().toISOString(),
    previousData: emptyPlan,
    targetData: {
      version: 4,
      transactions: [],
    },
  })
)

let incompleteDataBlocked = false

try {
  getPendingBackupRestore()
} catch {
  incompleteDataBlocked = true
}

assert(
  incompleteDataBlocked,
  'Estrutura financeira incompleta bloqueada'
)

memory.delete(RECOVERY_KEY)
