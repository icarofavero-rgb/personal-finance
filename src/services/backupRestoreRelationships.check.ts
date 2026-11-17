
import { inspectRestoreRelationships } from './backupRestoreRelationships'
import type { BackupRestorePlan } from './backupRestorePlan'

const basePlan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [{
    id: 'card-1',
    name: 'Cartão de teste',
    bank: 'Banco de teste',
    limit: 1000,
    closingDay: 10,
    dueDay: 17,
  }],
  purchases: [],
  payments: [],
}

function assert(
  name: string,
  valid: boolean,
  expected: boolean
): void {
  if (valid !== expected) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

assert(
  'Plano sem vínculos inválidos',
  inspectRestoreRelationships(basePlan).valid,
  true
)

const invalidPurchasePlan: BackupRestorePlan = {
  ...basePlan,
  purchases: [{
    id: 'purchase-1',
    cardId: 'card-inexistente',
    description: 'Compra de teste',
    amount: 100,
    category: 'Compras',
    date: '2026-11-03',
    installments: 1,
  }],
}

assert(
  'Compra com cartão inexistente',
  inspectRestoreRelationships(invalidPurchasePlan).valid,
  false
)

const invalidPaymentPlan: BackupRestorePlan = {
  ...basePlan,
  payments: [{
    id: 'payment-1',
    cardId: 'card-inexistente',
    invoiceMonth: '2026-11',
    amount: 50,
    date: '2026-11-03',
  }],
}

assert(
  'Pagamento com cartão inexistente',
  inspectRestoreRelationships(invalidPaymentPlan).valid,
  false
)

console.log('Todos os testes de relacionamentos passaram!')
