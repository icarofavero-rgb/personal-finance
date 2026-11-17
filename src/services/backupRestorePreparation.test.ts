
import { prepareBackupRestore } from './backupRestorePreparation'
import type { BackupRestorePlan } from './backupRestorePlan'


function makePlan(
  version: 1 | 2 | 3 | 4
): BackupRestorePlan {
  return {
    version,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
  }
}


function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }

  console.log(`OK: ${message}`)
}

// Teste 1: backups antigos continuam bloqueados
const oldBackup = prepareBackupRestore(makePlan(2))

assert(
  oldBackup.readyForRestore === false &&
    oldBackup.warnings.some(warning =>
      warning.includes('Backup antigo')
    ),
  'Backup antigo permanece bloqueado'
)

// Teste 2: backup vazio recebe aviso
const emptyBackup = prepareBackupRestore(makePlan(4))

assert(
  emptyBackup.warnings.some(warning =>
    warning.includes('não contém registros')
  ),
  'Backup vazio identificado'
)

// Teste 3: backup V4 vazio passa na auditoria
assert(
  emptyBackup.readyForRestore === true,
  'Backup V4 vazio passa na validação'
)

// Teste 4: backup V4 com transação válida
const populatedPlan = makePlan(4)

populatedPlan.transactions.push({
  id: 'transaction-test',
  description: 'Transação fictícia',
  amount: 100,
  type: 'income',
  category: 'Teste',
  date: '2026-11-03',
})

const populatedBackup = prepareBackupRestore(populatedPlan)

assert(
  populatedBackup.readyForRestore === true &&
    populatedBackup.warnings.length === 0,
  'Backup V4 válido aprovado na auditoria'
)

// Teste 5: identificadores duplicados
const duplicatePlan = makePlan(4)

duplicatePlan.transactions.push(
  {
    id: 'duplicate-id',
    description: 'Primeira transação',
    amount: 50,
    type: 'expense',
    category: 'Teste',
    date: '2026-11-03',
  },
  {
    id: 'duplicate-id',
    description: 'Segunda transação',
    amount: 80,
    type: 'expense',
    category: 'Teste',
    date: '2026-11-03',
  }
)

const duplicateBackup = prepareBackupRestore(duplicatePlan)

assert(
  duplicateBackup.readyForRestore === false &&
    duplicateBackup.warnings.length > 0,
  'Backup com IDs duplicados bloqueado'
)

// Teste 6: transação com valor inválido
const invalidPlan = makePlan(4)

invalidPlan.transactions.push({
  id: 'invalid-transaction',
  description: 'Transação inválida',
  amount: -100,
  type: 'expense',
  category: 'Teste',
  date: '2026-11-03',
})

const invalidBackup = prepareBackupRestore(invalidPlan)

assert(
  invalidBackup.readyForRestore === false &&
    invalidBackup.warnings.length > 0,
  'Backup com valor inválido bloqueado'
)

console.log('Todos os testes de preparação passaram!')
