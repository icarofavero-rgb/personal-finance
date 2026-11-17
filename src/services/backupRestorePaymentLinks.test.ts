
import { inspectRestorePaymentLinks } from './backupRestorePaymentLinks'
import type { BackupRestorePlan } from './backupRestorePlan'

const transaction = {
  id: 'transaction-1',
  description: 'Pagamento de fatura',
  amount: 50,
  type: 'expense' as const,
  category: 'Cartão de crédito',
  date: '2026-11-03',
}

const payment = {
  id: 'payment-1',
  cardId: 'card-1',
  invoiceMonth: '2026-11',
  amount: 50,
  date: '2026-11-03',
  transactionId: 'transaction-1',
}

const basePlan: BackupRestorePlan = {
  version: 4,
  transactions: [transaction],
  cards: [],
  purchases: [],
  payments: [payment],
}

function check(
  name: string,
  plan: BackupRestorePlan,
  expected: boolean
): void {
  const result = inspectRestorePaymentLinks(plan)

  if (result.valid !== expected) {
    throw new Error(
      `FALHA: ${name}. ${result.errors.join(' ')}`
    )
  }

  console.log(`OK: ${name}`)
}

check('Pagamento válido', basePlan, true)

check(
  'Transação inexistente',
  {
    ...basePlan,
    payments: [{
      ...payment,
      transactionId: 'inexistente',
    }],
  },
  false
)

check(
  'Pagamento vinculado a receita',
  {
    ...basePlan,
    transactions: [{
      ...transaction,
      type: 'income',
    }],
  },
  false
)

check(
  'Valores diferentes',
  {
    ...basePlan,
    payments: [{
      ...payment,
      amount: 60,
    }],
  },
  false
)

check(
  'Transação utilizada duas vezes',
  {
    ...basePlan,
    payments: [
      payment,
      { ...payment, id: 'payment-2' },
    ],
  },
  false
)

check(
  'Pagamento sem vínculo',
  {
    ...basePlan,
    payments: [{
      ...payment,
      transactionId: undefined,
    }],
  },
  false
)

console.log('Todos os testes de vínculos financeiros passaram!')
