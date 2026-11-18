/**
 * Comparativos automáticos do mês ("Destaques"): frases curtas que
 * comparam o mês escolhido com o anterior.
 *
 * No mês atual a comparação é justa: compara até o mesmo dia do mês
 * passado (dia 18 com dia 18), e não com o mês passado inteiro.
 */

import { getMainCategory } from './categories'

type Tx = { amount: number; type: 'income' | 'expense'; category: string; date: string }

export type Insight = {
  id: string
  tone: 'good' | 'bad' | 'neutral'
  icon: string
  title: string
  detail: string
}

function previousMonth(month: string): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)

const percent = (value: number) => `${Math.round(Math.abs(value) * 100)}%`

function totals(list: Tx[]) {
  const byCategory = new Map<string, { name: string; icon: string; value: number }>()
  let income = 0
  let expense = 0

  for (const item of list) {
    if (item.type === 'income') {
      income += item.amount
      continue
    }

    expense += item.amount
    const group = getMainCategory(item.category)
    const current = byCategory.get(group.name) ?? { name: group.name, icon: group.icon, value: 0 }
    current.value += item.amount
    byCategory.set(group.name, current)
  }

  return { income, expense, byCategory }
}

export function buildMonthInsights(transactions: Tx[], month: string, today = new Date()): Insight[] {
  const todayKey = today.toLocaleDateString('en-CA')
  const isCurrent = todayKey.startsWith(month)
  const limitDay = isCurrent ? Number(todayKey.slice(8, 10)) : 31
  const before = previousMonth(month)
  const previousName = MONTHS[Number(before.slice(5, 7)) - 1]
  const period = isCurrent ? `até o dia ${limitDay}` : ''

  const inPeriod = (prefix: string) =>
    transactions.filter(item => item.date.startsWith(prefix) && Number(item.date.slice(8, 10)) <= limitDay)

  const now = totals(inPeriod(month))
  const then = totals(inPeriod(before))
  const insights: Insight[] = []

  // 1. Total de saídas comparado ao mês anterior
  if (now.expense > 0 && then.expense > 0) {
    const change = (now.expense - then.expense) / then.expense

    if (Math.abs(change) >= 0.05) {
      insights.push({
        id: 'total',
        tone: change < 0 ? 'good' : 'bad',
        icon: change < 0 ? 'trending-down' : 'trending-up',
        title: `Você gastou ${percent(change)} ${change < 0 ? 'menos' : 'mais'} que em ${previousName}`,
        detail: `${money(now.expense)} contra ${money(then.expense)}${period ? ` (${period})` : ''}.`,
      })
    } else {
      insights.push({
        id: 'total',
        tone: 'neutral',
        icon: 'equal',
        title: `Seus gastos estão parecidos com ${previousName}`,
        detail: `${money(now.expense)} contra ${money(then.expense)}${period ? ` (${period})` : ''}.`,
      })
    }
  }

  // 2. Categoria que mais subiu e a que mais caiu (diferença em reais)
  const changes = [...new Set([...now.byCategory.keys(), ...then.byCategory.keys()])]
    .map(name => {
      const current = now.byCategory.get(name)
      const past = then.byCategory.get(name)
      return {
        name,
        icon: current?.icon ?? past?.icon ?? 'ellipsis',
        now: current?.value ?? 0,
        then: past?.value ?? 0,
        diff: (current?.value ?? 0) - (past?.value ?? 0),
      }
    })
    .filter(item => item.then > 0 && Math.abs(item.diff) >= 20 && Math.abs(item.diff / item.then) >= 0.15)
    .sort((a, b) => b.diff - a.diff)

  const up = changes[0]
  if (up && up.diff > 0) {
    insights.push({
      id: 'up',
      tone: 'bad',
      icon: up.icon,
      title: `${up.name}: ${percent(up.diff / up.then)} a mais`,
      detail: `${money(up.diff)} acima de ${previousName} (${money(up.now)} contra ${money(up.then)}).`,
    })
  }

  const down = changes[changes.length - 1]
  if (down && down.diff < 0) {
    insights.push({
      id: 'down',
      tone: 'good',
      icon: down.icon,
      title: `${down.name}: ${percent(down.diff / down.then)} a menos`,
      detail: `Economia de ${money(-down.diff)} em relação a ${previousName}.`,
    })
  }

  // 3. Quanto sobrou das entradas
  if (now.income > 0) {
    const left = now.income - now.expense
    insights.push(
      left >= 0
        ? {
            id: 'left',
            tone: 'good',
            icon: 'piggy-bank',
            title: `Sobrou ${percent(left / now.income)} das suas entradas`,
            detail: `${money(left)} de ${money(now.income)} recebidos.`,
          }
        : {
            id: 'left',
            tone: 'bad',
            icon: 'triangle-alert',
            title: 'As saídas passaram as entradas',
            detail: `${money(-left)} a mais do que você recebeu no mês.`,
          }
    )
  }

  // 4. Onde vai a maior parte do dinheiro
  const biggest = [...now.byCategory.values()].sort((a, b) => b.value - a.value)[0]
  if (biggest && now.expense > 0 && now.byCategory.size > 1) {
    insights.push({
      id: 'biggest',
      tone: 'neutral',
      icon: biggest.icon,
      title: `${biggest.name} é ${percent(biggest.value / now.expense)} das suas saídas`,
      detail: `${money(biggest.value)} de ${money(now.expense)} no mês.`,
    })
  }

  return insights.slice(0, 4)
}
