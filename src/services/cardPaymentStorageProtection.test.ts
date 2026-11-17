
import {
  deleteTransaction,
  updateTransaction,
  getTransactions,
} from './storage'

import type { Transaction } from './storage'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },

    setItem(key: string, value: string): void {
      memory.set(key, value)
    },

    removeItem(key: string): void {
      memory.delete(key)
    },
  },
})

const TRANSACTIONS_KEY = 'personal-finance-transactions'
const PAYMENTS_KEY = 'personal-finance-card-payments'

function assert(name: string, condition: boolean): void {
  if (!condition) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

const linkedTransaction: Transaction = {
  id: 'transaction-linked-1',
  description: 'Pagamento de fatura',
  amount: 100,
  type: 'expense',
  category: 'Cartão de crédito',
  date: '2026-11-04',
}

const normalTransaction: Transaction = {
  id: 'transaction-normal-1',
  description: 'Compra comum',
  amount: 50,
  type: 'expense',
  category: 'Outros',
  date: '2026-11-04',
}

memory.set(
  TRANSACTIONS_KEY,
  JSON.stringify([linkedTransaction, normalTransaction])
)

memory.set(
  PAYMENTS_KEY,
  JSON.stringify([
    {
      id: 'payment-test-1',
      cardId: 'card-test-1',
      invoiceMonth: '2026-11',
      amount: 100,
      date: '2026-11-04',
      transactionId: 'transaction-linked-1',
    },
  ])
)

// Teste 1: impedir exclusão de despesa vinculada
let linkedDeleteBlocked = false

try {
  deleteTransaction('transaction-linked-1')
} catch {
  linkedDeleteBlocked = true
}

assert(
  'Exclusão de despesa vinculada bloqueada',
  linkedDeleteBlocked &&
    getTransactions().some(
      transaction => transaction.id === 'transaction-linked-1'
    )
)

// Teste 2: impedir edição de despesa vinculada
let linkedEditBlocked = false

try {
  updateTransaction({
    ...linkedTransaction,
    amount: 999,
  })
} catch {
  linkedEditBlocked = true
}

assert(
  'Edição de despesa vinculada bloqueada',
  linkedEditBlocked &&
    getTransactions().find(
      transaction => transaction.id === 'transaction-linked-1'
    )?.amount === 100
)

// Teste 3: permitir edição de transação comum
updateTransaction({
  ...normalTransaction,
  amount: 75,
})

assert(
  'Edição de transação comum permitida',
  getTransactions().find(
    transaction => transaction.id === 'transaction-normal-1'
  )?.amount === 75
)

// Teste 4: permitir exclusão de transação comum
deleteTransaction('transaction-normal-1')

assert(
  'Exclusão de transação comum permitida',
  !getTransactions().some(
    transaction => transaction.id === 'transaction-normal-1'
  )
)

// Teste 5: preservar a despesa vinculada
assert(
  'Despesa vinculada preservada após os testes',
  getTransactions().length === 1 &&
    getTransactions()[0].id === 'transaction-linked-1'
)

console.log('Todos os testes de proteção do armazenamento passaram!')
