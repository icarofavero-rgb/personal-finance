
import type { CardPayment } from './cardPaymentsStorage'

export type PaymentLinkReport = {
  total: number
  linked: number
  unlinked: number
  unlinkedPaymentIds: string[]
}

export function inspectPaymentLinks(
  payments: CardPayment[]
): PaymentLinkReport {
  const unlinkedPaymentIds = payments
    .filter(
      payment =>
        payment.transactionId === undefined ||
        payment.transactionId.trim().length === 0
    )
    .map(payment => payment.id)

  return {
    total: payments.length,
    linked: payments.length - unlinkedPaymentIds.length,
    unlinked: unlinkedPaymentIds.length,
    unlinkedPaymentIds,
  }
}
