
import type { BackupRestorePlan } from './backupRestorePlan'

export type IntegrityReport = {
  valid: boolean
  errors: string[]
}

function hasUniqueIds(
  items: { id: string }[]
): boolean {
  return (
    new Set(items.map(item => item.id)).size ===
    items.length
  )
}

export function inspectRestoreIntegrity(
  plan: BackupRestorePlan
): IntegrityReport {
  const errors: string[] = []

  const collections = [
    { name: 'transações', items: plan.transactions },
    { name: 'cartões', items: plan.cards },
    { name: 'compras', items: plan.purchases },
    { name: 'pagamentos', items: plan.payments },
  ]

  for (const collection of collections) {
    if (!hasUniqueIds(collection.items)) {
      errors.push(
        `Existem identificadores duplicados em ${collection.name}.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
