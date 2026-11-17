
import type { CardPayment } from './cardPaymentsStorage'
import type { Transaction } from './storage'

export type PendingPaymentOperation = {
  operationId: string
  createdAt: string
  payment: CardPayment
  transaction: Transaction
}

const RECOVERY_KEY = 'personal-finance-pending-payment'

function isValidPendingOperation(
  value: unknown
): value is PendingPaymentOperation {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }

  const operation = value as Record<string, unknown>

  if (
    typeof operation.operationId !== 'string' ||
    !operation.operationId.trim() ||
    typeof operation.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(operation.createdAt)) ||
    typeof operation.payment !== 'object' ||
    operation.payment === null ||
    Array.isArray(operation.payment) ||
    typeof operation.transaction !== 'object' ||
    operation.transaction === null ||
    Array.isArray(operation.transaction)
  ) {
    return false
  }

  const payment = operation.payment as Record<string, unknown>
  const transaction = operation.transaction as Record<string, unknown>

  if (
    typeof payment.id !== 'string' ||
    !payment.id.trim() ||
    typeof payment.cardId !== 'string' ||
    !payment.cardId.trim() ||
    typeof payment.invoiceMonth !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(payment.invoiceMonth) ||
    typeof payment.transactionId !== 'string' ||
    !payment.transactionId.trim() ||
    typeof payment.amount !== 'number' ||
    !Number.isFinite(payment.amount) ||
    payment.amount <= 0 ||
    !Number.isSafeInteger(Math.round(payment.amount * 100)) ||
    Math.abs(
      payment.amount * 100 -
      Math.round(payment.amount * 100)
    ) > 0.000001 ||
    typeof payment.date !== 'string' ||
    typeof transaction.id !== 'string' ||
    !transaction.id.trim() ||
    typeof transaction.description !== 'string' ||
    !transaction.description.trim() ||
    typeof transaction.category !== 'string' ||
    !transaction.category.trim() ||
    transaction.type !== 'expense' ||
    typeof transaction.amount !== 'number' ||
    typeof transaction.date !== 'string'
  ) {
    return false
  }

  const isValidCalendarDate = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false
    }

    const [year, month, day] = date.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    )
  }

  return (
    payment.transactionId === transaction.id &&
    payment.amount === transaction.amount &&
    payment.date === transaction.date &&
    isValidCalendarDate(payment.date as string) &&
    isValidCalendarDate(transaction.date as string)
  )
}


export function getPendingPaymentOperation():
  PendingPaymentOperation | null {
  const saved = localStorage.getItem(RECOVERY_KEY)

  if (saved === null) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      'O registro de recuperação de pagamentos está corrompido. ' +
      'Nenhum novo pagamento deve ser registrado até a verificação.'
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      'O registro de recuperação possui formato inválido.'
    )
  }

  const operation = parsed as Record<string, unknown>

  if (
    typeof operation.operationId !== 'string' ||
    !operation.operationId.trim() ||
    typeof operation.createdAt !== 'string' ||
    !operation.createdAt.trim() ||
    typeof operation.payment !== 'object' ||
    operation.payment === null ||
    Array.isArray(operation.payment) ||
    typeof operation.transaction !== 'object' ||
    operation.transaction === null ||
    Array.isArray(operation.transaction)
  ) {
    throw new Error(
      'O registro de recuperação está incompleto ou inválido.'
    )
  }

  if (!isValidPendingOperation(parsed)) {
  throw new Error(
    'A operação pendente contém dados financeiros inválidos. ' +
    'Novos pagamentos devem permanecer bloqueados.'
  )
}

return parsed
}


export function savePendingPaymentOperation(
  operation: PendingPaymentOperation
): void {
  localStorage.setItem(
    RECOVERY_KEY,
    JSON.stringify(operation)
  )
}

export function clearPendingPaymentOperation(): void {
  localStorage.removeItem(RECOVERY_KEY)
}
