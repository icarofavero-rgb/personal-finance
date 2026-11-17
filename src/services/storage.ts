import { checkTransactionProtection } from './cardPaymentTransactionProtection'

export type Transaction = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

const STORAGE_KEY = 'personal-finance-transactions'

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

    if (
      updated.description !== existing.description ||
      updated.amount !== existing.amount ||
      updated.type !== existing.type ||
      updated.category !== existing.category ||
      updated.date !== existing.date
    ) {
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

