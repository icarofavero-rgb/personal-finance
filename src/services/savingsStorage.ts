/**
 * Guardado: dinheiro reservado pelo usuário.
 *
 * Cada movimentação é um depósito ou uma retirada. Depósitos podem vir
 * da "sobra do mês" (o que restou de entradas - saídas de um mês) ou de
 * um valor avulso, a qualquer momento. Valores sempre em centavos.
 */

import type { Transaction } from './storage'

export type SavingsSource = 'leftover' | 'manual'

export type SavingsMovement = {
  id: string
  type: 'deposit' | 'withdrawal'
  /** Origem do depósito (retiradas usam 'manual') */
  source: SavingsSource
  amountCents: number
  date: string
  /** Mês de referência da sobra (AAAA-MM), só para depósitos de sobra */
  month?: string
  note?: string
  createdAt: string
}

const STORAGE_KEY = 'personal-finance-savings-v1'
const DATE_RX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const MONTH_RX = /^\d{4}-(0[1-9]|1[0-2])$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RX.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

function isValidMovement(value: unknown): value is SavingsMovement {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    (value.type === 'deposit' || value.type === 'withdrawal') &&
    (value.source === 'leftover' || value.source === 'manual') &&
    typeof value.amountCents === 'number' &&
    Number.isSafeInteger(value.amountCents) &&
    value.amountCents > 0 &&
    isValidDate(value.date) &&
    (value.month === undefined || (typeof value.month === 'string' && MONTH_RX.test(value.month))) &&
    (value.note === undefined || (typeof value.note === 'string' && value.note.length <= 200)) &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    // Sobra do mês só existe em depósitos e sempre informa o mês.
    (value.source !== 'leftover' || (value.type === 'deposit' && value.month !== undefined))
  )
}

/** Ordem cronológica (data, depois momento do cadastro). */
function chronological(a: SavingsMovement, b: SavingsMovement): number {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
}

/** Saldo nunca pode ficar negativo em nenhum momento da história. */
function assertNeverNegative(movements: SavingsMovement[]): void {
  let balance = 0

  for (const movement of [...movements].sort(chronological)) {
    balance += movement.type === 'deposit' ? movement.amountCents : -movement.amountCents

    if (balance < 0) {
      throw new Error('O valor retirado é maior do que o valor guardado naquela data.')
    }
  }
}

/** Valida uma lista de movimentações (usado também pelo backup). */
export function validateSavingsData(data: unknown): SavingsMovement[] {
  if (!Array.isArray(data) || !data.every(isValidMovement)) {
    throw new Error('Os dados do Guardado são inválidos.')
  }

  const ids = data.map(item => item.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error('O Guardado contém movimentações duplicadas.')
  }

  assertNeverNegative(data)

  return data
}

export function getSavingsMovements(): SavingsMovement[] {
  const saved = localStorage.getItem(STORAGE_KEY)

  if (saved === null) return []

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Não foi possível ler o Guardado. Os dados originais foram preservados.')
  }

  return validateSavingsData(parsed)
}

function saveSavingsMovements(movements: SavingsMovement[]): void {
  validateSavingsData(movements)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movements))
}

export type NewSavingsMovement = Omit<SavingsMovement, 'id' | 'createdAt'>

export function addSavingsMovement(input: NewSavingsMovement): SavingsMovement {
  const movement: SavingsMovement = {
    ...input,
    note: input.note?.trim() || undefined,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  if (!isValidMovement(movement)) {
    throw new Error('Confira o valor e a data informados.')
  }

  saveSavingsMovements([...getSavingsMovements(), movement])

  return movement
}

export function deleteSavingsMovement(id: string): void {
  const movements = getSavingsMovements()
  const next = movements.filter(item => item.id !== id)

  if (next.length === movements.length) {
    throw new Error('Movimentação não encontrada.')
  }

  try {
    saveSavingsMovements(next)
  } catch {
    throw new Error(
      'Não é possível excluir este depósito: há retiradas que dependem dele.'
    )
  }
}

// ---------- Cálculos ----------

export function calculateSavingsBalanceCents(movements: SavingsMovement[]): number {
  return movements.reduce(
    (sum, item) => sum + (item.type === 'deposit' ? item.amountCents : -item.amountCents),
    0
  )
}

/** Resultado do mês (entradas - saídas) em centavos. */
export function calculateMonthResultCents(transactions: Transaction[], month: string): number {
  return transactions
    .filter(item => item.date.startsWith(`${month}-`))
    .reduce(
      (sum, item) =>
        sum + (item.type === 'income' ? 1 : -1) * Math.round(item.amount * 100),
      0
    )
}

/**
 * Quanto ainda dá para guardar da sobra de um mês:
 * resultado do mês menos o que já foi guardado como sobra daquele mês.
 */
export function calculateLeftoverSuggestionCents(
  transactions: Transaction[],
  movements: SavingsMovement[],
  month: string
): number {
  const result = calculateMonthResultCents(transactions, month)

  const alreadySaved = movements
    .filter(item => item.type === 'deposit' && item.source === 'leftover' && item.month === month)
    .reduce((sum, item) => sum + item.amountCents, 0)

  return Math.max(0, result - alreadySaved)
}

export type SavingsMonthSummary = {
  month: string
  depositedCents: number
  withdrawnCents: number
  /** Saldo acumulado ao final do mês */
  balanceCents: number
}

/** Resumo dos últimos `count` meses terminando em `endMonth`. */
export function summarizeSavingsByMonth(
  movements: SavingsMovement[],
  endMonth: string,
  count = 6
): SavingsMonthSummary[] {
  const [year, month] = endMonth.split('-').map(Number)

  const months = Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - count + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })

  return months.map(key => {
    const inMonth = movements.filter(item => item.date.startsWith(`${key}-`))
    const untilEnd = movements.filter(item => item.date.slice(0, 7) <= key)

    return {
      month: key,
      depositedCents: inMonth
        .filter(item => item.type === 'deposit')
        .reduce((sum, item) => sum + item.amountCents, 0),
      withdrawnCents: inMonth
        .filter(item => item.type === 'withdrawal')
        .reduce((sum, item) => sum + item.amountCents, 0),
      balanceCents: calculateSavingsBalanceCents(untilEnd),
    }
  })
}
