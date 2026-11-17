
import type { CardPayment } from './cardPaymentsStorage'
import type { CardInvoice } from './cardInvoices'

export type BackupPaymentAmountReport = {
  invoiceCount: number
  paymentCount: number
  totalInvoiced: number
  totalPaid: number
  totalRemaining: number
  totalOverpaid: number
}


function toCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Valor financeiro inválido.')
  }

  if (value < 0) {
    throw new Error(
      'Valores financeiros negativos não são permitidos.'
    )
  }

  const rawCents = value * 100
  const cents = Math.round(rawCents)

  if (!Number.isSafeInteger(cents)) {
    throw new Error(
      'Valor financeiro fora do limite permitido.'
    )
  }

  if (Math.abs(rawCents - cents) > 1e-7) {
    throw new Error(
      'O valor financeiro não pode conter frações de centavo.'
    )
  }

  return cents
}



function safeAddCents(
  current: number,
  amount: number
): number {
  if (
    !Number.isSafeInteger(current) ||
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(current + amount)
  ) {
    throw new Error(
      'A soma dos valores financeiros ultrapassou o limite seguro.'
    )
  }

  return current + amount
}


export function inspectBackupPaymentAmounts(
  invoices: CardInvoice[],
  payments: CardPayment[]
): BackupPaymentAmountReport {
  let totalInvoiced = 0
  let totalPaid = 0
  let totalRemaining = 0
  let totalOverpaid = 0

  for (const invoice of invoices) {
    const invoiceCents = toCents(invoice.total)

    const invoicePayments = payments.filter(
      payment =>
        payment.cardId === invoice.cardId &&
        payment.invoiceMonth === invoice.invoiceMonth
    )

    
const paidCents = invoicePayments.reduce(
  (sum, payment) =>
    safeAddCents(sum, toCents(payment.amount)),
  0
)


  
totalInvoiced = safeAddCents(
  totalInvoiced,
  invoiceCents
)

totalPaid = safeAddCents(
  totalPaid,
  paidCents
)

totalRemaining = safeAddCents(
  totalRemaining,
  Math.max(0, invoiceCents - paidCents)
)

totalOverpaid = safeAddCents(
  totalOverpaid,
  Math.max(0, paidCents - invoiceCents)
)

  }

  return {
    invoiceCount: invoices.length,
    paymentCount: payments.length,
    totalInvoiced: totalInvoiced / 100,
    totalPaid: totalPaid / 100,
    totalRemaining: totalRemaining / 100,
    totalOverpaid: totalOverpaid / 100,
  }
}
