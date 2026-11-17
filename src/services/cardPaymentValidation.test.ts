
import { describe, expect, it } from 'vitest'

import { validateCardPayment } from './cardPaymentValidation'

import type { CreditCard } from './cardsStorage'
import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

const card: CreditCard = {
  id: 'cartao-teste',
  name: 'Cartão de Teste',
  bank: 'Banco Fictício',
  limit: 1000,
  closingDay: 10,
  dueDay: 20,
}

const invoice: CardInvoice = {
  cardId: card.id,
  invoiceMonth: '2026-11',
  total: 150,
  installments: [],
}

function makePayment(
  overrides: Partial<CardPayment> = {}
): CardPayment {
  return {
    id: 'pagamento-teste',
    cardId: card.id,
    invoiceMonth: '2026-11',
    amount: 50,
    date: '2026-11-08',
    ...overrides,
  }
}

describe('Validação de pagamentos de faturas', () => {
  it('aceita um pagamento parcial de R$ 50', () => {
    const result = validateCardPayment(
      makePayment(),
      [card],
      [invoice],
      []
    )

    expect(result.valid).toBe(true)
  })

  it('aceita a quitação dos R$ 100 restantes', () => {
    const previousPayment = makePayment({
      id: 'pagamento-anterior',
    })

    const result = validateCardPayment(
      makePayment({
        id: 'pagamento-final',
        amount: 100,
      }),
      [card],
      [invoice],
      [previousPayment]
    )

    expect(result.valid).toBe(true)
  })

  it('rejeita pagamento superior ao saldo restante', () => {
    const result = validateCardPayment(
      makePayment({ amount: 151 }),
      [card],
      [invoice],
      []
    )

    expect(result.valid).toBe(false)
  })

  it('rejeita pagamento com ID duplicado', () => {
    const result = validateCardPayment(
      makePayment(),
      [card],
      [invoice],
      [makePayment()]
    )

    expect(result.valid).toBe(false)
  })

  it('rejeita valores negativos', () => {
    const result = validateCardPayment(
      makePayment({ amount: -10 }),
      [card],
      [invoice],
      []
    )

    expect(result.valid).toBe(false)
  })

  it('rejeita valores com mais de duas casas decimais', () => {
    const result = validateCardPayment(
      makePayment({ amount: 10.123 }),
      [card],
      [invoice],
      []
    )

    expect(result.valid).toBe(false)
  })

  it('rejeita datas inexistentes', () => {
    const result = validateCardPayment(
      makePayment({ date: '2026-02-30' }),
      [card],
      [invoice],
      []
    )

    expect(result.valid).toBe(false)
  })

  it('rejeita pagamento de cartão inexistente', () => {
    const result = validateCardPayment(
      makePayment({ cardId: 'outro-cartao' }),
      [card],
      [invoice],
      []
    )

    expect(result.valid).toBe(false)
  })
})
