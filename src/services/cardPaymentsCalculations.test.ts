
import {
  calculateInvoicePayment,
} from './cardPaymentsCalculations'

import type {
  CardPayment,
} from './cardPaymentsStorage'

const cardId = 'cartao-teste'
const invoiceMonth = '2026-11'
const invoiceTotal = 83.34

function createPayment(amount: number): CardPayment {
  return {
    id: `teste-${amount}`,
    cardId,
    invoiceMonth,
    amount,
    date: '2026-11-03',
  }
}

function check(
  name: string,
  actual: unknown,
  expected: unknown
): void {
  if (actual !== expected) {
    throw new Error(
      `${name}: esperado ${expected}, recebido ${actual}`
    )
  }
}

// Teste 1: fatura sem pagamento
const unpaid = calculateInvoicePayment(
  invoiceTotal,
  [],
  cardId,
  invoiceMonth
)

check('Sem pagamento', unpaid.status, 'unpaid')
check('Saldo inicial', unpaid.remaining, 83.34)

// Teste 2: pagamento parcial
const partial = calculateInvoicePayment(
  invoiceTotal,
  [createPayment(50)],
  cardId,
  invoiceMonth
)

check('Pagamento parcial', partial.status, 'partial')
check('Saldo parcial', partial.remaining, 33.34)

// Teste 3: pagamento total
const paid = calculateInvoicePayment(
  invoiceTotal,
  [createPayment(83.34)],
  cardId,
  invoiceMonth
)

check('Pagamento total', paid.status, 'paid')
check('Saldo quitado', paid.remaining, 0)

// Teste 4: pagamento excedente
const overpaid = calculateInvoicePayment(
  invoiceTotal,
  [createPayment(100)],
  cardId,
  invoiceMonth
)

check('Pagamento excedente', overpaid.status, 'overpaid')
check('Crédito excedente', overpaid.overpayment, 16.66)

// Teste 5: múltiplos pagamentos
const multiple = calculateInvoicePayment(
  invoiceTotal,
  [createPayment(30), createPayment(53.34)],
  cardId,
  invoiceMonth
)

check('Múltiplos pagamentos', multiple.status, 'paid')
check('Total de pagamentos', multiple.totalPaid, 83.34)

console.log('Todos os testes de pagamento passaram!')
