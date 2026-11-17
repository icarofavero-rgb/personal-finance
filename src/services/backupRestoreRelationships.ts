
import type { BackupRestorePlan } from './backupRestorePlan'

export type RelationshipReport = {
  valid: boolean
  errors: string[]
}

export function inspectRestoreRelationships(
  plan: BackupRestorePlan
): RelationshipReport {
  const errors: string[] = []

  const cardIds = new Set(
    plan.cards.map(card => card.id)
  )

  for (const purchase of plan.purchases) {
    if (!cardIds.has(purchase.cardId)) {
      errors.push(
        `A compra "${purchase.id}" está vinculada ` +
        'a um cartão inexistente.'
      )
    }
  }

  for (const payment of plan.payments) {
    if (!cardIds.has(payment.cardId)) {
      errors.push(
        `O pagamento "${payment.id}" está vinculado ` +
        'a um cartão inexistente.'
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
