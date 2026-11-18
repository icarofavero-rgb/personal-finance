/**
 * Notificações do sistema (fora do app) — somente no app Android.
 *
 * Agenda avisos para faturas e lembretes dos próximos dias. Sempre que
 * os dados mudam, os avisos pendentes deste app são cancelados e
 * reagendados. No navegador não faz nada (os avisos continuam no sininho).
 */

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

import { buildCalendarEvents, type CalendarSources } from './calendarEvents'
import type { NotificationPreferences } from './notificationPreferencesStorage'

const CHANNEL_ID = 'pf-avisos'
const LOOKAHEAD_DAYS = 45
const MAX_SCHEDULED = 60
const NOTIFY_HOUR = 9

export type ScheduledNotice = {
  id: number
  title: string
  body: string
  at: Date
}

/** Número inteiro positivo e estável a partir de um texto (id do aviso). */
export function stableNotificationId(text: string): number {
  let hash = 2166136261

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 1) || 1
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function atNine(day: string, offsetDays: number): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number)
  return new Date(year, month - 1, dayOfMonth + offsetDays, NOTIFY_HOUR, 0, 0)
}

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

/** Lista os avisos que devem ser agendados (função pura, testável). */
export function planSystemNotices(
  sources: CalendarSources,
  preferences: NotificationPreferences,
  now: Date
): ScheduledNotice[] {
  if (!preferences.enabled) return []

  const from = dateKey(now)
  const end = new Date(now)
  end.setDate(end.getDate() + LOOKAHEAD_DAYS)

  const events = buildCalendarEvents(sources, from, dateKey(end)).filter(event => {
    if (event.done) return false
    if (event.kind === 'invoice-due') return preferences.cardInvoices
    if (event.kind === 'reminder') return preferences.paymentReminders
    return false
  })

  const notices: ScheduledNotice[] = []

  for (const event of events) {
    const value = event.amountCents ? ` (${money(event.amountCents)})` : ''

    const before = atNine(event.date, -preferences.daysBeforeDue)
    const sameDay = atNine(event.date, 0)

    if (before > now) {
      notices.push({
        id: stableNotificationId(`${event.id}:antes`),
        title: event.kind === 'invoice-due' ? 'Fatura chegando' : 'Lembrete chegando',
        body:
          `${event.title}${value} vence em ${preferences.daysBeforeDue} ` +
          `${preferences.daysBeforeDue === 1 ? 'dia' : 'dias'}.`,
        at: before,
      })
    }

    if (sameDay > now) {
      notices.push({
        id: stableNotificationId(`${event.id}:dia`),
        title: event.kind === 'invoice-due' ? 'Fatura vence hoje' : 'Vence hoje',
        body: `${event.title}${value} vence hoje.`,
        at: sameDay,
      })
    }
  }

  return notices.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED)
}

let channelReady = false
let lastSignature = ''

/**
 * Reagenda os avisos do sistema. Seguro para chamar várias vezes:
 * não faz nada se nada mudou ou se não estiver no app Android.
 */
export async function syncSystemNotifications(
  sources: CalendarSources,
  preferences: NotificationPreferences
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const notices = planSystemNotices(sources, preferences, new Date())
  const signature = JSON.stringify(notices.map(item => [item.id, item.at.getTime(), item.body]))

  if (signature === lastSignature) return

  let permission = await LocalNotifications.checkPermissions()

  if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
    if (notices.length === 0) return
    permission = await LocalNotifications.requestPermissions()
  }

  if (permission.display !== 'granted') return

  if (!channelReady) {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Avisos financeiros',
      description: 'Faturas e lembretes de pagamento',
      importance: 4,
      visibility: 1,
    })
    channelReady = true
  }

  const pending = await LocalNotifications.getPending()

  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map(item => ({ id: item.id })),
    })
  }

  if (notices.length > 0) {
    await LocalNotifications.schedule({
      notifications: notices.map(item => ({
        id: item.id,
        title: item.title,
        body: item.body,
        channelId: CHANNEL_ID,
        schedule: { at: item.at, allowWhileIdle: true },
      })),
    })
  }

  lastSignature = signature
}
