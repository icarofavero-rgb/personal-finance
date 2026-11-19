/**
 * "Saldo projetado para o mês seguinte".
 *
 * Parte do saldo do mês escolhido pelo que SAI DO BOLSO (as compras no
 * cartão entram pela fatura que vence no mês, e não de novo como compra)
 * e desconta tudo o que já está
 * previsto para o mês seguinte: faturas em aberto, boletos e lembretes a
 * pagar, outras despesas agendadas, recorrentes e previsões manuais.
 * As entradas previstas para o mês seguinte também entram.
 */

import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'
import type { ManualForecast } from './manualForecastStorage'
import type { Reminder } from './remindersStorage'
import { getReminderOccurrences } from './remindersStorage'
import type { RecurringRule } from './recurringStorage'
import { occurrenceDate } from './recurringStorage'
import { getCardInvoices } from './cardInvoices'
import type { SpendingEntry } from './spending'
import { isBoletoCategory } from './categories'
import { getCardInvoiceDueDate } from './cardInvoiceDueDate'

export type ProjectionItem = {
  kind: 'invoice' | 'boleto' | 'expense' | 'income'
  label: string
  amount: number
  date?: string
}

export type NextMonthProjection = {
  month: string
  /** saldo do mês escolhido: entradas − saídas fora do cartão − faturas que vencem nele */
  base: number
  invoices: number
  boletos: number
  otherExpenses: number
  incomes: number
  total: number
  items: ProjectionItem[]
}

export function nextMonthKey(month: string): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const cents = (value: number) => Math.round(value * 100)

export function buildNextMonthProjection(input: {
  month: string
  entries: SpendingEntry[]
  cards: CreditCard[]
  purchases: CardPurchase[]
  payments: CardPayment[]
  reminders: Reminder[]
  recurring: RecurringRule[]
  forecasts: ManualForecast[]
}): NextMonthProjection {
  const next = nextMonthKey(input.month)
  const items: ProjectionItem[] = []

  // Cada fatura entra no mês em que VENCE
  const cardInvoices = getCardInvoices(input.purchases, input.cards).map(invoice => {
    const card = input.cards.find(item => item.id === invoice.cardId)
    const dueDate = card ? getCardInvoiceDueDate(invoice.invoiceMonth, card.dueDay, card.closingDay) : `${invoice.invoiceMonth}-01`
    const paid = input.payments
      .filter(payment => payment.cardId === invoice.cardId && payment.invoiceMonth === invoice.invoiceMonth)
      .reduce((sum, payment) => sum + cents(payment.amount), 0)
    return { invoice, card, dueDate, paid }
  })

  // Saldo do mês escolhido: entradas − saídas fora do cartão − faturas
  // que vencem nele (as compras no cartão saem do bolso pela fatura;
  // contar a compra E a fatura descontaria o mesmo gasto duas vezes)
  let baseCents = 0
  for (const entry of input.entries) {
    if (entry.source === 'card' || !entry.date.startsWith(input.month)) continue
    baseCents += entry.type === 'income' ? cents(entry.amount) : -cents(entry.amount)
  }
  for (const item of cardInvoices) {
    if (item.dueDate.startsWith(input.month)) baseCents -= cents(item.invoice.total)
  }

  // Faturas que vencem no mês seguinte, no que ainda falta pagar
  for (const { invoice, card, dueDate, paid } of cardInvoices) {
    if (!dueDate.startsWith(next)) continue
    const pending = Math.max(0, cents(invoice.total) - paid)
    if (pending > 0) {
      items.push({
        kind: 'invoice',
        label: `Fatura ${card?.name ?? 'do cartão'}`,
        amount: pending / 100,
        date: dueDate,
      })
    }
  }

  // Transações já agendadas para o mês seguinte (fora do cartão: ele já está nas faturas)
  for (const entry of input.entries) {
    if (entry.source !== 'transaction' || !entry.date.startsWith(next)) continue
    items.push({
      kind: entry.type === 'income' ? 'income' : isBoletoCategory(entry.category) ? 'boleto' : 'expense',
      label: entry.description,
      amount: entry.amount,
      date: entry.date,
    })
  }

  // Lembretes do Calendário (boletos, contas) ainda não pagos
  const lastDay = new Date(Number(next.slice(0, 4)), Number(next.slice(5, 7)), 0).getDate()
  for (const occurrence of getReminderOccurrences(input.reminders, `${next}-01`, `${next}-${lastDay}`)) {
    if (occurrence.done || !occurrence.reminder.amountCents) continue
    items.push({
      kind: 'boleto',
      label: occurrence.reminder.title,
      amount: occurrence.reminder.amountCents / 100,
      date: occurrence.date,
    })
  }

  // Recorrentes que ainda vão ser lançadas no mês seguinte
  for (const rule of input.recurring) {
    if (rule.paused || rule.startMonth > next || (rule.generatedThrough && rule.generatedThrough >= next)) continue
    items.push({
      kind: rule.type === 'income' ? 'income' : 'expense',
      label: `${rule.description} (recorrente)`,
      amount: rule.amount,
      date: occurrenceDate(rule, next),
    })
  }

  // Previsões manuais
  for (const forecast of input.forecasts) {
    if (!forecast.date.startsWith(next)) continue
    items.push({ kind: forecast.type === 'income' ? 'income' : 'expense', label: forecast.description, amount: forecast.amount, date: forecast.date })
  }

  const sum = (kind: ProjectionItem['kind']) => items.filter(item => item.kind === kind).reduce((total, item) => total + cents(item.amount), 0)
  const invoices = sum('invoice')
  const boletos = sum('boleto')
  const otherExpenses = sum('expense')
  const incomes = sum('income')

  return {
    month: next,
    base: baseCents / 100,
    invoices: invoices / 100,
    boletos: boletos / 100,
    otherExpenses: otherExpenses / 100,
    incomes: incomes / 100,
    total: (baseCents + incomes - invoices - boletos - otherExpenses) / 100,
    items: items.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
  }
}
