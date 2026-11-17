import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'
import { getCardInvoices } from './cardInvoices'

export type CardDashboardInfo = {
  cardId: string
  limit: number
  usedLimit: number
  availableLimit: number
  usagePercent: number
  currentInvoice: number
  pendingInvoice: number
  paidInvoice: number
}

export function calculateCardDashboard(
  card: CreditCard,
  purchases: CardPurchase[],
  payments: CardPayment[],
  referenceDate = new Date()
): CardDashboardInfo {
  const today = [
    referenceDate.getFullYear(),
    String(referenceDate.getMonth() + 1).padStart(2, '0'),
    String(referenceDate.getDate()).padStart(2, '0'),
  ].join('-')

  const currentMonth = today.slice(0, 7)

  const cardPurchases = purchases.filter(
    purchase =>
      purchase.cardId === card.id &&
      purchase.date <= today
  )

  const cardPayments = payments.filter(
    payment =>
      payment.cardId === card.id &&
      payment.date <= today
  )

  const totalPurchasesCents = cardPurchases.reduce(
    (sum, purchase) =>
      sum + Math.round(purchase.amount * 100),
    0
  )

  const totalPaymentsCents = cardPayments.reduce(
    (sum, payment) =>
      sum + Math.round(payment.amount * 100),
    0
  )

  const usedCents = Math.max(
    0,
    totalPurchasesCents - totalPaymentsCents
  )

  const limitCents = Math.round(card.limit * 100)

  const invoices = getCardInvoices(
    cardPurchases,
    [card]
  )

  const invoice = invoices.find(
    item => item.invoiceMonth === currentMonth
  )

  const invoiceCents = Math.round(
    (invoice?.total ?? 0) * 100
  )

  const paidCents = cardPayments
    .filter(payment => payment.invoiceMonth === currentMonth)
    .reduce(
      (sum, payment) =>
        sum + Math.round(payment.amount * 100),
      0
    )

  const paidInvoiceCents = Math.min(
    invoiceCents,
    paidCents
  )

  const pendingInvoiceCents = Math.max(
    0,
    invoiceCents - paidInvoiceCents
  )

  const usagePercent =
    limitCents > 0
      ? Math.min(100, Math.max(0, usedCents / limitCents * 100))
      : 0

  return {
    cardId: card.id,
    limit: limitCents / 100,
    usedLimit: usedCents / 100,
    availableLimit: Math.max(0, limitCents - usedCents) / 100,
    usagePercent,
    currentInvoice: invoiceCents / 100,
    pendingInvoice: pendingInvoiceCents / 100,
    paidInvoice: paidInvoiceCents / 100,
  }
}