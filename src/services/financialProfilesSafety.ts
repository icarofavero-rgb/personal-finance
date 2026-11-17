
import {
  getFinancialProfilesState,
} from './financialProfilesStorage'

import { getTransactions } from './storage'
import { getCards } from './cardsStorage'
import { getCardPurchases } from './cardPurchasesStorage'
import { getCardPayments } from './cardPaymentsStorage'
import { getDebtorsData } from './debtors/debtorsStorage'

export type FinancialProfilesSafetyReport = {
  safe: boolean
  messages: string[]
  counts: {
    profiles: number
    transactions: number
    cards: number
    purchases: number
    payments: number
    debtors: number
    debts: number
    debtorPayments: number
  }
}

export function inspectFinancialProfilesSafety():
  FinancialProfilesSafetyReport {
  const state = getFinancialProfilesState()

  const transactions = getTransactions()
  const cards = getCards()
  const purchases = getCardPurchases()
  const payments = getCardPayments()
  const debtors = getDebtorsData()

  const messages: string[] = []

  const cardIds = new Set(cards.map(card => card.id))
  const transactionIds = new Set(
    transactions.map(transaction => transaction.id)
  )
  const purchaseIds = new Set(
    purchases.map(purchase => purchase.id)
  )

  for (const purchase of purchases) {
    if (!cardIds.has(purchase.cardId)) {
      messages.push(
        `Compra ${purchase.id} vinculada a cartão inexistente.`
      )
    }
  }

  for (const payment of payments) {
    if (!cardIds.has(payment.cardId)) {
      messages.push(
        `Pagamento ${payment.id} vinculado a cartão inexistente.`
      )
    }

    if (
      payment.transactionId &&
      !transactionIds.has(payment.transactionId)
    ) {
      messages.push(
        `Pagamento ${payment.id} vinculado a transação inexistente.`
      )
    }
  }

  for (const debt of debtors.debts) {
    if (
      debt.cardPurchaseId &&
      !purchaseIds.has(debt.cardPurchaseId)
    ) {
      messages.push(
        `Dívida ${debt.id} vinculada a compra inexistente.`
      )
    }
  }

  const debtorIds = new Set(
    debtors.debtors.map(debtor => debtor.id)
  )

  const debtIds = new Set(
    debtors.debts.map(debt => debt.id)
  )

  for (const debt of debtors.debts) {
    if (!debtorIds.has(debt.debtorId)) {
      messages.push(
        `Dívida ${debt.id} vinculada a devedor inexistente.`
      )
    }
  }

  for (const payment of debtors.payments) {
    if (!debtIds.has(payment.debtId)) {
      messages.push(
        `Recebimento ${payment.id} vinculado a dívida inexistente.`
      )
    }
  }

  function hasDuplicateIds(
    items: { id: string }[]
  ): boolean {
    const ids = items.map(item => item.id)
    return new Set(ids).size !== ids.length
  }

  if (hasDuplicateIds(transactions)) {
    messages.push('Existem transações com IDs duplicados.')
  }

  if (hasDuplicateIds(cards)) {
    messages.push('Existem cartões com IDs duplicados.')
  }

  if (hasDuplicateIds(purchases)) {
    messages.push('Existem compras com IDs duplicados.')
  }

  if (hasDuplicateIds(payments)) {
    messages.push('Existem pagamentos com IDs duplicados.')
  }

  if (hasDuplicateIds(debtors.debtors)) {
    messages.push('Existem devedores com IDs duplicados.')
  }

  if (hasDuplicateIds(debtors.debts)) {
    messages.push('Existem dívidas com IDs duplicados.')
  }

  if (hasDuplicateIds(debtors.payments)) {
    messages.push('Existem recebimentos com IDs duplicados.')
  }

  return {
    safe: messages.length === 0,
    messages,
    counts: {
      profiles: state.profiles.length,
      transactions: transactions.length,
      cards: cards.length,
      purchases: purchases.length,
      payments: payments.length,
      debtors: debtors.debtors.length,
      debts: debtors.debts.length,
      debtorPayments: debtors.payments.length,
    },
  }
}
