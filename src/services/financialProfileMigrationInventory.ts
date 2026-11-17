
import {
  captureBackupStorageSnapshot,
} from './backupRestoreSnapshot'

export type FinancialProfileMigrationInventory = {
  capturedAt: string
  areas: {
    transactions: boolean
    cards: boolean
    purchases: boolean
    payments: boolean
    debtors: boolean
    goals: boolean
    budgets: boolean
    manualForecast: boolean
  }
  totalAreasWithData: number
}

export function getFinancialProfileMigrationInventory():
  FinancialProfileMigrationInventory {
  const snapshot = captureBackupStorageSnapshot()

  const areas = {
    transactions: snapshot.transactions !== null,
    cards: snapshot.cards !== null,
    purchases: snapshot.purchases !== null,
    payments: snapshot.payments !== null,
    debtors:
      snapshot.debtors !== null &&
      snapshot.debtors !== undefined,

    goals:
      localStorage.getItem(
        'personal-finance-goals'
      ) !== null,

    budgets:
      localStorage.getItem(
        'personal-finance-budgets-v1'
      ) !== null,

    manualForecast:
      localStorage.getItem(
        'personal-finance-manual-forecasts'
      ) !== null,
  }

  return {
    capturedAt: new Date().toISOString(),
    areas,
    totalAreasWithData:
      Object.values(areas).filter(Boolean).length,
  }
}
