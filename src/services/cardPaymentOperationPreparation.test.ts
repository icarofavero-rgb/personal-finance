
import {
  prepareCardPaymentOperation,
} from './cardPaymentOperationPreparation'

import type {
  CardPayment,
} from './cardPaymentsStorage'

const payment: CardPayment = {
  id: 'payment-test-1',
  cardId: 'card-test-1',
  invoiceMonth: '2026-11',
  amount: 250,
  date: '2026-11-03',
}

const operation = prepareCardPaymentOperation(payment)

function assert(
  name: string,
  condition: boolean
): void {
  if (!condition) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

assert(
  'Operação possui identificador',
  operation.operationId.length > 0
)

assert(
  'Despesa criada corretamente',
  operation.transaction.type === 'expense' &&
  operation.transaction.amount === 250
)

assert(
  'Pagamento vinculado à despesa',
  operation.payment.transactionId ===
    operation.transaction.id
)

assert(
  'Data preservada',
  operation.transaction.date === payment.date
)

assert(
  'Pagamento original não foi modificado',
  payment.transactionId === undefined
)

console.log('Todos os testes de preparação passaram!')
