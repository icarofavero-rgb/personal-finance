
import { inspectBackupPaymentAmounts } from './backupPaymentAmounts'

import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

const invoices: CardInvoice[] = [
  {
    cardId: 'nubank',
    invoiceMonth: '2026-11',
    total: 100,
    installments: [],
  },
  {
    cardId: 'nubank',
    invoiceMonth: '2026-12',
    total: 200,
    installments: [],
  },
  {
    cardId: 'inter',
    invoiceMonth: '2026-11',
    total: 150,
    installments: [],
  },
]

const payments: CardPayment[] = [
  {
    id: 'payment-1',
    cardId: 'nubank',
    invoiceMonth: '2026-11',
    amount: 60,
    date: '2026-11-03',
  },
  {
    id: 'payment-2',
    cardId: 'nubank',
    invoiceMonth: '2026-12',
    amount: 250,
    date: '2026-11-03',
  },
  {
    id: 'payment-3',
    cardId: 'inter',
    invoiceMonth: '2026-11',
    amount: 150,
    date: '2026-11-03',
  },
]

const report = inspectBackupPaymentAmounts(
  invoices,
  payments
)

function assertEqual(
  name: string,
  actual: number,
  expected: number
): void {
  if (Math.round(actual * 100) !== Math.round(expected * 100)) {
    throw new Error(
      `FALHA: ${name}. Esperado: ${expected}; recebido: ${actual}`
    )
  }

  console.log(`OK: ${name}`)
}

assertEqual('Quantidade de faturas', report.invoiceCount, 3)
assertEqual('Quantidade de pagamentos', report.paymentCount, 3)
assertEqual('Total faturado', report.totalInvoiced, 450)
assertEqual('Total pago', report.totalPaid, 460)
assertEqual('Total pendente', report.totalRemaining, 40)
assertEqual('Total excedente', report.totalOverpaid, 50)

console.log('Todos os testes de múltiplas faturas passaram!')
