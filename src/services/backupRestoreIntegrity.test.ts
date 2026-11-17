
import { inspectRestoreIntegrity } from './backupRestoreIntegrity'
import type { BackupRestorePlan } from './backupRestorePlan'

const emptyPlan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

const validResult = inspectRestoreIntegrity(emptyPlan)

if (!validResult.valid) {
  throw new Error('Um plano vazio deveria passar neste teste.')
}

console.log('OK: Plano sem duplicações')

const transaction = {
  id: 'transaction-1',
  description: 'Teste',
  amount: 100,
  type: 'income' as const,
  category: 'Teste',
  date: '2026-11-03',
}

const duplicatePlan: BackupRestorePlan = {
  ...emptyPlan,
  transactions: [transaction, { ...transaction }],
}

const duplicateResult = inspectRestoreIntegrity(
  duplicatePlan
)

if (duplicateResult.valid) {
  throw new Error(
    'Transações com IDs duplicados deveriam ser rejeitadas.'
  )
}

console.log('OK: Transações duplicadas identificadas')

console.log('Todos os testes de integridade passaram!')
