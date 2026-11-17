
import type { CardPayment } from './cardPaymentsStorage'
import type { Transaction } from './storage'

import type {
  PendingPaymentOperation,
} from './cardPaymentRecovery'

export function prepareCardPaymentOperation(
  payment: CardPayment
): PendingPaymentOperation {
  if (payment.transactionId !== undefined) {
    throw new Error(
      'O pagamento não pode chegar com uma transação vinculada.'
    )
  }

  const transactionId = crypto.randomUUID()

  const transaction: Transaction = {
    id: transactionId,
    description: `Pagamento de fatura ${payment.invoiceMonth}`,
    amount: payment.amount,
    type: 'expense',
    category: 'Cartão de crédito',
    date: payment.date,
  }

  const paymentWithTransaction: CardPayment = {
    ...payment,
    transactionId,
  }

  return {
    operationId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    payment: paymentWithTransaction,
    transaction,
  }
}
