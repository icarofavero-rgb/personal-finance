
import {
  checkPaymentSafety,
} from './cardPaymentSafety'

import {
  checkPaymentsOnStartup,
} from './paymentStartupCheck'

const memory = new Map<string, string>()

const fakeStorage = {
  getItem(key: string): string | null {
    return memory.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    memory.set(key, value)
  },

  removeItem(key: string): void {
    memory.delete(key)
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: fakeStorage,
  configurable: true,
})

const RECOVERY_KEY =
  'personal-finance-pending-payment'

function assert(
  name: string,
  condition: boolean
): void {
  if (!condition) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

// Teste 1: nenhuma operação pendente
memory.clear()

assert(
  'Sem pendências, pagamentos permitidos',
  checkPaymentSafety().safe === true
)

assert(
  'Sem pendências, nenhum alerta inicial',
  checkPaymentsOnStartup().needsAttention === false
)

// Teste 2: JSON corrompido
memory.set(RECOVERY_KEY, '{invalid-json')

assert(
  'JSON corrompido bloqueia pagamentos',
  checkPaymentSafety().safe === false
)

assert(
  'JSON corrompido gera alerta inicial',
  checkPaymentsOnStartup().needsAttention === true
)

// Teste 3: estrutura inválida
memory.set(
  RECOVERY_KEY,
  JSON.stringify({ operationId: '123' })
)

assert(
  'Estrutura incompleta bloqueia pagamentos',
  checkPaymentSafety().safe === false
)

// Teste 4: valor nulo armazenado
memory.set(RECOVERY_KEY, 'null')

assert(
  'Registro nulo bloqueia pagamentos',
  checkPaymentSafety().safe === false
)

// Teste 5: estrutura com arrays indevidos
memory.set(
  RECOVERY_KEY,
  JSON.stringify({
    operationId: 'operation-test',
    createdAt: '2026-11-03T12:00:00.000Z',
    payment: [],
    transaction: [],
  })
)

assert(
  'Estrutura com arrays bloqueia pagamentos',
  checkPaymentSafety().safe === false
)

console.log('Todos os testes de segurança passaram!')
