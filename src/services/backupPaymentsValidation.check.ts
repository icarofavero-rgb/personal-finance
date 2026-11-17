
import { validateBackupPayments } from './backupPaymentsValidation'

import type { CreditCard } from './cardsStorage'
import type { Transaction } from './storage'
import type { CardInvoice } from './cardInvoices'

const cards: CreditCard[] = [{
  id: 'card-1',
  name: 'Cartão de teste',
  bank: 'Banco de teste',
  limit: 1000,
  closingDay: 10,
  dueDay: 17,
}]

const transactions: Transaction[] = [{
  id: 'transaction-1',
  description: 'Pagamento de fatura 2026-11',
  amount: 50,
  type: 'expense',
  category: 'Cartão de crédito',
  date: '2026-11-03',
}]

const invoices: CardInvoice[] = [{
  cardId: 'card-1',
  invoiceMonth: '2026-11',
  total: 100,
  installments: [],
}]

const validPayment = {
  id: 'payment-1',
  cardId: 'card-1',
  invoiceMonth: '2026-11',
  amount: 50,
  date: '2026-11-03',
  transactionId: 'transaction-1',
}

function expectValid(
  name: string,
  payments: unknown[]
): void {
  validateBackupPayments(
    payments,
    cards,
    transactions,
    invoices
  )

  console.log(`OK: ${name}`)
}

function expectInvalid(
  name: string,
  payments: unknown[]
): void {
  let rejected = false

  try {
    validateBackupPayments(
      payments,
      cards,
      transactions,
      invoices
    )
  } catch {
    rejected = true
  }

  if (!rejected) {
    throw new Error(
      `FALHA: ${name} deveria ter sido rejeitado.`
    )
  }

  console.log(`OK: ${name}`)
}

expectValid(
  'Pagamento válido',
  [validPayment]
)

expectInvalid(
  'Cartão inexistente',
  [{ ...validPayment, cardId: 'inexistente' }]
)

expectInvalid(
  'Pagamento duplicado',
  [validPayment, validPayment]
)

expectInvalid(
  'Valor negativo',
  [{ ...validPayment, amount: -10 }]
)

expectInvalid(
  'Data inexistente',
  [{ ...validPayment, date: '2026-02-31' }]
)

expectInvalid(
  'Fatura inexistente',
  [{ ...validPayment, invoiceMonth: '2026-12' }]
)

expectInvalid(
  'Transação inexistente',
  [{ ...validPayment, transactionId: 'inexistente' }]
)

expectInvalid(
  'Pagamento sem identificador',
  [{ ...validPayment, id: '' }]
)

expectInvalid(
  'Pagamento com valor não numérico',
  [{ ...validPayment, amount: 'cinquenta' }]
)

console.log('Todos os testes de validação passaram!')
