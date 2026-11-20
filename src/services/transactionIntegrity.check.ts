
import {
  getTransactions,
  saveTransactions,
  type Transaction,
} from './storage'

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

function expectBlocked(
  name: string,
  operation: () => void
): void {
  const before = memory.get(TRANSACTIONS_KEY)

  let blocked = false

  try {
    operation()
  } catch {
    blocked = true
  }

  assert(
    name,
    blocked && memory.get(TRANSACTIONS_KEY) === before
  )
}

const linked: Transaction = {
  id: 'linked-1',
  description: 'Pagamento de fatura',
  amount: 150,
  type: 'expense',
  category: 'Cartão de crédito',
  date: '2026-11-04',
}

const normal: Transaction = {
  id: 'normal-1',
  description: 'Mercado',
  amount: 60,
  type: 'expense',
  category: 'Alimentação',
  date: '2026-11-04',
}

memory.set(
  TRANSACTIONS_KEY,
  JSON.stringify([linked, normal])
)

memory.set(
  PAYMENTS_KEY,
  JSON.stringify([
    {
      id: 'payment-1',
      cardId: 'card-1',
      invoiceMonth: '2026-11',
      amount: 150,
      date: '2026-11-04',
      transactionId: linked.id,
    },
  ])
)

// Teste 1: impedir remoção da despesa vinculada
expectBlocked(
  'Remoção de despesa vinculada bloqueada',
  () => saveTransactions([normal])
)

// Teste 2: impedir alteração do valor
expectBlocked(
  'Alteração de valor vinculada bloqueada',
  () =>
    saveTransactions([
      { ...linked, amount: 999 },
      normal,
    ])
)

// Teste 3: nome e categoria PODEM mudar (valor e data continuam presos ao
// pagamento da fatura — teste 2)
saveTransactions([
  { ...linked, description: 'Alterado', category: 'Finanças' },
  normal,
])

assert(
  'Alteração de nome/categoria da despesa vinculada permitida',
  getTransactions().find(transaction => transaction.id === linked.id)?.description === 'Alterado'
)

// volta ao original para os próximos testes
saveTransactions([linked, normal])

// Teste 3b: mudar a data sem mudar o pagamento continua bloqueado
expectBlocked(
  'Alteração de data vinculada bloqueada',
  () =>
    saveTransactions([
      { ...linked, date: '2026-11-20' },
      normal,
    ])
)

// Teste 4: impedir identificadores duplicados
expectBlocked(
  'Identificadores duplicados bloqueados',
  () => saveTransactions([linked, normal, normal])
)

// Teste 5: permitir adição de transação comum
const newTransaction: Transaction = {
  id: 'normal-2',
  description: 'Transporte',
  amount: 25,
  type: 'expense',
  category: 'Transporte',
  date: '2026-11-04',
}

saveTransactions([linked, normal, newTransaction])

assert(
  'Nova transação comum adicionada',
  getTransactions().some(
    transaction => transaction.id === newTransaction.id
  )
)

// Teste 6: permitir atualização de transação comum
saveTransactions([
  linked,
  { ...normal, amount: 80 },
  newTransaction,
])

assert(
  'Atualização de transação comum permitida',
  getTransactions().find(
    transaction => transaction.id === normal.id
  )?.amount === 80
)

// Teste 7: preservar a despesa vinculada
assert(
  'Despesa vinculada permanece íntegra',
  getTransactions().some(
    transaction =>
      transaction.id === linked.id &&
      transaction.amount === 150 &&
      transaction.description === 'Pagamento de fatura'
  )
)

console.log('Todos os testes de integridade passaram!')
