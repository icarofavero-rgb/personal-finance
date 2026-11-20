/**
 * Parcelas de uma dívida (Devedores): qual é a parcela do mês, quanto vale
 * e se já foi paga.
 *
 * - A 1ª parcela vence no mês do vencimento informado (ou da data da
 *   dívida) e as seguintes, uma por mês, no mesmo dia.
 * - O valor é dividido em partes iguais; os centavos que sobram vão para
 *   as primeiras parcelas (igual ao cartão).
 * - Os pagamentos quitam as parcelas em ordem: o que foi pago cobre a 1ª,
 *   depois a 2ª, e assim por diante.
 */

import type { DebtorDebt, DebtorPayment } from './debtorsTypes'

export type InstallmentStatus = 'paid' | 'partial' | 'open'

export type MonthInstallment = {
  number: number
  total: number
  amountCents: number
  /** quanto falta desta parcela */
  remainingCents: number
  dueDate: string
  status: InstallmentStatus
  /** parcelas de meses anteriores ainda não pagas (em centavos) */
  overdueCents: number
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(month: string, count: number): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number - 1 + count, 1)
  return monthKey(date)
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

/** Valores das parcelas em centavos. */
export function installmentAmounts(totalCents: number, count: number): number[] {
  const n = Math.max(1, count)
  const base = Math.floor(totalCents / n)
  const rest = totalCents - base * n
  return Array.from({ length: n }, (_, index) => base + (index < rest ? 1 : 0))
}

/** Data de vencimento da parcela `number` (1, 2, 3…). */
export function installmentDueDate(debt: Pick<DebtorDebt, 'date' | 'dueDate'>, number: number): string {
  const first = debt.dueDate ?? debt.date
  const month = addMonths(first.slice(0, 7), number - 1)
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const day = Math.min(Number(first.slice(8, 10)), lastDay)
  return `${month}-${String(day).padStart(2, '0')}`
}

/** A parcela que vence no mês informado (ou null se não houver). */
export function getMonthInstallment(debt: DebtorDebt, payments: DebtorPayment[], month = monthKey()): MonthInstallment | null {
  const total = Math.max(1, debt.installments)
  const firstMonth = (debt.dueDate ?? debt.date).slice(0, 7)
  const number = monthsBetween(firstMonth, month) + 1
  if (number < 1 || number > total) return null

  const amounts = installmentAmounts(debt.amountCents, total)
  const received = payments.filter(payment => payment.debtId === debt.id).reduce((sum, payment) => sum + payment.amountCents, 0)

  const dueBefore = amounts.slice(0, number - 1).reduce((sum, value) => sum + value, 0)
  const amountCents = amounts[number - 1]
  const paidOfThis = Math.min(amountCents, Math.max(0, received - dueBefore))
  const remainingCents = amountCents - paidOfThis

  return {
    number,
    total,
    amountCents,
    remainingCents,
    dueDate: installmentDueDate(debt, number),
    status: remainingCents === 0 ? 'paid' : paidOfThis > 0 ? 'partial' : 'open',
    overdueCents: Math.max(0, dueBefore - received),
  }
}
