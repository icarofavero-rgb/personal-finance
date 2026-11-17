
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'

import type { FinancialNotification } from './notificationTypes'
import type { NotificationPreferences } from './notificationPreferencesStorage'

import {
  getCardInvoiceDueDate,
  getDaysUntilDue,
} from './cardInvoiceDueDate'

import { getCardInvoices } from './cardInvoices'

export type PendingInvoiceNotification = {
  id: string
  cardId: string
  cardName: string
  invoiceMonth: string
  totalCents: number
  paidCents: number
  pendingCents: number
}

export function getPendingInvoiceNotifications(
  cards: CreditCard[],
  purchases: CardPurchase[],
  payments: CardPayment[]
): PendingInvoiceNotification[] {
  const invoices = getCardInvoices(purchases, cards)

  const paymentsByInvoice = new Map<string, number>()

  for (const payment of payments) {
    if (
      !Number.isFinite(payment.amount) ||
      payment.amount <= 0
    ) {
      throw new Error('Pagamento inválido no cálculo de avisos.')
    }

    const key = JSON.stringify([
      payment.cardId,
      payment.invoiceMonth,
    ])

    const cents = Math.round(payment.amount * 100)

    if (!Number.isSafeInteger(cents)) {
      throw new Error('Valor de pagamento inválido.')
    }

    const current = paymentsByInvoice.get(key) ?? 0
    const next = current + cents

    if (!Number.isSafeInteger(next)) {
      throw new Error('Soma de pagamentos inválida.')
    }

    paymentsByInvoice.set(key, next)
  }

  return invoices.flatMap(invoice => {
    const card = cards.find(item => item.id === invoice.cardId)

    if (!card) return []

    const key = JSON.stringify([
      invoice.cardId,
      invoice.invoiceMonth,
    ])

    const totalCents = Math.round(invoice.total * 100)
    const paidCents = paymentsByInvoice.get(key) ?? 0

    if (
      !Number.isSafeInteger(totalCents) ||
      totalCents < 0
    ) {
      throw new Error('Total de fatura inválido.')
    }

    if (paidCents > totalCents) {
      // Não gerar aviso financeiro com dados inconsistentes.
      return []
    }

    const pendingCents = totalCents - paidCents

    if (pendingCents <= 0) {
      return []
    }

    return [{
      id: `card-invoice:${invoice.cardId}:${invoice.invoiceMonth}`,
      cardId: invoice.cardId,
      cardName: card.name,
      invoiceMonth: invoice.invoiceMonth,
      totalCents,
      paidCents,
      pendingCents,
    }]
  })
}

export function generateCardInvoiceNotifications(
  cards: CreditCard[],
  purchases: CardPurchase[],
  payments: CardPayment[],
  preferences: NotificationPreferences,
  today: string
): FinancialNotification[] {
  if (
    !preferences.enabled ||
    !preferences.cardInvoices
  ) {
    return []
  }

  if (
    ![1, 3, 5, 7].includes(preferences.daysBeforeDue)
  ) {
    throw new Error('Antecedência de notificação inválida.')
  }

  const pendingInvoices = getPendingInvoiceNotifications(
    cards,
    purchases,
    payments
  )

  return pendingInvoices.flatMap(invoice => {
    const card = cards.find(
      item => item.id === invoice.cardId
    )

    if (!card) return []

    const dueDate = getCardInvoiceDueDate(
      invoice.invoiceMonth,
      card.dueDay
    )

    const daysUntilDue = getDaysUntilDue(
      dueDate,
      today
    )

    // Não avisar antes do período configurado.
    if (daysUntilDue > preferences.daysBeforeDue) {
      return []
    }

    const amount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(invoice.pendingCents / 100)

    let title: string
    let message: string
    let priority: FinancialNotification['priority']

    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue)

      title = 'Fatura com vencimento ultrapassado'
      message =
        `O cartão ${invoice.cardName} possui ${amount} ` +
        `pendentes. O vencimento foi há ${daysOverdue} ` +
        `${daysOverdue === 1 ? 'dia' : 'dias'}.`

      priority = 'urgent'
    } else if (daysUntilDue === 0) {
      title = 'Fatura vence hoje'
      message =
        `O cartão ${invoice.cardName} possui ${amount} ` +
        'pendentes e vence hoje.'

      priority = 'urgent'
    } else {
      title = 'Fatura próxima do vencimento'
      message =
        `O cartão ${invoice.cardName} possui ${amount} ` +
        `pendentes e vence em ${daysUntilDue} ` +
        `${daysUntilDue === 1 ? 'dia' : 'dias'}.`

      priority = 'warning'
    }

    return [{
      id: invoice.id,
      type: 'card-invoice' as const,
      title,
      message,
      priority,
      createdAt: today,
      dueDate,
      referenceId: invoice.cardId,
      read: false,
    }]
  }).sort((a, b) =>
    (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
  )
}
