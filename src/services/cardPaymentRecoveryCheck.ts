
import {
  getPendingPaymentOperation,
} from './cardPaymentRecovery'

import {
  getCardPayments,
} from './cardPaymentsStorage'

import {
  getTransactions,
} from './storage'

export type PaymentRecoveryStatus =
  | 'none'
  | 'complete'
  | 'missing-payment'
  | 'missing-transaction'
  | 'missing-both'
  | 'conflict'

export type PaymentRecoveryCheck = {
  status: PaymentRecoveryStatus
  message: string
}

export function checkPendingPayment():
  PaymentRecoveryCheck {
  const pending = getPendingPaymentOperation()

  if (!pending) {
    return {
      status: 'none',
      message: 'Nenhuma operação pendente encontrada.',
    }
  }

  const payments = getCardPayments()
  const transactions = getTransactions()

  const savedPayment = payments.find(
    item => item.id === pending.payment.id
  )

  const savedTransaction = transactions.find(
    item => item.id === pending.transaction.id
  )

  if (
    savedPayment &&
    (
      savedPayment.transactionId !==
        pending.transaction.id ||
      savedPayment.cardId !== pending.payment.cardId ||
      savedPayment.invoiceMonth !==
        pending.payment.invoiceMonth ||
      savedPayment.amount !== pending.payment.amount ||
      savedPayment.date !== pending.payment.date
    )
  ) {
    return {
      status: 'conflict',
      message: 'O pagamento salvo apresenta divergências.',
    }
  }

  if (
    savedTransaction &&
    (
      savedTransaction.type !== 'expense' ||
      savedTransaction.amount !==
        pending.transaction.amount ||
      savedTransaction.date !==
        pending.transaction.date ||
      savedTransaction.description !==
        pending.transaction.description ||
      savedTransaction.category !==
        pending.transaction.category
    )
  ) {
    return {
      status: 'conflict',
      message: 'A transação salva apresenta divergências.',
    }
  }

  if (savedPayment && savedTransaction) {
    return {
      status: 'complete',
      message: 'Pagamento e transação encontrados.',
    }
  }

  if (savedPayment) {
    return {
      status: 'missing-transaction',
      message: 'Pagamento encontrado, mas falta a despesa.',
    }
  }

  if (savedTransaction) {
    return {
      status: 'missing-payment',
      message: 'Despesa encontrada, mas falta o pagamento.',
    }
  }

  return {
    status: 'missing-both',
    message: 'Pagamento e despesa ainda não foram encontrados.',
  }
}
