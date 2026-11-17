
import { getCardPurchases } from '../cardPurchasesStorage'
import type { DebtorDebt } from './debtorsTypes'

export function validateDebtCardLink(
  debt: DebtorDebt
): void {
  if (!debt.cardPurchaseId) return

  const purchases = getCardPurchases()

  const purchase = purchases.find(
    item => item.id === debt.cardPurchaseId
  )

  if (!purchase) {
    throw new Error(
      'Compra do cartão não encontrada.'
    )
  }

  const purchaseAmountCents = Math.round(
    purchase.amount * 100
  )

  if (
    !Number.isSafeInteger(purchaseAmountCents) ||
    purchaseAmountCents <= 0
  ) {
    throw new Error('Valor da compra inválido.')
  }

  if (debt.amountCents !== purchaseAmountCents) {
    throw new Error(
      'O valor da dívida deve corresponder ao valor da compra.'
    )
  }

  if (debt.installments !== purchase.installments) {
    throw new Error(
      'As parcelas da dívida devem corresponder às da compra.'
    )
  }
}
