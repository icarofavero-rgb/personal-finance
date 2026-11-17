
import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

function expectRejected(
  name: string,
  data: unknown
): void {
  const result = safelyAuditBackupRestore(data)

  if (result.valid) {
    throw new Error(
      `FALHA: ${name} deveria ter sido rejeitado.`
    )
  }

  console.log(`OK: ${name}`)
}

const basePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

expectRejected(
  'Transação sem valor',
  {
    ...basePlan,
    transactions: [{
      id: 'transaction-1',
      description: 'Teste',
      type: 'income',
      category: 'Teste',
      date: '2026-11-03',
    }],
  }
)

expectRejected(
  'Transação com valor negativo',
  {
    ...basePlan,
    transactions: [{
      id: 'transaction-1',
      description: 'Teste',
      amount: -100,
      type: 'expense',
      category: 'Teste',
      date: '2026-11-03',
    }],
  }
)

expectRejected(
  'Cartão sem limite',
  {
    ...basePlan,
    cards: [{
      id: 'card-1',
      name: 'Cartão de teste',
      bank: 'Banco de teste',
      closingDay: 10,
      dueDay: 17,
    }],
  }
)

expectRejected(
  'Compra sem valor',
  {
    ...basePlan,
    cards: [{
      id: 'card-1',
      name: 'Cartão de teste',
      bank: 'Banco de teste',
      limit: 1000,
      closingDay: 10,
      dueDay: 17,
    }],
    purchases: [{
      id: 'purchase-1',
      cardId: 'card-1',
      description: 'Compra de teste',
      category: 'Compras',
      date: '2026-11-03',
      installments: 1,
    }],
  }
)

expectRejected(
  'Pagamento sem valor',
  {
    ...basePlan,
    cards: [{
      id: 'card-1',
      name: 'Cartão de teste',
      bank: 'Banco de teste',
      limit: 1000,
      closingDay: 10,
      dueDay: 17,
    }],
    payments: [{
      id: 'payment-1',
      cardId: 'card-1',
      invoiceMonth: '2026-11',
      date: '2026-11-03',
    }],
  }
)

console.log('Todos os registros inválidos foram rejeitados!')
