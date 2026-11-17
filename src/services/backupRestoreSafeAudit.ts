
import { hasValidRestoreStructure } from './backupRestoreStructure'
import { auditBackupRestore } from './backupRestoreAudit'
import { getCardInvoices } from './cardInvoices'
import { validateBackupPayments } from './backupPaymentsValidation'
import { validateBackupDebtors } from './backupDebtorsValidation'

import type { Transaction } from './storage'
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'
import type { CardPayment } from './cardPaymentsStorage'
import type { BackupRestorePlan } from './backupRestorePlan'

export type SafeAuditResult = {
  valid: boolean
  errors: string[]
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function validMoney(value: unknown): value is number {
  if (typeof value !== 'number') return false
  if (!Number.isFinite(value) || value <= 0) return false

  const cents = value * 100

  return (
    Number.isSafeInteger(Math.round(cents)) &&
    Math.abs(cents - Math.round(cents)) <= 1e-7
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

function validTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.description === 'string' &&
    value.description.trim().length > 0 &&
    validMoney(value.amount) &&
    (value.type === 'income' || value.type === 'expense') &&
    typeof value.category === 'string' &&
    validDate(value.date)
  )
}

function validCard(value: unknown): value is CreditCard {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.bank === 'string' &&
    value.bank.trim().length > 0 &&
    validMoney(value.limit) &&
    Number.isInteger(value.closingDay) &&
    Number(value.closingDay) >= 1 &&
    Number(value.closingDay) <= 31 &&
    Number.isInteger(value.dueDay) &&
    Number(value.dueDay) >= 1 &&
    Number(value.dueDay) <= 31
  )
}

function validPurchase(value: unknown): value is CardPurchase {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.cardId === 'string' &&
    value.cardId.trim().length > 0 &&
    typeof value.description === 'string' &&
    value.description.trim().length > 0 &&
    validMoney(value.amount) &&
    typeof value.category === 'string' &&
    validDate(value.date) &&
    Number.isInteger(value.installments) &&
    Number(value.installments) >= 1 &&
    Number(value.installments) <= 120 &&
    Math.round(Number(value.amount) * 100) >=
      Number(value.installments)
  )
}


function validPayment(value: unknown): value is CardPayment {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.cardId === 'string' &&
    value.cardId.trim().length > 0 &&
    typeof value.invoiceMonth === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value.invoiceMonth) &&
    validMoney(value.amount) &&
    validDate(value.date) &&
    (
      value.transactionId === undefined ||
      (
        typeof value.transactionId === 'string' &&
        value.transactionId.trim().length > 0
      )
    )
  )
}


export function safelyAuditBackupRestore(
  value: unknown
): SafeAuditResult {
  if (!hasValidRestoreStructure(value)) {
    return {
      valid: false,
      errors: ['Estrutura do plano de restauração inválida.'],
    }
  }

  if (!value.transactions.every(validTransaction)) {
    return {
      valid: false,
      errors: ['O backup contém transações inválidas.'],
    }
  }

  if (!value.cards.every(validCard)) {
    return {
      valid: false,
      errors: ['O backup contém cartões inválidos.'],
    }
  }

  if (!value.purchases.every(validPurchase)) {
    return {
      valid: false,
      errors: ['O backup contém compras inválidas.'],
    }
  }

  if (!value.payments.every(validPayment)) {
    return {
      valid: false,
      errors: ['O backup contém pagamentos inválidos.'],
    }
  }


const basePlan = {
  transactions: value.transactions,
  cards: value.cards,
  purchases: value.purchases,
  payments: value.payments,
}

let plan: BackupRestorePlan


if (value.version === 5) {
  try {
    validateBackupDebtors(
      value.debtorsData,
      value.purchases,
      value.transactions,
    )
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error
          ? error.message
          : 'Erro ao validar os Devedores do backup.',
      ],
    }
  }
}



if (value.version === 5) {
  plan = {
    ...basePlan,
    version: 5,
    debtorsData: value.debtorsData,
  }
} else {
  plan = {
    ...basePlan,
    version: value.version,
  }
}


const audit = auditBackupRestore(plan)


  if (!audit.valid) {
    return audit
  }

  try {
    const invoices = getCardInvoices(
      plan.purchases,
      plan.cards
    )

    validateBackupPayments(
      plan.payments,
      plan.cards,
      plan.transactions,
      invoices
    )
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error
          ? error.message
          : 'Erro ao validar pagamentos do backup.',
      ],
    }
  }

  return {
    valid: true,
    errors: [],
  }
}
