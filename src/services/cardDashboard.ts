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

function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Cálculo ÚNICO do limite utilizado de um cartão (em centavos).
 *
 * Toda compra consome limite (inclusive as de data futura, pois o banco
 * reserva o valor total da compra parcelada). Pagamentos já realizados
 * (data até hoje) liberam limite. Use esta função em todas as telas para
 * que Dashboard, Cartões e o formulário de compra mostrem o mesmo valor.
 */
export function calculateCardUsedLimitCents(
  cardId: string,
  purchases: CardPurchase[],
  payments: CardPayment[],
  referenceDate = new Date()
): number {
  const today = toDateKey(referenceDate)

  const purchasesCents = purchases
    .filter(purchase => purchase.cardId === cardId)
    .reduce((sum, purchase) => sum + Math.round(purchase.amount * 100), 0)

  const paymentsCents = payments
    .filter(payment => payment.cardId === cardId && payment.date <= today)
    .reduce((sum, payment) => sum + Math.round(payment.amount * 100), 0)

  return Math.max(0, purchasesCents - paymentsCents)
}

/** Limite disponível do cartão (em centavos), nunca negativo. */
export function calculateCardAvailableLimitCents(
  card: CreditCard,
  purchases: CardPurchase[],
  payments: CardPayment[],
  referenceDate = new Date()
): number {
  return Math.max(
    0,
    Math.round(card.limit * 100) -
      calculateCardUsedLimitCents(card.id, purchases, payments, referenceDate)
  )
}

export function calculateCardDashboard(
  card: CreditCard,
  purchases: CardPurchase[],
  payments: CardPayment[],
  referenceDate = new Date()
): CardDashboardInfo {
  const today = toDateKey(referenceDate)

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

  const usedCents = calculateCardUsedLimitCents(
    card.id,
    purchases,
    payments,
    referenceDate
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