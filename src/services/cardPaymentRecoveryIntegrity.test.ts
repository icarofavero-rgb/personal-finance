
import {
  getPendingPaymentOperation,
} from './cardPaymentRecovery'

import {
  checkPaymentSafety,
} from './cardPaymentSafety'

import {
  checkPaymentsOnStartup,
} from './paymentStartupCheck'

const memory = new Map<string, string>()

const RECOVERY_KEY = 'personal-finance-pending-payment'

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

function assert(name: string, condition: boolean): void {
  if (!condition) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

function createOperation() {
  return {
    operationId: 'operation-test-1',
    createdAt: '2026-11-03T12:00:00.000Z',
    payment: {
      id: 'payment-test-1',
      cardId: 'card-test-1',
      invoiceMonth: '2026-11',
      amount: 30,
      date: '2026-11-04',
      transactionId: 'transaction-test-1',
    },
    transaction: {
      id: 'transaction-test-1',
      description: 'Pagamento de fatura 2026-11',
      amount: 30,
      type: 'expense',
      category: 'Cartão de crédito',
      date: '2026-11-04',
    },
  }
}

function testInvalidOperation(
  name: string,
  operation: ReturnType<typeof createOperation>
): void {
  memory.clear()
  memory.set(RECOVERY_KEY, JSON.stringify(operation))

  let rejected = false

  try {
    getPendingPaymentOperation()
  } catch {
    rejected = true
  }

  assert(`${name}: recuperação rejeitada`, rejected)

  assert(
    `${name}: novos pagamentos bloqueados`,
    checkPaymentSafety().safe === false
  )

  assert(
    `${name}: aviso na inicialização`,
    checkPaymentsOnStartup().needsAttention === true
  )
}

// 1. Pagamento e despesa com valores diferentes
const differentAmount = createOperation()
differentAmount.transaction.amount = 50

testInvalidOperation('Valores divergentes', differentAmount)

// 2. Identificadores sem correspondência
const differentId = createOperation()
differentId.payment.transactionId = 'outro-id'

testInvalidOperation('Identificadores divergentes', differentId)

// 3. Datas diferentes
const differentDate = createOperation()
differentDate.transaction.date = '2026-11-05'

testInvalidOperation('Datas divergentes', differentDate)

// 4. Data inexistente
const invalidDate = createOperation()
invalidDate.payment.date = '2026-02-30'
invalidDate.transaction.date = '2026-02-30'

testInvalidOperation('Data inexistente', invalidDate)

// 5. Valor negativo
const negativeAmount = createOperation()
negativeAmount.payment.amount = -30
negativeAmount.transaction.amount = -30

testInvalidOperation('Valor negativo', negativeAmount)

// 6. Valor com casas decimais inválidas
const invalidCents = createOperation()
invalidCents.payment.amount = 30.999
invalidCents.transaction.amount = 30.999

testInvalidOperation('Centavos inválidos', invalidCents)

console.log('Todos os testes de integridade passaram!')
