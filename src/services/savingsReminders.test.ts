import { beforeEach, describe, expect, it } from 'vitest'

import {
  addSavingsMovement,
  calculateLeftoverSuggestionCents,
  calculateSavingsBalanceCents,
  deleteSavingsMovement,
  getSavingsMovements,
  summarizeSavingsByMonth,
  validateSavingsData,
} from './savingsStorage'
import {
  addReminder,
  getReminderOccurrences,
  getReminders,
  toggleReminderDone,
  type Reminder,
} from './remindersStorage'
import { buildCalendarEvents, generateReminderNotifications } from './calendarEvents'
import { planProfilesNotices, planSystemNotices, stableNotificationId } from './systemNotifications'
import type { Transaction } from './storage'
import { DEFAULT_NOTIFICATION_PREFERENCES } from './notificationPreferencesStorage'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
  },
})

beforeEach(() => memory.clear())

const tx = (id: string, type: 'income' | 'expense', amount: number, date: string): Transaction => ({
  id,
  description: id,
  amount,
  type,
  category: 'Outros',
  date,
})

describe('Guardado', () => {
  it('soma depósitos e subtrai retiradas', () => {
    addSavingsMovement({ type: 'deposit', source: 'manual', amountCents: 50_000, date: '2026-11-01' })
    addSavingsMovement({ type: 'withdrawal', source: 'manual', amountCents: 12_000, date: '2026-11-10' })

    expect(calculateSavingsBalanceCents(getSavingsMovements())).toBe(38_000)
  })

  it('não permite retirar mais do que está guardado', () => {
    addSavingsMovement({ type: 'deposit', source: 'manual', amountCents: 10_000, date: '2026-11-01' })

    expect(() =>
      addSavingsMovement({ type: 'withdrawal', source: 'manual', amountCents: 10_001, date: '2026-11-02' })
    ).toThrow(/maior do que o valor guardado/)

    expect(getSavingsMovements()).toHaveLength(1)
  })

  it('não permite excluir um depósito do qual uma retirada depende', () => {
    const deposit = addSavingsMovement({ type: 'deposit', source: 'manual', amountCents: 10_000, date: '2026-11-01' })
    addSavingsMovement({ type: 'withdrawal', source: 'manual', amountCents: 5_000, date: '2026-11-02' })

    expect(() => deleteSavingsMovement(deposit.id)).toThrow(/retiradas que dependem/)
    expect(getSavingsMovements()).toHaveLength(2)
  })

  it('sugere guardar a sobra do mês, descontando o que já foi guardado dela', () => {
    const transactions = [
      tx('salario', 'income', 5000, '2026-11-05'),
      tx('aluguel', 'expense', 1500, '2026-11-08'),
      tx('outro-mes', 'income', 999, '2026-10-05'),
    ]

    expect(calculateLeftoverSuggestionCents(transactions, [], '2026-11')).toBe(350_000)

    const saved = addSavingsMovement({
      type: 'deposit',
      source: 'leftover',
      month: '2026-11',
      amountCents: 100_000,
      date: '2026-11-30',
    })

    expect(calculateLeftoverSuggestionCents(transactions, [saved], '2026-11')).toBe(250_000)
  })

  it('não sugere sobra quando o mês fechou no negativo', () => {
    const transactions = [tx('gasto', 'expense', 200, '2026-11-05')]
    expect(calculateLeftoverSuggestionCents(transactions, [], '2026-11')).toBe(0)
  })

  it('resume os últimos meses com saldo acumulado', () => {
    addSavingsMovement({ type: 'deposit', source: 'manual', amountCents: 1_000, date: '2026-09-10' })
    addSavingsMovement({ type: 'deposit', source: 'manual', amountCents: 2_000, date: '2026-11-10' })

    const summary = summarizeSavingsByMonth(getSavingsMovements(), '2026-11', 3)

    expect(summary.map(item => [item.month, item.depositedCents, item.balanceCents])).toEqual([
      ['2026-09', 1_000, 1_000],
      ['2026-10', 0, 1_000],
      ['2026-11', 2_000, 3_000],
    ])
  })

  it('rejeita dados inválidos (usado pelo backup)', () => {
    expect(() => validateSavingsData([{ id: 'x', amountCents: -5 }])).toThrow()
    expect(() =>
      validateSavingsData([
        { id: 'a', type: 'deposit', source: 'leftover', amountCents: 10, date: '2026-11-01', createdAt: '2026-11-01T00:00:00Z' },
      ])
    ).toThrow() // sobra sem mês de referência
  })
})

describe('Lembretes do Calendário', () => {
  const base = (overrides: Partial<Reminder> = {}): Reminder => ({
    id: 'r1',
    title: 'Internet',
    kind: 'boleto',
    date: '2026-01-31',
    recurrence: 'monthly',
    doneDates: [],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  })

  it('repete todo mês e ajusta o dia 31 para o fim de meses curtos', () => {
    const dates = getReminderOccurrences([base()], '2026-01-01', '2026-04-30').map(item => item.date)
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('não cria ocorrências antes da data inicial', () => {
    const dates = getReminderOccurrences([base({ date: '2026-03-10' })], '2026-01-01', '2026-04-30').map(
      item => item.date
    )
    expect(dates).toEqual(['2026-03-10', '2026-04-10'])
  })

  it('marca uma ocorrência como feita sem afetar as outras', () => {
    const reminder = addReminder({ title: 'Luz', kind: 'conta', date: '2026-11-10', recurrence: 'monthly' })

    toggleReminderDone(reminder.id, '2026-11-10')

    const occurrences = getReminderOccurrences(getReminders(), '2026-11-01', '2026-12-31')
    expect(occurrences.map(item => [item.date, item.done])).toEqual([
      ['2026-11-10', true],
      ['2026-12-10', false],
    ])
  })

  it('gera avisos no sininho conforme o prazo configurado', () => {
    const reminders = [
      base({ id: 'hoje', title: 'Boleto escola', date: '2026-11-17', recurrence: 'none', amountCents: 45_000 }),
      base({ id: 'longe', title: 'IPVA', date: '2026-12-30', recurrence: 'none' }),
      base({ id: 'feito', title: 'Água', date: '2026-11-16', recurrence: 'none', doneDates: ['2026-11-16'] }),
    ]

    const notices = generateReminderNotifications(reminders, DEFAULT_NOTIFICATION_PREFERENCES, '2026-11-17')

    expect(notices).toHaveLength(1)
    expect(notices[0].title).toBe('Boleto vence hoje')
    expect(notices[0].message).toMatch(/R\$\s450,00/)
    expect(notices[0].priority).toBe('urgent')
  })
})

describe('Eventos do Calendário', () => {
  const card = { id: 'c1', name: 'Nubank', bank: 'Nu', limit: 3000, closingDay: 5, dueDay: 12 }
  const purchase = {
    id: 'p1',
    cardId: 'c1',
    description: 'Fone',
    amount: 300,
    category: 'Outros',
    date: '2026-10-20',
    installments: 1,
  }

  it('mostra vencimento e fechamento das faturas', () => {
    const events = buildCalendarEvents(
      { cards: [card], purchases: [purchase], payments: [], reminders: [], forecasts: [], debts: [] },
      '2026-11-01',
      '2026-12-31'
    )

    const kinds = events.map(item => [item.kind, item.date])
    expect(kinds).toContainEqual(['invoice-closing', '2026-11-05'])
    expect(kinds).toContainEqual(['invoice-closing', '2026-12-05'])

    // Compra de 20/10 (depois do fechamento do dia 5) vence no dia 12 de algum mês seguinte.
    // A fatura com compras (os outros meses aparecem como vencimento sem compras)
    const due = events.filter(item => item.kind === 'invoice-due' && (item.amountCents ?? 0) > 0)
    expect(due).toHaveLength(1)
    expect(due[0].date.endsWith('-12')).toBe(true)
    expect(due[0].amountCents).toBe(30_000)
    expect(due[0].done).toBe(false)
  })

  it('mostra o vencimento de TODOS os cartões, mesmo sem compras', () => {
    const cards = [card, { ...card, id: 'c2', name: 'Inter', dueDay: 15 }, { ...card, id: 'c3', name: 'Itaú', dueDay: 20 }]
    const events = buildCalendarEvents(
      { cards, purchases: [purchase], payments: [], reminders: [], forecasts: [], debts: [] },
      '2026-11-01',
      '2026-11-30'
    )
    const due = events.filter(item => item.kind === 'invoice-due').map(item => item.title).sort()
    expect(due).toEqual(['Fatura Inter', 'Fatura Itaú', 'Fatura ' + card.name].sort())
  })

  it('boletos (categoria Boletos) entram no dia do pagamento; outras transações não', () => {
    const events = buildCalendarEvents(
      {
        cards: [], purchases: [], payments: [], reminders: [], forecasts: [], debts: [],
        transactions: [
          { id: 'b1', description: 'Conta de luz', amount: 120, type: 'expense', category: 'Boletos / Boleto', date: '2026-11-20' },
          { id: 'x1', description: 'Mercado', amount: 50, type: 'expense', category: 'Alimentação / Supermercado', date: '2026-11-20' },
        ],
      },
      '2026-11-01',
      '2026-11-30'
    )
    expect(events.map(item => [item.kind, item.title, item.date])).toEqual([['boleto', 'Conta de luz', '2026-11-20']])
  })

  it('marca a fatura como concluída quando está paga', () => {
    const sources = { cards: [card], purchases: [purchase], payments: [], reminders: [], forecasts: [], debts: [] }
    const [due] = buildCalendarEvents(sources, '2026-11-01', '2026-12-31').filter(
      item => item.kind === 'invoice-due' && (item.amountCents ?? 0) > 0
    )
    const invoiceMonth = due.id.split(':')[2]

    const paidEvents = buildCalendarEvents(
      {
        ...sources,
        payments: [{ id: 'pay', cardId: 'c1', invoiceMonth, amount: 300, date: '2026-11-10' }],
      },
      '2026-11-01',
      '2026-12-31'
    )

    expect(paidEvents.find(item => item.id === due.id)?.done).toBe(true)
  })
})

describe('Notificações do sistema (Android)', () => {
  it('gera identificadores numéricos estáveis', () => {
    expect(stableNotificationId('abc')).toBe(stableNotificationId('abc'))
    expect(stableNotificationId('abc')).not.toBe(stableNotificationId('abd'))
    expect(stableNotificationId('qualquer')).toBeGreaterThan(0)
  })

  it('agenda aviso antes e no dia, sem horários no passado', () => {
    const reminder: Reminder = {
      id: 'r',
      title: 'Condomínio',
      kind: 'boleto',
      date: '2026-11-20',
      recurrence: 'none',
      doneDates: [],
      createdAt: '2026-11-01T00:00:00Z',
    }

    const notices = planSystemNotices(
      { cards: [], purchases: [], payments: [], reminders: [reminder], forecasts: [], debts: [] },
      { ...DEFAULT_NOTIFICATION_PREFERENCES, daysBeforeDue: 3 },
      new Date(2026, 10, 17, 10, 0) // 17/11 às 10h: o aviso "3 dias antes" (17/11 9h) já passou
    )

    expect(notices.map(item => item.title)).toEqual(['Vence hoje'])
    expect(notices[0].at.getDate()).toBe(20)
    expect(notices[0].at.getHours()).toBe(9)
  })

  it('não agenda nada com as notificações desligadas', () => {
    const notices = planSystemNotices(
      { cards: [], purchases: [], payments: [], reminders: [], forecasts: [], debts: [] },
      { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false },
      new Date()
    )

    expect(notices).toEqual([])
  })
})

describe('avisos do celular com vários perfis', () => {
  const reminder = (id: string, title: string): Reminder => ({
    id,
    title,
    kind: 'conta',
    date: '2026-11-20',
    recurrence: 'none',
    doneDates: [],
    createdAt: '2026-11-01T00:00:00Z',
  })
  const empty = { cards: [], purchases: [], payments: [], forecasts: [], debts: [] }

  it('junta os avisos de todos os perfis, com o nome do perfil no texto', () => {
    const notices = planProfilesNotices(
      [
        { label: 'Principal', sources: { ...empty, reminders: [reminder('a', 'Luz')] } },
        { label: 'Trabalho', sources: { ...empty, reminders: [reminder('a', 'Aluguel da sala')] } },
      ],
      { ...DEFAULT_NOTIFICATION_PREFERENCES, daysBeforeDue: 1 },
      new Date(2026, 10, 18, 10, 0)
    )

    expect(notices.map(item => item.body)).toEqual(
      expect.arrayContaining(['Principal · Luz vence hoje.', 'Trabalho · Aluguel da sala vence hoje.'])
    )
    // Mesmo id de lembrete em perfis diferentes não pode virar o mesmo aviso
    expect(new Set(notices.map(item => item.id)).size).toBe(notices.length)
  })

  it('com um perfil só, o texto fica como antes', () => {
    const notices = planProfilesNotices(
      [{ label: '', sources: { ...empty, reminders: [reminder('a', 'Luz')] } }],
      { ...DEFAULT_NOTIFICATION_PREFERENCES, daysBeforeDue: 1 },
      new Date(2026, 10, 18, 10, 0)
    )

    expect(notices.map(item => item.body)).toContain('Luz vence hoje.')
  })
})
