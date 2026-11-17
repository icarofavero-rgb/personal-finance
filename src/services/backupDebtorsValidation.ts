
import type { CardPurchase } from './cardPurchasesStorage'
import type { DebtorsData } from './debtors/debtorsStorage'
import { calculateDebtSummary } from './debtors/debtorsCalculations'
import type { Transaction } from './storage'
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function validDate(value: unknown): boolean {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}

function validTimestamp(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validCents(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function uniqueIds(items: Array<{ id: string }>): boolean {
  return new Set(items.map(item => item.id)).size === items.length
}

export function validateBackupDebtors(
  value: unknown,
  purchases: CardPurchase[],
  transactions?: Transaction[]
): asserts value is DebtorsData {
  if (
    !isRecord(value) ||
    !Array.isArray(value.debtors) ||
    !Array.isArray(value.debts) ||
    !Array.isArray(value.payments)
  ) {
    throw new Error('Estrutura dos Devedores inválida.')
  }

  const { debtors, debts, payments } = value

  for (const debtor of debtors) {
    if (
      !isRecord(debtor) ||
      !validId(debtor.id) ||
      typeof debtor.name !== 'string' ||
      !debtor.name.trim() ||
      !validTimestamp(debtor.createdAt) ||
      (debtor.notes !== undefined &&
        typeof debtor.notes !== 'string')
    ) {
      throw new Error('O backup contém um devedor inválido.')
    }
  }

  for (const debt of debts) {
    if (
      !isRecord(debt) ||
      !validId(debt.id) ||
      !validId(debt.debtorId) ||
      typeof debt.description !== 'string' ||
      !debt.description.trim() ||
      !validCents(debt.amountCents) ||
      !Number.isInteger(debt.installments) ||
      Number(debt.installments) < 1 ||
      Number(debt.installments) > 120 ||
      !validDate(debt.date) ||
      (debt.dueDate !== undefined &&
        !validDate(debt.dueDate)) ||
      !validTimestamp(debt.createdAt) ||
      (debt.cardPurchaseId !== undefined &&
        !validId(debt.cardPurchaseId))
    ) {
      throw new Error('O backup contém uma dívida inválida.')
    }
  }

  for (const payment of payments) {
    if (
      !isRecord(payment) ||
      !validId(payment.id) ||
      !validId(payment.debtId) ||
      !validCents(payment.amountCents) ||
      !validDate(payment.date) ||
      !validTimestamp(payment.createdAt) ||
      (payment.notes !== undefined &&
        typeof payment.notes !== 'string') ||
      (payment.transactionId !== undefined &&
        !validId(payment.transactionId))
    ) {
      throw new Error(
        'O backup contém um recebimento inválido.'
      )
    }
  }

  const data = value as DebtorsData

  if (
    !uniqueIds(data.debtors) ||
    !uniqueIds(data.debts) ||
    !uniqueIds(data.payments)
  ) {
    throw new Error(
      'O backup contém identificadores de Devedores duplicados.'
    )
  }

  const debtorIds = new Set(data.debtors.map(item => item.id))
  const debtIds = new Set(data.debts.map(item => item.id))
  const purchaseMap = new Map(
    purchases.map(purchase => [purchase.id, purchase])
  )
  const linkedPurchases = new Set<string>()

  for (const debt of data.debts) {
    if (!debtorIds.has(debt.debtorId)) {
      throw new Error(
        'Existe uma dívida vinculada a um devedor inexistente.'
      )
    }

    if (debt.cardPurchaseId !== undefined) {
      if (linkedPurchases.has(debt.cardPurchaseId)) {
        throw new Error(
          'Uma compra está vinculada a mais de uma dívida.'
        )
      }

      const purchase = purchaseMap.get(debt.cardPurchaseId)

      if (!purchase) {
        throw new Error(
          'Existe uma dívida vinculada a uma compra inexistente.'
        )
      }

      const purchaseCents = Math.round(purchase.amount * 100)

      if (
        !Number.isSafeInteger(purchaseCents) ||
        purchaseCents !== debt.amountCents ||
        purchase.installments !== debt.installments
      ) {
        throw new Error(
          'A dívida não corresponde aos dados da compra.'
        )
      }

      linkedPurchases.add(debt.cardPurchaseId)
    }
  }

  for (const payment of data.payments) {
    if (!debtIds.has(payment.debtId)) {
      throw new Error(
        'Existe um recebimento vinculado a uma dívida inexistente.'
      )
    }
  }


  // Verifica se os recebimentos estão vinculados
  // a transações existentes, quando houver vínculo.
  if (transactions !== undefined) {
    const transactionIds = new Set(
      transactions.map(transaction => transaction.id)
    )

    for (const payment of data.payments) {
      if (
        payment.transactionId !== undefined &&
        !transactionIds.has(payment.transactionId)
      ) {
        throw new Error(
          'Existe um recebimento de Devedores vinculado ' +
          'a uma transação inexistente.'
        )
      }
    }
  }

  // Valida os cálculos financeiros das dívidas.
  for (const debt of data.debts) {
    calculateDebtSummary(debt, data.payments)
  }
}

