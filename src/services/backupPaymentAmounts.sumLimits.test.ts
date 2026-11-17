
import { inspectBackupPaymentAmounts } from './backupPaymentAmounts'

import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

const safeAmount = 30_000_000_000_000

const invoices: CardInvoice[] = [
  {
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    total: safeAmount,
    installments: [],
  },
]

const payments: CardPayment[] = [
  {
    id: 'payment-1',
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    amount: safeAmount,
    date: '2026-11-03',
  },
  {
    id: 'payment-2',
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    amount: safeAmount,
    date: '2026-11-03',
  },
  {
    id: 'payment-3',
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    amount: safeAmount,
    date: '2026-11-03',
  },
  {
    id: 'payment-4',
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    amount: safeAmount,
    date: '2026-11-03',
  },
]

let rejected = false

try {
  inspectBackupPaymentAmounts(invoices, payments)
} catch {
  rejected = true
}

if (!rejected) {
  throw new Error(
    'FALHA: A soma acima do limite seguro deveria ser rejeitada.'
  )
}

console.log('OK: Soma acima do limite seguro rejeitada!')
