
export type BackupStorageSnapshot = {
  transactions: string | null
  cards: string | null
  purchases: string | null
  payments: string | null

  // Opcional para manter compatibilidade com snapshots antigos.
  debtors?: string | null
}

const STORAGE_KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  debtors: 'personal-finance-debtors-v1',
} as const

export function captureBackupStorageSnapshot():
  BackupStorageSnapshot {
  return {
    transactions: localStorage.getItem(
      STORAGE_KEYS.transactions
    ),
    cards: localStorage.getItem(
      STORAGE_KEYS.cards
    ),
    purchases: localStorage.getItem(
      STORAGE_KEYS.purchases
    ),
    payments: localStorage.getItem(
      STORAGE_KEYS.payments
    ),
    debtors: localStorage.getItem(
      STORAGE_KEYS.debtors
    ),
  }
}
