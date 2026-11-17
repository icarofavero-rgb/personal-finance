/**
 * Junção (merge) dos dados de dois aparelhos.
 *
 * Regra: para cada registro, vence a versão alterada por último.
 * Exclusões também contam como alteração (uma exclusão mais recente
 * remove o registro; uma edição mais recente "ressuscita" o registro).
 * Empate exato no horário é decidido pelo identificador do aparelho,
 * para que os dois lados cheguem sempre ao MESMO resultado.
 *
 * Funções puras: não leem nem gravam nada no armazenamento.
 */

import type { SyncRecordMeta } from './changeTracker'

export type SyncCollectionSnapshot = {
  records: Record<string, unknown>
  meta: Record<string, SyncRecordMeta>
}

export type SyncSnapshot = {
  format: 'personal-finance-sync'
  version: 1
  deviceId: string
  clock: number
  collections: Record<string, SyncCollectionSnapshot>
}

export type SyncCollectionStats = {
  added: number
  updated: number
  deleted: number
}

export type SyncMergeResult = {
  snapshot: SyncSnapshot
  /** O que vai mudar NESTE aparelho, por coleção */
  stats: Record<string, SyncCollectionStats>
  /** Há alguma mudança a aplicar neste aparelho? */
  changed: boolean
}

/** `true` se a versão `a` é mais nova que `b`. */
export function isNewer(a: SyncRecordMeta, b: SyncRecordMeta): boolean {
  if (a.t !== b.t) return a.t > b.t
  if (a.d !== b.d) return a.d > b.d
  // Mesmo aparelho e mesmo horário: prefere a exclusão (determinístico).
  return Boolean(a.x) && !b.x
}

export function mergeSnapshots(local: SyncSnapshot, remote: SyncSnapshot): SyncMergeResult {
  const collections: Record<string, SyncCollectionSnapshot> = {}
  const stats: Record<string, SyncCollectionStats> = {}
  let changed = false

  const names = new Set([
    ...Object.keys(local.collections),
    ...Object.keys(remote.collections),
  ])

  for (const name of names) {
    const mine = local.collections[name] ?? { records: {}, meta: {} }
    const theirs = remote.collections[name] ?? { records: {}, meta: {} }

    const records: Record<string, unknown> = {}
    const meta: Record<string, SyncRecordMeta> = {}
    const counts: SyncCollectionStats = { added: 0, updated: 0, deleted: 0 }

    // Ordem: primeiro a ordem local, depois os registros novos do outro lado.
    const ids = new Set([...Object.keys(mine.meta), ...Object.keys(theirs.meta)])

    for (const id of ids) {
      const a = mine.meta[id]
      const b = theirs.meta[id]

      const useRemote = b !== undefined && (a === undefined || isNewer(b, a))
      const winner = useRemote ? b : a
      const source = useRemote ? theirs : mine

      meta[id] = winner

      if (!winner.x && Object.prototype.hasOwnProperty.call(source.records, id)) {
        records[id] = source.records[id]
      }

      if (!useRemote) continue

      // Contabiliza o efeito da versão remota neste aparelho.
      const existedHere = a !== undefined && !a.x
      const existsAfter = !winner.x

      if (!existedHere && existsAfter) {
        counts.added++
        changed = true
      } else if (existedHere && !existsAfter) {
        counts.deleted++
        changed = true
      } else if (existedHere && existsAfter && a.h !== winner.h) {
        counts.updated++
        changed = true
      }
    }

    collections[name] = { records, meta }
    stats[name] = counts
  }

  return {
    snapshot: {
      format: 'personal-finance-sync',
      version: 1,
      deviceId: local.deviceId,
      clock: Math.max(local.clock, remote.clock),
      collections,
    },
    stats,
    changed,
  }
}
