
import {
  generateCardInvoiceNotifications,
} from './notificationEngine'
import { test, expect } from 'vitest'
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notificationPreferencesStorage'

const card: CreditCard = {
  id: 'test-card',
  name: 'Cartão de Teste',
  bank: 'Banco Teste',
  limit: 1000,
  closingDay: 10,
  dueDay: 20,
}

const purchase: CardPurchase = {
  id: 'test-purchase',
  cardId: 'test-card',
  description: 'Compra de teste',
  amount: 200,
  category: 'Outros',
  date: '2026-11-15', // depois do fechamento (dia 10): fatura de dezembro, vence 20/12
  installments: 1,
}

function assert(
  condition: boolean,
  message: string
) {
  if (!condition) {
    throw new Error(`Teste falhou: ${message}`)
  }
}

test('notificações de faturas: cinco cenários', () => {
  const cards = [card]
  const purchases = [purchase]
  const preferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    daysBeforeDue: 3,
  }

  function calculate(
    today: string,
    payments: CardPayment[] = []
  ) {
    return generateCardInvoiceNotifications(
      cards,
      purchases,
      payments,
      preferences,
      today
    )
  }

  // Vencimento esperado: 20/12/2026

  const upcoming = calculate('2026-12-17')
  assert(
    upcoming.length === 1 &&
      upcoming[0].priority === 'warning',
    'Aviso antecipado'
  )

  const today = calculate('2026-12-20')
  assert(
    today.length === 1 &&
      today[0].priority === 'urgent',
    'Vencimento hoje'
  )

  const overdue = calculate('2026-12-22')
  assert(
    overdue.length === 1 &&
      overdue[0].priority === 'urgent',
    'Fatura atrasada'
  )

  const partialPayment: CardPayment = {
    id: 'test-payment',
    cardId: 'test-card',
    invoiceMonth: '2026-12',
    amount: 50,
    date: '2026-12-15',
  }

  const partial = calculate(
    '2026-12-17',
    [partialPayment]
  )


assert(
  partial.length === 1 &&
    /R\$\s*150,00/u.test(partial[0].message),
  'Pagamento parcial'
)


  const fullPayment: CardPayment = {
    ...partialPayment,
    amount: 200,
  }

  const paid = calculate(
    '2026-12-17',
    [fullPayment]
  )

  assert(
    paid.length === 0,
    'Fatura quitada'
  )

expect(true).toBe(true)
})

test('respeita as preferências de notificações', () => {
  const cards = [card]
  const purchases = [purchase]

  const preferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    enabled: true,
    cardInvoices: true,
    daysBeforeDue: 3,
  }

  const generate = (
    today: string,
    overrides: Partial<typeof preferences> = {}
  ) =>
    generateCardInvoiceNotifications(
      cards,
      purchases,
      [],
      { ...preferences, ...overrides },
      today
    )

  // Notificações gerais desativadas
  expect(
    generate('2026-12-17', { enabled: false })
  ).toHaveLength(0)

  // Avisos de cartão desativados
  expect(
    generate('2026-12-17', { cardInvoices: false })
  ).toHaveLength(0)

  // Fora da janela de três dias
  expect(
    generate('2026-12-16')
  ).toHaveLength(0)

  // Dentro da janela de três dias
  expect(
    generate('2026-12-17')
  ).toHaveLength(1)

  // Prazo configurado para cinco dias
  expect(
    generate('2026-12-16', { daysBeforeDue: 5 })
  ).toHaveLength(1)

  // Fatura vencida: prioridade urgente
  const overdue = generate('2026-12-22')

  expect(overdue).toHaveLength(1)
  expect(overdue[0].priority).toBe('urgent')
})
