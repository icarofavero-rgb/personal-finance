
import {
  getCardPayments,
} from './cardPaymentsStorage'

export type TransactionProtectionResult = {
  protected: boolean
  message: string
}

export function checkTransactionProtection(
  transactionId: string
): TransactionProtectionResult {
  const storageKey = 'personal-finance-card-payments'

  let stored: string | null

  try {
    stored = localStorage.getItem(storageKey)
  } catch {
    throw new Error(
      'Não foi possível validar os pagamentos de faturas.'
    )
  }

  if (stored !== null) {
    try {
      const parsed: unknown = JSON.parse(stored)

      if (!Array.isArray(parsed)) {
        throw new Error('Formato inválido.')
      }

      // Não permitir que a leitura silenciosa de pagamentos
      // inválidos desative a proteção das transações.
      const payments = getCardPayments()

      if (payments.length !== parsed.length) {
        throw new Error('Pagamentos inválidos.')
      }
    } catch {
      throw new Error(
        'Não foi possível validar os pagamentos de faturas.'
      )
    }
  }

  const payments = getCardPayments()

  const linkedPayment = payments.find(
    payment => payment.transactionId === transactionId
  )

  if (linkedPayment) {
    return {
      protected: true,
      message:
        'Esta transação está vinculada ao pagamento ' +
        'de uma fatura de cartão. ' +
        'Ela não pode ser editada ou excluída separadamente.',
    }
  }

  return {
    protected: false,
    message: '',
  }
}
