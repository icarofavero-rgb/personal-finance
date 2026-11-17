
import {
  validateCardPayment,
} from './cardPaymentValidation'

import type { CreditCard } from './cardsStorage'
import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

const cards: CreditCard[] = [
  {
    id: 'card-test-1',
    name: 'Cartão Teste',
    bank: 'Banco Teste',
    limit: 1000,
    closingDay: 10,
    dueDay: 17,
  },
]

const invoices: CardInvoice[] = [
  {
    cardId: 'card-test-1',
    invoiceMonth: '2026-11',
    total: 83.34,
    installments: [],
  },
]

const previousPayment: CardPayment = {
  id: 'previous-payment',
  cardId: 'card-test-1',
  invoiceMonth: '2026-11',
  amount: 30,
  date: '2026-11-03',
}

function testPayment(
  name: string,
  amount: number,
  expected: boolean
) {
  const payment: CardPayment = {
    id: crypto.randomUUID(),
    cardId: 'card-test-1',
    invoiceMonth: '2026-11',
    amount,
    date: '2026-11-04',
  }

  const result = validateCardPayment(
    payment,
    cards,
    invoices,
    [previousPayment]
  )

  if (result.valid !== expected) {
    throw new Error(
      `${name}: esperado ${expected}, recebido ${result.valid}. ` +
      (result.error ?? '')
    )
  }

  console.log(`OK: ${name}`)
}

testPayment(
  'Pagamento parcial permitido',
  20,
  true
)

testPayment(
  'Pagamento exato do saldo permitido',
  53.34,
  true
)

testPayment(
  'Pagamento acima do saldo bloqueado',
  60,
  false
)

testPayment(
  'Pagamento negativo bloqueado',
  -10,
  false
)

testPayment(
  'Pagamento com mais de duas casas decimais bloqueado',
  10.999,
  false
)

console.log('Todos os testes de saldo passaram!')
