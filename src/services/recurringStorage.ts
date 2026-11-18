/**
 * Transações recorrentes: salário, aluguel, assinaturas...
 *
 * Cada regra diz "repetir todo mês, no dia X". Ao abrir o app, os meses
 * que já chegaram viram transações normais. O id é sempre o mesmo para
 * a mesma regra e o mesmo mês ("rec-<regra>-<AAAA-MM>"), então dois
 * aparelhos sincronizados nunca criam o lançamento em dobro.
 */

export type RecurringRule = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  /** dia do mês (1–31; em meses mais curtos usa o último dia) */
  dayOfMonth: number
  /** primeiro mês (AAAA-MM) */
  startMonth: string
  /** último mês já lançado (AAAA-MM) */
  generatedThrough?: string
  paused?: boolean
  createdAt: string
}

type Tx = { id: string; description: string; amount: number; type: 'income' | 'expense'; category: string; date: string }

export const RECURRING_KEY = 'personal-finance-recurring-v1'
export const RECURRING_CHANGED_EVENT = 'personal-finance-recurring-changed'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

function isRule(value: unknown): value is RecurringRule {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    typeof item.description === 'string' &&
    typeof item.amount === 'number' &&
    item.amount > 0 &&
    (item.type === 'income' || item.type === 'expense') &&
    typeof item.category === 'string' &&
    typeof item.dayOfMonth === 'number' &&
    item.dayOfMonth >= 1 &&
    item.dayOfMonth <= 31 &&
    typeof item.startMonth === 'string' &&
    MONTH.test(item.startMonth)
  )
}

export function getRecurringRules(): RecurringRule[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECURRING_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRule) : []
  } catch {
    return []
  }
}

export function saveRecurringRules(rules: RecurringRule[]): void {
  localStorage.setItem(RECURRING_KEY, JSON.stringify(rules))
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(RECURRING_CHANGED_EVENT))
  }
}

/** Cria a regra a partir de uma transação recém-lançada (que já conta como o 1º mês). */
export function createRuleFromTransaction(tx: Tx): RecurringRule {
  const month = tx.date.slice(0, 7)
  const rule: RecurringRule = {
    id: crypto.randomUUID(),
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    dayOfMonth: Number(tx.date.slice(8, 10)),
    startMonth: month,
    generatedThrough: month,
    createdAt: new Date().toISOString(),
  }

  saveRecurringRules([...getRecurringRules(), rule])
  return rule
}

export function updateRecurringRule(id: string, changes: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>): void {
  saveRecurringRules(getRecurringRules().map(rule => (rule.id === id ? { ...rule, ...changes } : rule)))
}

/** Para de repetir (os lançamentos já feitos continuam nas transações). */
export function deleteRecurringRule(id: string): void {
  saveRecurringRules(getRecurringRules().filter(rule => rule.id !== id))
}

function nextMonth(month: string): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function occurrenceDate(rule: Pick<RecurringRule, 'dayOfMonth'>, month: string): string {
  const [year, number] = month.split('-').map(Number)
  const lastDay = new Date(year, number, 0).getDate()
  return `${month}-${String(Math.min(rule.dayOfMonth, lastDay)).padStart(2, '0')}`
}

/** Próxima data em que a regra vai lançar. */
export function nextOccurrence(rule: RecurringRule): string {
  const month = rule.generatedThrough ? nextMonth(rule.generatedThrough) : rule.startMonth
  return occurrenceDate(rule, month)
}

/**
 * Calcula o que precisa ser lançado até hoje (função pura, testável).
 * Nunca cria duas vezes o mesmo mês; no máximo 24 meses atrasados.
 */
export function planRecurring(
  rules: RecurringRule[],
  existingIds: Set<string>,
  today: string
): { transactions: Tx[]; rules: RecurringRule[]; changed: boolean } {
  const transactions: Tx[] = []
  let changed = false

  const updated = rules.map(rule => {
    if (rule.paused) return rule

    let month = rule.generatedThrough ? nextMonth(rule.generatedThrough) : rule.startMonth
    let generatedThrough = rule.generatedThrough
    let guard = 0

    while (guard++ < 24) {
      const date = occurrenceDate(rule, month)
      if (date > today) break

      const id = `rec-${rule.id}-${month}`
      if (!existingIds.has(id)) {
        transactions.push({ id, description: rule.description, amount: rule.amount, type: rule.type, category: rule.category, date })
      }

      generatedThrough = month
      month = nextMonth(month)
    }

    if (generatedThrough !== rule.generatedThrough) {
      changed = true
      return { ...rule, generatedThrough }
    }

    return rule
  })

  return { transactions, rules: updated, changed }
}
