
import {
  getTransactions,
  saveTransactions,
  type Transaction,
} from './storage'

import {
  getCardPayments,
  saveCardPayments,
  type CardPayment,
} from './cardPaymentsStorage'

import { getCards } from './cardsStorage'
import { getCardPurchases } from './cardPurchasesStorage'
import { getCardInvoices } from './cardInvoices'
import { validateCardPayment } from './cardPaymentValidation'
import { checkPaymentSafety } from './cardPaymentSafety'

import {
  prepareCardPaymentOperation,
} from './cardPaymentOperationPreparation'

import {
  savePendingPaymentOperation,
  clearPendingPaymentOperation,
} from './cardPaymentRecovery'

import {
  checkPendingPayment,
} from './cardPaymentRecoveryCheck'

export function registerCardPayment(
  payment: CardPayment
): Transaction {
  const safety = checkPaymentSafety()

  if (!safety.safe) {
    throw new Error(safety.message)
  }

  const cards = getCards()
  const purchases = getCardPurchases()
  const invoices = getCardInvoices(purchases, cards)

  const previousPayments = getCardPayments()
  const previousTransactions = getTransactions()

  const validation = validateCardPayment(
    payment,
    cards,
    invoices,
    previousPayments,
    previousTransactions
  )

  if (!validation.valid) {
    throw new Error(
      validation.error ?? 'Pagamento inválido.'
    )
  }

  const operation = prepareCardPaymentOperation(payment)

  if (
    previousTransactions.some(
      transaction =>
        transaction.id === operation.transaction.id
    )
  ) {
    throw new Error(
      'Identificador de transação duplicado.'
    )
  }

  // Guardar a operação antes de modificar os registros.
  savePendingPaymentOperation(operation)

  try {
    saveTransactions([
      ...previousTransactions,
      operation.transaction,
    ])

    saveCardPayments([
      ...previousPayments,
      operation.payment,
    ])
  } catch {
    throw new Error(
      'O pagamento não foi concluído normalmente. ' +
      'Uma operação pendente foi preservada para verificação. ' +
      'Não tente registrar novamente antes de conferir os dados.'
    )
  }

  // Conferir o resultado das gravações.
  const recovery = checkPendingPayment()

  if (recovery.status !== 'complete') {
    throw new Error(
      'Não foi possível confirmar os registros do pagamento. ' +
      'A operação pendente foi preservada. ' +
      `Situação: ${recovery.message}`
    )
  }

  // Remover a pendência somente após confirmar os registros.
  try {
    clearPendingPaymentOperation()
  } catch {
    throw new Error(
      'O pagamento foi gravado, mas não foi possível ' +
      'remover a operação pendente. ' +
      'Verifique os registros antes de tentar novamente.'
    )
  }

  return operation.transaction
}
