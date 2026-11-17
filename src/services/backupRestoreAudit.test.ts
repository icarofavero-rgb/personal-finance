
import { auditBackupRestore } from './backupRestoreAudit'
import type { BackupRestorePlan } from './backupRestorePlan'

const validPlan: BackupRestorePlan = {
  version: 4,
  transactions: [{
    id: 'transaction-1',
    description: 'Pagamento de fatura',
    amount: 50,
    type: 'expense',
    category: 'Cartão de crédito',
    date: '2026-11-03',
  }],
  cards: [{
    id: 'card-1',
    name: 'Cartão de teste',
    bank: 'Banco de teste',
    limit: 1000,
    closingDay: 10,
    dueDay: 17,
  }],
  purchases: [],
  payments: [{
    id: 'payment-1',
    cardId: 'card-1',
    invoiceMonth: '2026-11',
    amount: 50,
    date: '2026-11-03',
    transactionId: 'transaction-1',
  }],
}

function assert(
  name: string,
  condition: boolean
): void {
  if (!condition) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

const validResult = auditBackupRestore(validPlan)

assert(
  'Plano com vínculos consistentes',
  validResult.valid
)

const invalidPlan: BackupRestorePlan = {
  ...validPlan,
  payments: [{
    ...validPlan.payments[0],
    cardId: 'cartao-inexistente',
    transactionId: 'transacao-inexistente',
  }],
}

const invalidResult = auditBackupRestore(invalidPlan)

assert(
  'Plano inconsistente rejeitado',
  !invalidResult.valid
)

assert(
  'Múltiplos erros identificados',
  invalidResult.errors.length >= 2
)

console.log('Todos os testes de auditoria passaram!')
