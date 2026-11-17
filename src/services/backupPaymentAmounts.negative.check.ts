
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
  invoiceTotal: number,
  paymentAmounts: number[]
): void {
  let rejected = false

  try {
    inspectBackupPaymentAmounts(
      [makeInvoice(invoiceTotal)],
      paymentAmounts.map(makePayment)
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

expectRejected(
  'Fatura negativa',
  -100,
  []
)

expectRejected(
  'Pagamento negativo',
  100,
  [-20]
)

expectRejected(
  'Pagamento com fração de centavo',
  100,
  [10.001]
)

expectRejected(
  'Fatura com fração de centavo',
  100.001,
  []
)

console.log('Todos os testes de valores inválidos passaram!')
