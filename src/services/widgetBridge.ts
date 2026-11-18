/**
 * Envia o resumo do mês para o widget da tela inicial do Android.
 * No navegador não faz nada.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

import { isLockEnabled } from './appLock'

type WidgetData = {
  title: string
  label: string
  balance: string
  income: string
  expense: string
  accent: string
  negative: boolean
  locked: boolean
}

const WidgetBridge = registerPlugin<{ update(data: WidgetData): Promise<void> }>('WidgetBridge')

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

type Tx = { amount: number; type: 'income' | 'expense'; date: string }

/** Monta os textos do widget (função pura, testável). */
export function buildWidgetData(
  transactions: Tx[],
  today: Date,
  options: { profileName?: string; accent: string; locked: boolean }
): WidgetData {
  const month = today.toLocaleDateString('en-CA').slice(0, 7)
  let income = 0
  let expense = 0

  for (const item of transactions) {
    if (!item.date.startsWith(month)) continue
    if (item.type === 'income') income += item.amount
    else expense += item.amount
  }

  const balance = income - expense
  const monthName = MONTHS[today.getMonth()]

  return {
    title: options.profileName ? `${options.profileName} · ${monthName}` : `Personal Finance · ${monthName}`,
    label: 'Saldo do mês',
    balance: money(balance),
    income: `↑ ${money(income)}`,
    expense: `↓ ${money(expense)}`,
    accent: options.accent || '#8b5cf6',
    negative: balance < 0,
    locked: options.locked,
  }
}

export async function updateHomeWidget(transactions: Tx[], profileName?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--pf-accent').trim()
  await WidgetBridge.update(buildWidgetData(transactions, new Date(), { profileName, accent, locked: isLockEnabled() }))
}
