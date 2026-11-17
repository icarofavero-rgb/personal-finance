/**
 * Conversão entre o armazenamento do app e o "pacote" de sincronização.
 */

import { captureChanges, type StorageLike, type SyncMeta } from './changeTracker'
import type { SyncSnapshot } from './syncMerge'
import {
  SINGLETON_ID,
  SYNC_COLLECTIONS,
  readCollectionRecords,
} from './syncCollections'

/**
 * Monta o pacote com os dados e o diário deste aparelho.
 * Registra as alterações pendentes antes, para o diário estar em dia.
 */
export function buildLocalSnapshot(
  options: { storage?: StorageLike; now?: number } = {}
): SyncSnapshot {
  const storage = options.storage ?? localStorage
  const meta = captureChanges({ storage, now: options.now })

  const collections: SyncSnapshot['collections'] = {}

  for (const collection of SYNC_COLLECTIONS) {
    const records = readCollectionRecords(
      collection,
      storage.getItem(collection.storageKey)
    )

    if (records === null) {
      throw new Error(
        'Existem dados ilegíveis neste aparelho. ' +
        'Corrija-os (ou restaure um backup) antes de sincronizar.'
      )
    }

    const collectionMeta = meta.collections[collection.name] ?? {}
    const snapshotRecords: Record<string, unknown> = {}

    for (const [id, entry] of Object.entries(collectionMeta)) {
      if (entry.x) continue

      if (!records.has(id)) {
        throw new Error('O diário de sincronização está inconsistente.')
      }

      snapshotRecords[id] = records.get(id)
    }

    collections[collection.name] = {
      records: snapshotRecords,
      meta: { ...collectionMeta },
    }
  }

  return {
    format: 'personal-finance-sync',
    version: 1,
    deviceId: meta.deviceId,
    clock: meta.clock,
    collections,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEmptyValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0

  return (
    isPlainObject(value) &&
    Object.values(value).every(item => Array.isArray(item) && item.length === 0)
  )
}

/**
 * Converte um pacote (já juntado) nos valores a gravar no armazenamento.
 * Retorna apenas as chaves que mudam, junto com o novo diário.
 */
export function snapshotToStorageValues(
  snapshot: SyncSnapshot,
  options: { storage?: StorageLike } = {}
): { values: Map<string, string>; meta: SyncMeta } {
  const storage = options.storage ?? localStorage
  const pending = new Map<string, unknown>()

  for (const collection of SYNC_COLLECTIONS) {
    const data = snapshot.collections[collection.name]
    if (!data) continue

    const records = Object.values(data.records)

    if (collection.kind === 'singleton') {
      // Preferências nunca são apagadas pela sincronização.
      const record = data.records[SINGLETON_ID]
      if (record !== undefined) pending.set(collection.storageKey, record)
      continue
    }

    if (collection.kind === 'array') {
      pending.set(collection.storageKey, records)
      continue
    }

    // 'field': lista dentro de um objeto (ex.: devedores).
    let base = pending.get(collection.storageKey)

    if (!isPlainObject(base)) {
      const raw = storage.getItem(collection.storageKey)
      let parsed: unknown = null

      try {
        parsed = raw === null ? null : JSON.parse(raw)
      } catch {
        parsed = null
      }

      base = isPlainObject(parsed)
        ? { ...parsed }
        : { debtors: [], debts: [], payments: [] }
    }

    ;(base as Record<string, unknown>)[collection.field] = records
    pending.set(collection.storageKey, base)
  }

  const values = new Map<string, string>()

  for (const [key, value] of pending) {
    const current = storage.getItem(key)

    // Área nunca usada e que continua vazia: não cria nada.
    if (current === null && isEmptyValue(value)) continue

    const text = JSON.stringify(value)
    if (current !== text) values.set(key, text)
  }

  const meta: SyncMeta = {
    version: 1,
    deviceId: snapshot.deviceId,
    clock: snapshot.clock,
    collections: Object.fromEntries(
      Object.entries(snapshot.collections).map(([name, data]) => [
        name,
        { ...data.meta },
      ])
    ),
  }

  return { values, meta }
}
