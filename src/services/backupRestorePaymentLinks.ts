
import type { BackupRestorePlan } from './backupRestorePlan'

export type PaymentLinkIntegrityReport = {
  valid: boolean
  errors: string[]
}

export function inspectRestorePaymentLinks(
  plan: BackupRestorePlan
): PaymentLinkIntegrityReport {
  const errors: string[] = []

  const transactionsById = new Map(
    plan.transactions.map(transaction => [
      transaction.id,
      transaction,
    ])
  )

  const usedTransactionIds = new Set<string>()

  for (const payment of plan.payments) {
    const transactionId = payment.transactionId

    if (
      typeof transactionId !== 'string' ||
      transactionId.trim().length === 0
    ) {
      errors.push(
        `O pagamento "${payment.id}" não possui uma transação vinculada.`
      )
      continue
    }

    if (usedTransactionIds.has(transactionId)) {
      errors.push(
        `A transação "${transactionId}" está vinculada a mais de um pagamento.`
      )
      continue
    }

    usedTransactionIds.add(transactionId)

    const transaction = transactionsById.get(transactionId)

    if (!transaction) {
      errors.push(
        `O pagamento "${payment.id}" referencia uma transação inexistente.`
      )
      continue
    }

    if (transaction.type !== 'expense') {
      errors.push(
        `O pagamento "${payment.id}" está vinculado a uma receita, não a uma despesa.`
      )
    }

    const paymentCents = Math.round(payment.amount * 100)
    const transactionCents = Math.round(transaction.amount * 100)

    if (paymentCents !== transactionCents) {
      errors.push(
        `O pagamento "${payment.id}" possui valor diferente da despesa vinculada.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
