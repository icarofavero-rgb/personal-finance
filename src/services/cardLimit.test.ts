import { describe, expect, it } from 'vitest'

import {
  calculateCardAvailableLimitCents,
  calculateCardDashboard,
  calculateCardUsedLimitCents,
} from './cardDashboard'
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'

const card: CreditCard = {
  id: 'card-1',
  name: 'Cartão teste',
  bank: 'Banco',
  limit: 1000,
  closingDay: 5,
  dueDay: 12,
}

const today = new Date(2026, 10, 17) // 17/11/2026

function purchase(
  amount: number,
  date = '2026-11-01',
  cardId = card.id
): CardPurchase {
  return {
    id: `p-${amount}-${date}-${cardId}`,
    cardId,
    description: 'Compra',
    amount,
    category: 'Outros',
    date,
    installments: 1,
  }
}

function payment(
  amount: number,
  date = '2026-11-10',
  cardId = card.id
): CardPayment {
  return {
    id: `pay-${amount}-${date}`,
    cardId,
    invoiceMonth: '2026-11',
    amount,
    date,
  }
}

describe('limite do cartão', () => {
  it('pagamentos de fatura liberam limite', () => {
    const purchases = [purchase(800)]
    const payments = [payment(800)]

    expect(
      calculateCardUsedLimitCents(card.id, purchases, payments, today)
    ).toBe(0)

    expect(
      calculateCardAvailableLimitCents(card, purchases, payments, today)
    ).toBe(100_000)
  })

  it('pagamentos agendados para o futuro ainda não liberam limite', () => {
    const used = calculateCardUsedLimitCents(
      card.id,
      [purchase(800)],
      [payment(800, '2026-12-01')],
      today
    )

    expect(used).toBe(80_000)
  })

  it('compras com data futura também consomem limite', () => {
    const used = calculateCardUsedLimitCents(
      card.id,
      [purchase(300, '2026-12-20')],
      [],
      today
    )

    expect(used).toBe(30_000)
  })

  it('ignora compras e pagamentos de outros cartões', () => {
    const used = calculateCardUsedLimitCents(
      card.id,
      [purchase(500), purchase(200, '2026-11-01', 'outro')],
      [payment(100, '2026-11-10', 'outro')],
      today
    )

    expect(used).toBe(50_000)
  })

  it('nunca fica negativo nem passa do limite disponível', () => {
    expect(
      calculateCardUsedLimitCents(card.id, [purchase(100)], [payment(500)], today)
    ).toBe(0)

    expect(
      calculateCardAvailableLimitCents(card, [purchase(1500)], [], today)
    ).toBe(0)
  })

  it('o Dashboard usa o mesmo cálculo', () => {
    const purchases = [purchase(800)]
    const payments = [payment(300)]

    const dashboard = calculateCardDashboard(card, purchases, payments, today)

    expect(dashboard.usedLimit).toBe(500)
    expect(dashboard.availableLimit).toBe(500)
  })
})
