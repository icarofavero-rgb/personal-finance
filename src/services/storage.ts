import { checkTransactionProtection } from './cardPaymentTransactionProtection'
import { getCardPayments } from './cardPaymentsStorage'

export type Transaction = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  /** observação opcional */
  notes?: string
  /** boleto: data em que foi pago (sem o campo: ainda a pagar) */
  paidAt?: string
}

const STORAGE_KEY = 'personal-finance-transactions'

/** Avisa a tela principal que as transações mudaram fora do formulário. */
export const TRANSACTIONS_CHANGED_EVENT = 'personal-finance-transactions-changed'

export function getTransactions(): Transaction[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return []

    const data: unknown = JSON.parse(saved)

    return Array.isArray(data) ? data as Transaction[] : []
  } catch {
    return []
  }
}


export function saveTransactions(transactions: Transaction[]): void {
  const existingTransactions = getTransactions()

  const ids = transactions.map(transaction => transaction.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error(
      'Não é permitido salvar transações com identificadores duplicados.'
    )
  }

  for (const existing of existingTransactions) {
    const protection = checkTransactionProtection(existing.id)

    if (!protection.protected) {
      continue
    }

    const updated = transactions.find(
      transaction => transaction.id === existing.id
    )

    if (!updated) {
      throw new Error(
        'Não é permitido remover uma despesa vinculada a uma fatura.'
      )
    }

    // Nome, categoria e observação podem mudar à vontade. Valor e data
    // precisam continuar iguais aos do pagamento da fatura (editar pela
    // tela muda os dois juntos: updateInvoicePaymentTransaction).
    const linkedPayment = getCardPayments().find(payment => payment.transactionId === existing.id)
    const amountOk = linkedPayment ? Math.round(updated.amount * 100) === Math.round(linkedPayment.amount * 100) : updated.amount === existing.amount
    const dateOk = linkedPayment ? updated.date === linkedPayment.date : updated.date === existing.date
    if (updated.type !== existing.type || !amountOk || !dateOk) {
      throw new Error(
        'Não é permitido modificar uma despesa vinculada a uma fatura.'
      )
    }
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(transactions)
  )
}


export function addTransaction(transaction: Transaction): void {
  const transactions = getTransactions()

  transactions.push(transaction)

  saveTransactions(transactions)
}


export function deleteTransaction(id: string): void {
  const protection = checkTransactionProtection(id)

  if (protection.protected) {
    throw new Error(protection.message)
  }

  const transactions = getTransactions()

  const updated = transactions.filter(
    transaction => transaction.id !== id
  )

  saveTransactions(updated)
}



export function updateTransaction(
  updatedTransaction: Transaction
): void {
  const protection = checkTransactionProtection(
    updatedTransaction.id
  )

  if (protection.protected) {
    throw new Error(protection.message)
  }

  const transactions = getTransactions()

  const updated = transactions.map(transaction =>
    transaction.id === updatedTransaction.id
      ? updatedTransaction
      : transaction
  )

  saveTransactions(updated)
}


export type BoletoStatus = 'paid' | 'pending' | 'overdue'

/** Situação de um boleto: pago, a pagar ou vencido (data já passou). */
export function getBoletoStatus(transaction: Pick<Transaction, 'date' | 'paidAt'>, today = new Date().toLocaleDateString('en-CA')): BoletoStatus {
  if (transaction.paidAt) return 'paid'
  return transaction.date < today ? 'overdue' : 'pending'
}

/** Marca (ou desmarca, com paidAt = null) o pagamento de um boleto. */
export function setTransactionPaid(id: string, paidAt: string | null): void {
  const list = getTransactions()
  const next = list.map(item => {
    if (item.id !== id) return item
    const { paidAt: _old, ...rest } = item
    void _old
    return paidAt ? { ...rest, paidAt } : rest
  })
  saveTransactions(next)
}
