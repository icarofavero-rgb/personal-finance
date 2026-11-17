
import { inspectBackupPaymentAmounts } from './backupPaymentAmounts'

import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

function testScenario(
  name: string,
  invoiceTotal: number,
  paymentAmounts: number[],
  expectedRemaining: number,
  expectedOverpaid: number
): void {
  const invoices: CardInvoice[] = [{
    cardId: 'card-test',
    invoiceMonth: '2026-11',
    total: invoiceTotal,
    installments: [],
  }]

  const payments: CardPayment[] = paymentAmounts.map(
    (amount, index) => ({
      id: `payment-${index}`,
      cardId: 'card-test',
      invoiceMonth: '2026-11',
      amount,
      date: '2026-11-03',
    })
  )

  const report = inspectBackupPaymentAmounts(
    invoices,
    payments
  )

  const remainingCents = Math.round(
    report.totalRemaining * 100
  )

  const overpaidCents = Math.round(
    report.totalOverpaid * 100
  )

  if (
    remainingCents !== Math.round(expectedRemaining * 100) ||
    overpaidCents !== Math.round(expectedOverpaid * 100)
  ) {
    throw new Error(
      `FALHA: ${name}. ` +
      `Restante: ${report.totalRemaining}; ` +
      `Excedente: ${report.totalOverpaid}`
    )
  }

  console.log(`OK: ${name}`)
}

testScenario(
  'Pagamento parcial',
  100,
  [40],
  60,
  0
)

testScenario(
  'Pagamento integral',
  100,
  [100],
  0,
  0
)

testScenario(
  'Pagamento excedente',
  100,
  [120],
  0,
  20
)

testScenario(
  'Vários pagamentos',
  100,
  [30, 40, 30],
  0,
  0
)

testScenario(
  'Fatura sem pagamentos',
  100,
  [],
  100,
  0
)

testScenario(
  'Precisão de centavos',
  0.3,
  [0.1, 0.2],
  0,
  0
)

console.log('Todos os testes financeiros passaram!')
