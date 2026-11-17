
import {
  summarizeRestorePlan,
  type BackupRestorePlan,
} from './backupRestorePlan'

function assertEqual(
  name: string,
  actual: number,
  expected: number
): void {
  if (actual !== expected) {
    throw new Error(
      `FALHA: ${name}. Esperado ${expected}, recebido ${actual}.`
    )
  }

  console.log(`OK: ${name}`)
}

const plan: BackupRestorePlan = {
  version: 4,

  transactions: [
    {
      id: 'transaction-1',
      description: 'Salário',
      amount: 2500,
      type: 'income',
      category: 'Trabalho',
      date: '2026-11-03',
    },
  ],

  cards: [
    {
      id: 'card-1',
      name: 'Cartão de teste',
      bank: 'Banco de teste',
      limit: 1000,
      closingDay: 10,
      dueDay: 17,
    },
  ],

  purchases: [
    {
      id: 'purchase-1',
      cardId: 'card-1',
      description: 'Compra de teste',
      amount: 100,
      category: 'Compras',
      date: '2026-11-03',
      installments: 2,
    },
  ],

  payments: [
    {
      id: 'payment-1',
      cardId: 'card-1',
      invoiceMonth: '2026-11',
      amount: 50,
      date: '2026-11-03',
      transactionId: 'transaction-1',
    },
  ],
}

const summary = summarizeRestorePlan(plan)

assertEqual('Versão do backup', summary.version, 4)
assertEqual('Transações', summary.transactionCount, 1)
assertEqual('Cartões', summary.cardCount, 1)
assertEqual('Compras', summary.purchaseCount, 1)
assertEqual('Pagamentos', summary.paymentCount, 1)

const emptyPlan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

const emptySummary = summarizeRestorePlan(emptyPlan)

assertEqual('Backup vazio: transações', emptySummary.transactionCount, 0)
assertEqual('Backup vazio: cartões', emptySummary.cardCount, 0)
assertEqual('Backup vazio: compras', emptySummary.purchaseCount, 0)
assertEqual('Backup vazio: pagamentos', emptySummary.paymentCount, 0)

console.log('Todos os testes do plano de restauração passaram!')
