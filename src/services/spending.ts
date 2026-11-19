/**
 * Gastos do mês, de TODAS as formas de pagamento.
 *
 * - Transações normais (Pix, débito, dinheiro, boleto) entram como estão.
 * - Compras no cartão de crédito entram parcela por parcela: a 1ª no mês
 *   da compra, a 2ª no mês seguinte e assim por diante.
 * - O pagamento da fatura NÃO entra de novo (o gasto já foi contado nas
 *   compras do cartão) — assim nada é contado em dobro.
 */

import type { Transaction } from './storage'
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'
import { calculateInstallments } from './cardInvoices'

export type SpendingEntry = Transaction & {
  source: 'transaction' | 'card'
  cardId?: string
  purchaseId?: string
}

/** Mesma data N meses depois (dia 31 vira o último dia em meses curtos). */
export function shiftDate(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(year, month - 1 + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(Math.min(day, lastDay)).padStart(2, '0'),
  ].join('-')
}

export function buildSpendingEntries(
  transactions: Transaction[],
  purchases: CardPurchase[],
  payments: CardPayment[],
  cards: CreditCard[]
): SpendingEntry[] {
  const invoicePaymentIds = new Set(payments.map(payment => payment.transactionId).filter(Boolean))

  const entries: SpendingEntry[] = transactions
    .filter(transaction => !invoicePaymentIds.has(transaction.id))
    .map(transaction => ({ ...transaction, source: 'transaction' as const }))

  for (const purchase of purchases) {
    const card = cards.find(item => item.id === purchase.cardId)
    if (!card) continue

    let installments
    try {
      installments = calculateInstallments(purchase, card)
    } catch {
      continue
    }

    for (const installment of installments) {
      const number = installment.installmentNumber
      entries.push({
        id: `card-${purchase.id}-${number}`,
        description:
          installment.totalInstallments > 1
            ? `${purchase.description} (${number}/${installment.totalInstallments})`
            : purchase.description,
        amount: installment.amount,
        type: 'expense',
        category: purchase.category,
        date: shiftDate(purchase.date, number - 1),
        source: 'card',
        cardId: purchase.cardId,
        purchaseId: purchase.id,
      })
    }
  }

  return entries
}
