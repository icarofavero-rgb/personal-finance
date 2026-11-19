/**
 * Eventos do Calendário: tudo que tem data e merece atenção.
 * Funções puras (não leem nem gravam o armazenamento).
 */

import type { CreditCard } from './cardsStorage'
import { isBoletoCategory } from './categories'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'
import type { ManualForecast } from './manualForecastStorage'
import type { DebtorDebt } from './debtors/debtorsTypes'
import type { FinancialNotification } from './notificationTypes'
import type { NotificationPreferences } from './notificationPreferencesStorage'
import { getCardInvoiceDueDate, getDaysUntilDue } from './cardInvoiceDueDate'
import { getCardInvoices } from './cardInvoices'
import {
  REMINDER_KIND_LABELS,
  getReminderOccurrences,
  monthlyOccurrence,
  type Reminder,
} from './remindersStorage'

export type CalendarEventKind =
  | 'invoice-due'
  | 'invoice-closing'
  | 'reminder'
  | 'forecast-income'
  | 'forecast-expense'
  | 'debt-due'
  | 'boleto'

export type CalendarEvent = {
  id: string
  date: string
  kind: CalendarEventKind
  title: string
  subtitle?: string
  amountCents?: number
  /** Concluído (fatura paga, lembrete marcado) */
  done: boolean
  reminderId?: string
}

export type CalendarSources = {
  cards: CreditCard[]
  purchases: CardPurchase[]
  payments: CardPayment[]
  reminders: Reminder[]
  forecasts: ManualForecast[]
  debts: DebtorDebt[]
  /** transações: só as da categoria Boletos entram no calendário */
  transactions?: { id: string; description: string; amount: number; type: string; category: string; date: string }[]
}

export function monthBounds(month: string): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

function paidCentsByInvoice(payments: CardPayment[]): Map<string, number> {
  const paid = new Map<string, number>()

  for (const payment of payments) {
    const key = `${payment.cardId}:${payment.invoiceMonth}`
    paid.set(key, (paid.get(key) ?? 0) + Math.round(payment.amount * 100))
  }

  return paid
}

/** Eventos entre duas datas (inclusive), em ordem cronológica. */
export function buildCalendarEvents(
  sources: CalendarSources,
  from: string,
  to: string
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const inRange = (date: string) => date >= from && date <= to

  // Faturas: vencimento (com valor pendente) e fechamento.
  const paid = paidCentsByInvoice(sources.payments)

  for (const invoice of getCardInvoices(sources.purchases, sources.cards)) {
    const card = sources.cards.find(item => item.id === invoice.cardId)
    if (!card) continue

    const dueDate = getCardInvoiceDueDate(invoice.invoiceMonth, card.dueDay, card.closingDay)
    if (!inRange(dueDate)) continue

    const totalCents = Math.round(invoice.total * 100)
    const pendingCents = Math.max(0, totalCents - (paid.get(`${card.id}:${invoice.invoiceMonth}`) ?? 0))

    events.push({
      id: `invoice-due:${card.id}:${invoice.invoiceMonth}`,
      date: dueDate,
      kind: 'invoice-due',
      title: `Fatura ${card.name}`,
      subtitle: pendingCents > 0 ? 'Vencimento da fatura' : 'Fatura paga',
      amountCents: pendingCents > 0 ? pendingCents : totalCents,
      done: pendingCents === 0,
    })
  }

  // Vencimento de TODOS os cartões, todo mês (mesmo sem compras na fatura)
  {
    const seen = new Set(events.map(event => event.id))
    let y = Number(from.slice(0, 4))
    let mo = Number(from.slice(5, 7)) - 1
    if (mo < 1) {
      mo = 12
      y--
    }

    while (`${y}-${String(mo).padStart(2, '0')}` <= to.slice(0, 7)) {
      const invoiceMonth = `${y}-${String(mo).padStart(2, '0')}`

      for (const card of sources.cards) {
        const id = `invoice-due:${card.id}:${invoiceMonth}`
        if (seen.has(id)) continue
        const dueDate = getCardInvoiceDueDate(invoiceMonth, card.dueDay, card.closingDay)
        if (!inRange(dueDate)) continue
        seen.add(id)
        events.push({
          id,
          date: dueDate,
          kind: 'invoice-due',
          title: `Fatura ${card.name}`,
          subtitle: 'Vencimento da fatura · sem compras',
          amountCents: 0,
          done: false,
        })
      }

      mo++
      if (mo > 12) {
        mo = 1
        y++
      }
    }
  }

  let year = Number(from.slice(0, 4))
  let month = Number(from.slice(5, 7))

  while (`${year}-${String(month).padStart(2, '0')}` <= to.slice(0, 7)) {
    for (const card of sources.cards) {
      const closing = monthlyOccurrence(`2000-01-${String(card.closingDay).padStart(2, '0')}`, year, month)

      if (inRange(closing)) {
        events.push({
          id: `invoice-closing:${card.id}:${closing}`,
          date: closing,
          kind: 'invoice-closing',
          title: `Fechamento ${card.name}`,
          subtitle: 'Compras depois deste dia vão para a próxima fatura',
          done: false,
        })
      }
    }

    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  // Lembretes (boletos, contas...)
  for (const occurrence of getReminderOccurrences(sources.reminders, from, to)) {
    events.push({
      id: `reminder:${occurrence.reminder.id}:${occurrence.date}`,
      date: occurrence.date,
      kind: 'reminder',
      title: occurrence.reminder.title,
      subtitle:
        REMINDER_KIND_LABELS[occurrence.reminder.kind] +
        (occurrence.reminder.recurrence === 'monthly' ? ' · todo mês' : ''),
      amountCents: occurrence.reminder.amountCents,
      done: occurrence.done,
      reminderId: occurrence.reminder.id,
    })
  }

  // Boletos (transações da categoria Boletos), no dia do pagamento
  for (const transaction of sources.transactions ?? []) {
    if (!inRange(transaction.date) || !isBoletoCategory(transaction.category)) continue

    events.push({
      id: `boleto:${transaction.id}`,
      date: transaction.date,
      kind: 'boleto',
      title: transaction.description,
      subtitle: 'Boleto · data de pagamento',
      amountCents: Math.round(transaction.amount * 100),
      done: false,
    })
  }

  // Previsões manuais
  for (const forecast of sources.forecasts) {
    if (!inRange(forecast.date)) continue

    events.push({
      id: `forecast:${forecast.id}`,
      date: forecast.date,
      kind: forecast.type === 'income' ? 'forecast-income' : 'forecast-expense',
      title: forecast.description,
      subtitle: forecast.type === 'income' ? 'Entrada prevista' : 'Saída prevista',
      amountCents: Math.round(forecast.amount * 100),
      done: false,
    })
  }

  // Dívidas de devedores com data de vencimento
  for (const debt of sources.debts) {
    if (!debt.dueDate || !inRange(debt.dueDate)) continue

    events.push({
      id: `debt:${debt.id}`,
      date: debt.dueDate,
      kind: 'debt-due',
      title: debt.description,
      subtitle: 'Valor a receber de devedor',
      amountCents: debt.amountCents,
      done: false,
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'pt-BR'))
}

/**
 * Avisos de lembretes para o sininho: lembretes não concluídos que
 * vencem dentro do prazo configurado, vencem hoje ou já venceram
 * (até 30 dias atrás).
 */
export function generateReminderNotifications(
  reminders: Reminder[],
  preferences: NotificationPreferences,
  today: string
): FinancialNotification[] {
  if (!preferences.enabled || !preferences.paymentReminders) return []

  const start = new Date(`${today}T12:00:00Z`)
  const shift = (days: number) => {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }

  const money = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

  return getReminderOccurrences(reminders, shift(-30), shift(preferences.daysBeforeDue))
    .filter(occurrence => !occurrence.done)
    .map(occurrence => {
      const days = getDaysUntilDue(occurrence.date, today)
      const { reminder } = occurrence
      const label = REMINDER_KIND_LABELS[reminder.kind].toLowerCase()
      const value = reminder.amountCents ? ` de ${money(reminder.amountCents)}` : ''

      let title: string
      let message: string
      let priority: FinancialNotification['priority']

      if (days < 0) {
        title = `${REMINDER_KIND_LABELS[reminder.kind]} atrasado`
        message = `“${reminder.title}”${value} venceu há ${-days} ${days === -1 ? 'dia' : 'dias'}.`
        priority = 'urgent'
      } else if (days === 0) {
        title = `${REMINDER_KIND_LABELS[reminder.kind]} vence hoje`
        message = `Hoje é o dia do ${label} “${reminder.title}”${value}.`
        priority = 'urgent'
      } else {
        title = `${REMINDER_KIND_LABELS[reminder.kind]} chegando`
        message = `“${reminder.title}”${value} vence em ${days} ${days === 1 ? 'dia' : 'dias'}.`
        priority = 'warning'
      }

      return {
        id: `reminder:${reminder.id}:${occurrence.date}`,
        type: 'payment-reminder' as const,
        title,
        message,
        priority,
        createdAt: today,
        dueDate: occurrence.date,
        referenceId: reminder.id,
        read: false,
      }
    })
}

/**
 * Avisos dos boletos lançados como transação (categoria Boletos): de hoje
 * até a antecedência escolhida nas preferências.
 */
export function generateBoletoNotifications(
  transactions: NonNullable<CalendarSources['transactions']>,
  preferences: NotificationPreferences,
  today: string
): FinancialNotification[] {
  if (!preferences.enabled || !preferences.paymentReminders) return []

  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return transactions
    .filter(transaction => isBoletoCategory(transaction.category))
    .map(transaction => ({ transaction, days: getDaysUntilDue(transaction.date, today) }))
    .filter(({ days }) => days >= 0 && days <= preferences.daysBeforeDue)
    .map(({ transaction, days }) => ({
      id: `boleto:${transaction.id}:${transaction.date}`,
      type: 'payment-reminder' as const,
      title: days === 0 ? 'Boleto vence hoje' : 'Boleto chegando',
      message:
        days === 0
          ? `Hoje é o dia de pagar “${transaction.description}” de ${money(transaction.amount)}.`
          : `“${transaction.description}” de ${money(transaction.amount)} vence em ${days} ${days === 1 ? 'dia' : 'dias'}.`,
      priority: days === 0 ? ('urgent' as const) : ('warning' as const),
      createdAt: today,
      dueDate: transaction.date,
      referenceId: transaction.id,
      read: false,
    }))
}
