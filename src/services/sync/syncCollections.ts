/**
 * Coleções que participam da sincronização entre dispositivos.
 *
 * Cada coleção diz onde os dados ficam no armazenamento (storageKey) e
 * qual o formato:
 *  - 'array':     lista de registros com `id` (ex.: transações)
 *  - 'field':     lista dentro de um objeto (ex.: devedores.debts)
 *  - 'singleton': um único objeto de configuração (ex.: aparência)
 *
 * Ficam DE FORA de propósito: estado de leitura/histórico de notificações
 * (são de cada aparelho) e registros técnicos de recuperação/pendências.
 */

export type SyncCollection =
  | { name: string; storageKey: string; kind: 'array' }
  | { name: string; storageKey: string; kind: 'field'; field: string }
  | { name: string; storageKey: string; kind: 'singleton' }

export const SINGLETON_ID = 'singleton'

export const SYNC_COLLECTIONS: readonly SyncCollection[] = [
  { name: 'transactions', storageKey: 'personal-finance-transactions', kind: 'array' },
  { name: 'cards', storageKey: 'personal-finance-credit-cards', kind: 'array' },
  { name: 'cardPurchases', storageKey: 'personal-finance-card-purchases', kind: 'array' },
  { name: 'cardPayments', storageKey: 'personal-finance-card-payments', kind: 'array' },
  { name: 'debtors', storageKey: 'personal-finance-debtors-v1', kind: 'field', field: 'debtors' },
  { name: 'debts', storageKey: 'personal-finance-debtors-v1', kind: 'field', field: 'debts' },
  { name: 'debtorPayments', storageKey: 'personal-finance-debtors-v1', kind: 'field', field: 'payments' },
  { name: 'goals', storageKey: 'personal-finance-goals', kind: 'array' },
  { name: 'budgets', storageKey: 'personal-finance-budgets-v1', kind: 'array' },
  { name: 'manualForecasts', storageKey: 'personal-finance-manual-forecasts', kind: 'array' },
  { name: 'savings', storageKey: 'personal-finance-savings-v1', kind: 'array' },
  { name: 'reminders', storageKey: 'personal-finance-reminders-v1', kind: 'array' },
  { name: 'userPreferences', storageKey: 'personal-finance-user-preferences', kind: 'singleton' },
  { name: 'appearance', storageKey: 'personal-finance-appearance', kind: 'singleton' },
  { name: 'notificationPreferences', storageKey: 'personal-finance-notification-preferences-v1', kind: 'singleton' },
]

const TRACKED_KEYS = new Set(SYNC_COLLECTIONS.map(item => item.storageKey))

export function isTrackedStorageKey(key: string): boolean {
  return TRACKED_KEYS.has(key)
}

export function collectionsForKey(key: string): SyncCollection[] {
  return SYNC_COLLECTIONS.filter(item => item.storageKey === key)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Lê os registros de uma coleção a partir do valor bruto armazenado.
 * Retorna `null` quando os dados estão ilegíveis ou em formato inesperado —
 * nesse caso a coleção é ignorada (nunca interpretada como "tudo apagado").
 */
export function readCollectionRecords(
  collection: SyncCollection,
  raw: string | null
): Map<string, unknown> | null {
  const records = new Map<string, unknown>()

  if (raw === null) return records

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (collection.kind === 'singleton') {
    if (!isPlainObject(parsed)) return null
    records.set(SINGLETON_ID, parsed)
    return records
  }

  let list: unknown = parsed

  if (collection.kind === 'field') {
    if (!isPlainObject(parsed)) return null
    list = parsed[collection.field] ?? []
  }

  if (!Array.isArray(list)) return null

  for (const item of list) {
    if (isPlainObject(item) && typeof item.id === 'string' && item.id !== '') {
      records.set(item.id, item)
    }
  }

  return records
}
