
import { inspectBackupPaymentAmounts } from './backupPaymentAmounts'

import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

function makeInvoice(total: number): CardInvoice {
  return {
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    total,
    installments: [],
  }
}

function makePayment(amount: number): CardPayment {
  return {
    id: 'payment-test',
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    amount,
    date: '2026-11-03',
  }
}

function expectRejected(
  name: string,
  invoices: CardInvoice[],
  payments: CardPayment[]
): void {
  let rejected = false

  try {
    inspectBackupPaymentAmounts(invoices, payments)
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

expectRejected(
  'Valor infinito',
  [makeInvoice(Infinity)],
  []
)

expectRejected(
  'Valor NaN',
  [makeInvoice(NaN)],
  []
)

expectRejected(
  'Valor acima do limite seguro',
  [makeInvoice(Number.MAX_VALUE)],
  []
)

expectRejected(
  'Pagamento infinito',
  [makeInvoice(100)],
  [makePayment(Infinity)]
)

expectRejected(
  'Pagamento acima do limite seguro',
  [makeInvoice(100)],
  [makePayment(Number.MAX_VALUE)]
)

console.log('Todos os testes de limites passaram!')
