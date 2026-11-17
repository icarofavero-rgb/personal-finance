
import type { Transaction } from './storage'
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'
import type { DebtorsData } from './debtors/debtorsStorage'

type BaseRestorePlan = {
  transactions: Transaction[]
  cards: CreditCard[]
  purchases: CardPurchase[]
  payments: CardPayment[]
}

export type BackupRestorePlan =
  | (BaseRestorePlan & {
      version: 1 | 2 | 3 | 4
    })
  | (BaseRestorePlan & {
      version: 5
      debtorsData: DebtorsData
    })

export type BackupRestoreSummary = {
  version: number
  transactionCount: number
  cardCount: number
  purchaseCount: number
  paymentCount: number
  debtorCount: number
  debtCount: number
  debtorPaymentCount: number
}

export function summarizeRestorePlan(
  plan: BackupRestorePlan
): BackupRestoreSummary {
  return {
    version: plan.version,
    transactionCount: plan.transactions.length,
    cardCount: plan.cards.length,
    purchaseCount: plan.purchases.length,
    paymentCount: plan.payments.length,
    debtorCount:
      plan.version === 5
        ? plan.debtorsData.debtors.length
        : 0,
    debtCount:
      plan.version === 5
        ? plan.debtorsData.debts.length
        : 0,
    debtorPaymentCount:
      plan.version === 5
        ? plan.debtorsData.payments.length
        : 0,
  }
}
