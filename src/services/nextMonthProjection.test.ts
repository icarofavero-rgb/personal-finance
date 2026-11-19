import { describe, expect, it } from 'vitest'

import { buildNextMonthProjection } from './nextMonthProjection'
import { buildSpendingEntries } from './spending'
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { Transaction } from './storage'

const card: CreditCard = { id: 'c1', name: 'Cartão', bank: 'B', limit: 5000, closingDay: 10, dueDay: 15 }

function project(transactions: Transaction[], purchases: CardPurchase[], payments = []) {
  return buildNextMonthProjection({
    month: '2026-11',
    entries: buildSpendingEntries(transactions, purchases, payments, [card]),
    cards: [card],
    purchases,
    payments,
    reminders: [],
    recurring: [],
    forecasts: [],
  })
}

describe('saldo projetado para o mês seguinte', () => {
  it('uma compra no cartão é descontada uma vez só (pela fatura)', () => {
    const salary: Transaction = { id: 't1', description: 'Salário', amount: 3000, type: 'income', category: 'Renda', date: '2026-11-05' }
    // Compra em 18/11, depois do fechamento (dia 10): fatura de dezembro, vence 15/12
    const purchase: CardPurchase = { id: 'p1', cardId: 'c1', description: 'Tênis', amount: 300, category: 'Outros', date: '2026-11-18', installments: 1 }

    const result = project([salary], [purchase])

    expect(result.base).toBe(3000) // novembro: só o salário (a fatura vence em dezembro)
    expect(result.invoices).toBe(300) // dezembro: a fatura
    expect(result.total).toBe(2700) // e não 2400 (contando a compra duas vezes)
  })

  it('a fatura que vence no mês escolhido sai do saldo dele', () => {
    // Compra em 05/11, antes do fechamento: fatura de novembro, vence 15/11
    const purchase: CardPurchase = { id: 'p1', cardId: 'c1', description: 'Mercado', amount: 90, category: 'Outros', date: '2026-11-05', installments: 1 }

    const result = project([], [purchase])

    expect(result.base).toBe(-90)
    expect(result.invoices).toBe(0)
    expect(result.total).toBe(-90)
  })

  it('compra parcelada: cada fatura no mês em que vence', () => {
    const purchase: CardPurchase = { id: 'p1', cardId: 'c1', description: 'Celular', amount: 600, category: 'Outros', date: '2026-10-05', installments: 3 }

    const result = project([], [purchase])

    // out (vence 15/10), nov (vence 15/11), dez (vence 15/12)
    expect(result.base).toBe(-200)
    expect(result.invoices).toBe(200)
    expect(result.items.find(item => item.kind === 'invoice')?.date).toBe('2026-12-15')
  })
})
