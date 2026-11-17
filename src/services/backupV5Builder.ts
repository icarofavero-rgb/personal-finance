
import { getTransactions } from './storage'
import { getCards } from './cardsStorage'
import { getCardPurchases } from './cardPurchasesStorage'
import { getCardPayments } from './cardPaymentsStorage'
import { getDebtorsData } from './debtors/debtorsStorage'

import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'
import type { BackupRestorePlan } from './backupRestorePlan'

export type BackupV5 = Extract<
  BackupRestorePlan,
  { version: 5 }
> & {
  createdAt: string
}


const BACKUP_STORAGE_KEYS = [
  'personal-finance-transactions',
  'personal-finance-credit-cards',
  'personal-finance-card-purchases',
  'personal-finance-card-payments',
  'personal-finance-debtors-v1',
] as const

export function createBackupV5(): BackupV5 {


  const initialStorageSnapshot = new Map<string, string | null>()

  try {
    for (const key of BACKUP_STORAGE_KEYS) {
      initialStorageSnapshot.set(
        key,
        localStorage.getItem(key)
      )
    }
  } catch {
    throw new Error(
      'Não foi possível capturar os dados financeiros iniciais. ' +
      'O Backup V5 não foi gerado.'
    )
  }

  const transactions = readVerifiedFinancialCollection(
    'personal-finance-transactions',
    'transações',
    getTransactions
  )

  const cards = readVerifiedFinancialCollection(
    'personal-finance-credit-cards',
    'cartões',
    getCards
  )

  const purchases = readVerifiedFinancialCollection(
    'personal-finance-card-purchases',
    'compras',
    getCardPurchases
  )

  const payments = readVerifiedFinancialCollection(
    'personal-finance-card-payments',
    'pagamentos',
    getCardPayments
  )

  const debtorsData = getDebtorsData()

  const plan: BackupRestorePlan = {
    version: 5,
    transactions,
    cards,
    purchases,
    payments,
    debtorsData,
  }

  // Preserve abaixo a auditoria e o retorno existentes.

  const audit = safelyAuditBackupRestore(plan)

  if (!audit.valid) {
    throw new Error(
      'Os dados financeiros não passaram na validação. ' +
      'O Backup V5 não foi gerado.'
    )
  }

  assertStorageUnchanged(
    'personal-finance-transactions',
    'transações',
    transactions
  )

  assertStorageUnchanged(
    'personal-finance-credit-cards',
    'cartões',
    cards
  )

  assertStorageUnchanged(
    'personal-finance-card-purchases',
    'compras',
    purchases
  )

  assertStorageUnchanged(
    'personal-finance-card-payments',
    'pagamentos',
    payments
  )

  assertStorageUnchanged(
    'personal-finance-debtors-v1',
    'devedores',
    debtorsData
  )

assertStorageSnapshotUnchanged(initialStorageSnapshot)

  return {
    ...plan,
    createdAt: new Date().toISOString(),
  }
}

function readVerifiedFinancialCollection<T>(
  key: string,
  label: string,
  read: () => T[]
): T[] {
  let saved: string | null

  try {
    saved = localStorage.getItem(key)
  } catch {
    throw new Error(
      `Não foi possível acessar ${label}. ` +
      'O Backup V5 não foi gerado.'
    )
  }

  if (saved === null) {
    const loaded = read()

    if (loaded.length !== 0) {
      throw new Error(
        `A leitura de ${label} apresentou dados inesperados.`
      )
    }

    return loaded
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      `Os dados de ${label} estão corrompidos. ` +
      'O Backup V5 não foi gerado.'
    )
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `A estrutura de ${label} é inválida. ` +
      'O Backup V5 não foi gerado.'
    )
  }

  const loaded = read()

  if (
    loaded.length !== parsed.length ||
    JSON.stringify(loaded) !== JSON.stringify(parsed)
  ) {
    throw new Error(
      `A leitura de ${label} não corresponde aos dados armazenados. ` +
      'O Backup V5 não foi gerado.'
    )
  }

  return loaded
}

function assertStorageUnchanged(
  key: string,
  label: string,
  expected: unknown
): void {
  let saved: string | null

  try {
    saved = localStorage.getItem(key)
  } catch {
    throw new Error(
      `Não foi possível confirmar a integridade de ${label}. ` +
      'O Backup V5 não foi gerado.'
    )
  }


  if (saved === null) {
    const expectedEmptyValue =
      key === 'personal-finance-debtors-v1'
        ? {
            debtors: [],
            debts: [],
            payments: [],
          }
        : []

    if (
      JSON.stringify(expected) !==
      JSON.stringify(expectedEmptyValue)
    ) {
      throw new Error(
        `Os dados de ${label} foram alterados durante o backup.`
      )
    }

    return
  }


  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      `Os dados de ${label} ficaram ilegíveis durante o backup.`
    )
  }

  if (
    JSON.stringify(parsed) !== JSON.stringify(expected)
  ) {
    throw new Error(
      `Os dados de ${label} foram alterados durante o backup. ` +
      'A operação foi interrompida.'
    )
  }
}


function assertStorageSnapshotUnchanged(
  initialSnapshot: Map<string, string | null>
): void {
  for (const [key, initialValue] of initialSnapshot) {
    let currentValue: string | null

    try {
      currentValue = localStorage.getItem(key)
    } catch {
      throw new Error(
        'Não foi possível verificar a integridade do armazenamento. ' +
        'O Backup V5 não foi gerado.'
      )
    }

    if (currentValue !== initialValue) {
      throw new Error(
        'Os dados financeiros foram modificados ' +
        'durante a criação do Backup V5. ' +
        'A operação foi interrompida.'
      )
    }
  }
}
