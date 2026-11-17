
export type CardPayment = {
  id: string
  cardId: string
  invoiceMonth: string
  amount: number
  date: string
  transactionId?: string
}

const STORAGE_KEY = 'personal-finance-card-payments'

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}

function isValidPayment(value: unknown): value is CardPayment {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }

  const payment = value as Record<string, unknown>

  return (
    typeof payment.id === 'string' &&
    payment.id.trim().length > 0 &&
    typeof payment.cardId === 'string' &&
    payment.cardId.trim().length > 0 &&
    typeof payment.invoiceMonth === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(payment.invoiceMonth) &&
    typeof payment.amount === 'number' &&
    Number.isFinite(payment.amount) &&
    payment.amount > 0 &&
    Number.isSafeInteger(Math.round(payment.amount * 100)) &&
    typeof payment.date === 'string' &&
    isValidDate(payment.date) &&
    (
      payment.transactionId === undefined ||
      (
        typeof payment.transactionId === 'string' &&
        payment.transactionId.trim().length > 0
      )
    )
  )
}

export function getCardPayments(): CardPayment[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)

    if (
      !Array.isArray(parsed) ||
      !parsed.every(isValidPayment)
    ) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}

export function saveCardPayments(
  payments: CardPayment[]
): void {
  if (
    !Array.isArray(payments) ||
    !payments.every(isValidPayment)
  ) {
    throw new Error('Existem pagamentos inválidos.')
  }

  const ids = payments.map(payment => payment.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error('Existem pagamentos duplicados.')
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(payments)
  )
}

export function addCardPayment(
  payment: CardPayment
): void {
  if (!isValidPayment(payment)) {
    throw new Error('Dados do pagamento inválidos.')
  }

  const payments = getCardPayments()

  if (payments.some(item => item.id === payment.id)) {
    throw new Error('Este pagamento já está cadastrado.')
  }

  saveCardPayments([...payments, payment])
}

export function deleteCardPayment(id: string): void {
  const payments = getCardPayments()

  saveCardPayments(
    payments.filter(payment => payment.id !== id)
  )
}

