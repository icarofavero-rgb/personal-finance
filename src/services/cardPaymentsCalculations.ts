
import type { CardPayment } from './cardPaymentsStorage'

export type InvoicePaymentSummary = {
  invoiceTotal: number
  totalPaid: number
  remaining: number
  overpayment: number
  status: 'unpaid' | 'partial' | 'paid' | 'overpaid'
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error('Valor financeiro inválido.')
  }

  const cents = Math.round(amount * 100)

  if (!Number.isSafeInteger(cents)) {
    throw new Error('Valor financeiro fora do limite.')
  }

  return cents
}

export function calculateInvoicePayment(
  invoiceTotal: number,
  payments: CardPayment[],
  cardId: string,
  invoiceMonth: string
): InvoicePaymentSummary {
  const invoiceCents = toCents(invoiceTotal)

  if (invoiceCents < 0) {
    throw new Error('O total da fatura não pode ser negativo.')
  }

  const matchingPayments = payments.filter(
    payment =>
      payment.cardId === cardId &&
      payment.invoiceMonth === invoiceMonth
  )

  const paidCents = matchingPayments.reduce(
    (total, payment) => {
      const amountCents = toCents(payment.amount)

      if (amountCents <= 0) {
        throw new Error('Pagamento inválido.')
      }

      const nextTotal = total + amountCents

      if (!Number.isSafeInteger(nextTotal)) {
        throw new Error('Total de pagamentos fora do limite.')
      }

      return nextTotal
    },
    0
  )

  const remainingCents = Math.max(
    0,
    invoiceCents - paidCents
  )

  const overpaymentCents = Math.max(
    0,
    paidCents - invoiceCents
  )

  let status: InvoicePaymentSummary['status']

  if (paidCents === 0) {
    status = 'unpaid'
  } else if (paidCents < invoiceCents) {
    status = 'partial'
  } else if (paidCents === invoiceCents) {
    status = 'paid'
  } else {
    status = 'overpaid'
  }

  return {
    invoiceTotal: invoiceCents / 100,
    totalPaid: paidCents / 100,
    remaining: remainingCents / 100,
    overpayment: overpaymentCents / 100,
    status,
  }
}
