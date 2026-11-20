import { validateDebtCardLink } from './debtorsCardLink'

import type {
  Debtor,
  DebtorDebt,
  DebtorPayment,
} from './debtorsTypes'

import {
  calculateDebtSummary,
  validateDebtorPayment,
} from './debtorsCalculations'

const STORAGE_KEY = 'personal-finance-debtors-v1'

export type DebtorsData = {
  debtors: Debtor[]
  debts: DebtorDebt[]
  payments: DebtorPayment[]
}

function emptyData(): DebtorsData {
  return {
    debtors: [],
    debts: [],
    payments: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDebtDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day)
  )

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}

function isDebtorsData(value: unknown): value is DebtorsData {
  if (!isRecord(value)) return false

  return (
    Array.isArray(value.debtors) &&
    Array.isArray(value.debts) &&
    Array.isArray(value.payments)
  )
}

export function getDebtorsData(): DebtorsData {
  const saved = localStorage.getItem(STORAGE_KEY)

  if (saved === null) {
    return emptyData()
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      'Os dados dos devedores não puderam ser lidos. Nenhum dado foi alterado.'
    )
  }

  if (!isDebtorsData(parsed)) {
    throw new Error(
      'Estrutura de devedores inválida. Nenhum dado foi alterado.'
    )
  }

  return parsed
}

function saveDebtorsData(data: DebtorsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function addDebtor(debtor: Debtor): void {
  const data = getDebtorsData()

  if (!debtor.id || !debtor.name.trim()) {
    throw new Error('Informe um nome válido.')
  }

  if (data.debtors.some(item => item.id === debtor.id)) {
    throw new Error('Este devedor já está cadastrado.')
  }

  saveDebtorsData({
    ...data,
    debtors: [...data.debtors, debtor],
  })
}

export function addDebtorDebt(debt: DebtorDebt): void {
  const data = getDebtorsData()

  if (!data.debtors.some(item => item.id === debt.debtorId)) {
    throw new Error('Devedor não encontrado.')
  }

  if (data.debts.some(item => item.id === debt.id)) {
    throw new Error('Esta dívida já está cadastrada.')
  }

// Valida os valores e o parcelamento
calculateDebtSummary(debt, [])

// Confere a compra original, quando vinculada
validateDebtCardLink(debt)

  if (
    debt.cardPurchaseId &&
    data.debts.some(
      item => item.cardPurchaseId === debt.cardPurchaseId
    )
  ) {
    throw new Error(
      'Esta compra já está vinculada a uma dívida.'
    )
  }

  saveDebtorsData({
    ...data,
    debts: [...data.debts, debt],
  })
}

export function addDebtorPayment(
  payment: DebtorPayment
): void {
  const data = getDebtorsData()

  if (data.payments.some(item => item.id === payment.id)) {
    throw new Error('Este recebimento já está cadastrado.')
  }

  const debt = data.debts.find(
    item => item.id === payment.debtId
  )

  if (!debt) {
    throw new Error('Dívida não encontrada.')
  }

  validateDebtorPayment(
    debt,
    data.payments,
    payment.amountCents
  )

  saveDebtorsData({
    ...data,
    payments: [...data.payments, payment],
  })
}

export function updateDebtor(
  debtorId: string,
  changes: Pick<Debtor, 'name' | 'notes'> & { kind?: Debtor['kind'] }
): void {
  const data = getDebtorsData()

  const debtorIndex = data.debtors.findIndex(
    debtor => debtor.id === debtorId
  )

  if (debtorIndex === -1) {
    throw new Error('Devedor não encontrado.')
  }

  const name = changes.name.trim()
  const notes = changes.notes?.trim() ?? ''

  if (!name) {
    throw new Error('Informe um nome válido.')
  }

  const updatedDebtors = data.debtors.map(debtor =>
    debtor.id === debtorId
      ? {
          ...debtor,
          name,
          notes,
          ...(changes.kind ? { kind: changes.kind } : {}),
        }
      : debtor
  )

  saveDebtorsData({
    ...data,
    debtors: updatedDebtors,
  })
}

export type UpdateDebtorDebtInput = {
  description: string
  amountCents: number
  installments: number
  date: string
  dueDate?: string
}

export function updateDebtorDebt(
  debtId: string,
  changes: UpdateDebtorDebtInput
): void {
  const data = getDebtorsData()

  const existingDebt = data.debts.find(
    debt => debt.id === debtId
  )

  if (!existingDebt) {
    throw new Error('Dívida não encontrada.')
  }

  const description = changes.description.trim()

  if (!isValidDebtDate(changes.date)) {
    throw new Error('Informe uma data de registro válida.')
  }

  if (
    changes.dueDate !== undefined &&
    !isValidDebtDate(changes.dueDate)
  ) {
    throw new Error('Informe uma data de vencimento válida.')
  }

  if (
    changes.dueDate !== undefined &&
    changes.dueDate < changes.date
  ) {
    throw new Error(
      'O vencimento não pode ser anterior à data da dívida.'
    )
  }

  if (!description) {
    throw new Error('Informe uma descrição válida.')
  }

  const updatedDebt: DebtorDebt = {
    ...existingDebt,
    description,
    amountCents: changes.amountCents,
    installments: changes.installments,
    date: changes.date,
    dueDate: changes.dueDate,
  }

  const payments = data.payments.filter(
    payment => payment.debtId === debtId
  )

  // Valida o novo valor contra os pagamentos existentes.
  calculateDebtSummary(updatedDebt, payments)

  // Preserva a correspondência com a compra original.
  validateDebtCardLink(updatedDebt)

  const updatedDebts = data.debts.map(debt =>
    debt.id === debtId ? updatedDebt : debt
  )

  saveDebtorsData({
    ...data,
    debts: updatedDebts,
  })
}

export type UpdateDebtorPaymentInput = {
  amountCents: number
  date: string
  notes?: string
}

export function updateDebtorPayment(
  paymentId: string,
  changes: UpdateDebtorPaymentInput
): void {
  const data = getDebtorsData()

  const existingPayment = data.payments.find(
    payment => payment.id === paymentId
  )

  if (!existingPayment) {
    throw new Error('Recebimento não encontrado.')
  }

  if (!isValidDebtDate(changes.date)) {
    throw new Error('Informe uma data de recebimento válida.')
  }

  const debt = data.debts.find(
    item => item.id === existingPayment.debtId
  )

  if (!debt) {
    throw new Error('Dívida não encontrada.')
  }

  // Exclui temporariamente o pagamento editado
  // para calcular corretamente o saldo disponível.
  const otherPayments = data.payments.filter(
    payment => payment.id !== paymentId
  )

  validateDebtorPayment(
    debt,
    otherPayments,
    changes.amountCents
  )

  const updatedPayments = data.payments.map(payment =>
    payment.id === paymentId
      ? {
          ...payment,
          amountCents: changes.amountCents,
          date: changes.date,
          notes: changes.notes?.trim() ?? '',
        }
      : payment
  )

  saveDebtorsData({
    ...data,
    payments: updatedPayments,
  })
}

/**
 * Exclui uma dívida e os recebimentos dela.
 * Devolve o id da compra no cartão ligada a ela (se houver), para a
 * tela decidir se remove a compra também.
 */
export function deleteDebtorDebt(debtId: string): { cardPurchaseId?: string } {
  const data = getDebtorsData()
  const debt = data.debts.find(item => item.id === debtId)

  if (!debt) {
    throw new Error('Dívida não encontrada.')
  }

  saveDebtorsData({
    ...data,
    debts: data.debts.filter(item => item.id !== debtId),
    payments: data.payments.filter(payment => payment.debtId !== debtId),
  })

  return { cardPurchaseId: debt.cardPurchaseId }
}

/** Exclui um pagamento/recebimento de uma dívida. */
export function deleteDebtorPayment(paymentId: string): void {
  const data = getDebtorsData()
  if (!data.payments.some(payment => payment.id === paymentId)) {
    throw new Error('Pagamento não encontrado.')
  }
  saveDebtorsData({ ...data, payments: data.payments.filter(payment => payment.id !== paymentId) })
}
