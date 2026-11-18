/**
 * Rastreador de alterações para a sincronização.
 *
 * Não altera os dados do app. Mantém, em uma chave separada, um "diário"
 * com a impressão digital (hash) de cada registro, quando ele mudou pela
 * última vez, em qual aparelho, e se foi excluído. É isso que permite
 * juntar dois aparelhos registro a registro sem um apagar o outro.
 */

import { createRandomUUID } from '../../polyfills'
import { hashRecord } from './stableHash'
import {
  getSyncCollections,
  isTrackedStorageKey,
  readCollectionRecords,
  type SyncCollection,
} from './syncCollections'

export const SYNC_META_KEY = 'personal-finance-sync-meta-v1'

/** Situação de um registro no diário. */
export type SyncRecordMeta = {
  /** hash do conteúdo ('' quando excluído) */
  h: string
  /** momento da última alteração (relógio lógico, em ms) */
  t: number
  /** aparelho que fez a última alteração */
  d: string
  /** presente quando o registro foi excluído */
  x?: true
}

export type SyncMeta = {
  version: 1
  deviceId: string
  /** maior momento já usado/visto — nunca anda para trás */
  clock: number
  collections: Record<string, Record<string, SyncRecordMeta>>
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidMeta(value: unknown): value is SyncMeta {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.deviceId === 'string' &&
    value.deviceId !== '' &&
    typeof value.clock === 'number' &&
    Number.isFinite(value.clock) &&
    isRecord(value.collections)
  )
}

/** Lê o diário. Retorna `null` se ele ainda não existir ou estiver ilegível. */
export function readSyncMeta(storage: StorageLike = localStorage): SyncMeta | null {
  const raw = storage.getItem(SYNC_META_KEY)

  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidMeta(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeSyncMeta(meta: SyncMeta, storage: StorageLike = localStorage): void {
  storage.setItem(SYNC_META_KEY, JSON.stringify(meta))
}

/** Relógio que nunca anda para trás, mesmo se o relógio do aparelho atrasar. */
export function nextTimestamp(meta: SyncMeta, now: number): number {
  meta.clock = Math.max(now, meta.clock + 1)
  return meta.clock
}

function captureCollection(
  meta: SyncMeta,
  collection: SyncCollection,
  storage: StorageLike,
  now: number,
  baseline: boolean
): boolean {
  const records = readCollectionRecords(
    collection,
    storage.getItem(collection.storageKey)
  )

  // Dados ilegíveis: não registra nada (principalmente, não marca exclusões).
  if (records === null) return false

  const entries = (meta.collections[collection.name] ??= {})
  let changed = false

  for (const [id, record] of records) {
    const hash = hashRecord(record)
    const current = entries[id]

    if (current && !current.x && current.h === hash) continue

    entries[id] = {
      h: hash,
      // Na primeira execução os dados já existentes recebem momento 0
      // ("mais antigo que qualquer edição real").
      t: baseline && !current ? 0 : nextTimestamp(meta, now),
      d: meta.deviceId,
    }
    changed = true
  }

  for (const [id, current] of Object.entries(entries)) {
    if (current.x || records.has(id)) continue

    entries[id] = { h: '', t: nextTimestamp(meta, now), d: meta.deviceId, x: true }
    changed = true
  }

  return changed
}

/**
 * Compara os dados atuais com o diário e registra o que mudou.
 * Pode ser chamada quantas vezes quiser: sem mudanças, não faz nada.
 *
 * @param keys limita a verificação às chaves informadas (mais rápido)
 */
export function captureChanges(
  options: { storage?: StorageLike; now?: number; keys?: Iterable<string> } = {}
): SyncMeta {
  const storage = options.storage ?? localStorage
  const now = options.now ?? Date.now()

  const existing = readSyncMeta(storage)
  const baseline = existing === null

  const meta: SyncMeta = existing ?? {
    version: 1,
    deviceId: createRandomUUID(),
    clock: 0,
    collections: {},
  }

  // Na primeira execução registra tudo, independentemente do filtro.
  const keyFilter = options.keys && !baseline ? new Set(options.keys) : null

  let changed = baseline

  for (const collection of getSyncCollections()) {
    if (keyFilter && !keyFilter.has(collection.storageKey)) continue

    if (captureCollection(meta, collection, storage, now, baseline)) {
      changed = true
    }
  }

  if (changed) {
    writeSyncMeta(meta, storage)
  }

  return meta
}

/**
 * Passa a observar todas as gravações do app no localStorage.
 * Cada gravação em uma chave sincronizável agenda uma verificação logo
 * em seguida. A gravação original nunca é afetada: qualquer erro do
 * rastreador é apenas registrado no console.
 */
export function installChangeTracking(): () => void {
  if (typeof Storage === 'undefined' || typeof localStorage === 'undefined') {
    return () => {}
  }

  const prototype = Storage.prototype
  const originalSetItem = prototype.setItem
  const originalRemoveItem = prototype.removeItem

  const pendingKeys = new Set<string>()
  let scheduled = false

  function schedule(storage: Storage, key: string) {
    if (storage !== localStorage || !isTrackedStorageKey(key)) return

    // Avisa a conexão contínua: há algo novo para sincronizar
    try {
      window.dispatchEvent(new Event('personal-finance-local-change'))
    } catch {
      // sem window (testes): ignora
    }

    pendingKeys.add(key)

    if (scheduled) return
    scheduled = true

    queueMicrotask(() => {
      scheduled = false
      const keys = [...pendingKeys]
      pendingKeys.clear()

      try {
        captureChanges({ keys })
      } catch (error) {
        console.error('Sincronização: falha ao registrar alterações.', error)
      }
    })
  }

  prototype.setItem = function setItem(this: Storage, key: string, value: string) {
    originalSetItem.call(this, key, value)
    schedule(this, key)
  }

  prototype.removeItem = function removeItem(this: Storage, key: string) {
    originalRemoveItem.call(this, key)
    schedule(this, key)
  }

  // Registra o estado atual ao abrir o app.
  try {
    captureChanges()
  } catch (error) {
    console.error('Sincronização: falha na verificação inicial.', error)
  }

  return () => {
    prototype.setItem = originalSetItem
    prototype.removeItem = originalRemoveItem
  }
}
