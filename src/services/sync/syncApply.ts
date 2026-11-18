/**
 * Aplica, com segurança, os dados recebidos de outro aparelho.
 *
 * Etapas:
 *  1. confere o pacote recebido;
 *  2. junta com os dados deste aparelho (vence a alteração mais recente);
 *  3. valida o resultado com a MESMA auditoria do backup;
 *  4. grava os dados financeiros pelo executor do backup (que guarda uma
 *     cópia dos dados atuais e recupera tudo sozinho se algo falhar);
 *  5. grava Metas/Orçamentos/Previsões/preferências;
 *  6. atualiza o diário de sincronização.
 *
 * Se qualquer etapa antes da gravação falhar, nada é alterado.
 */

import type { BackupRestorePlan } from '../backupRestorePlan'
import { executeBackupRestore } from '../backupRestoreExecutor'
import { safelyAuditBackupRestore } from '../backupRestoreSafeAudit'
import { checkBackupRestoreSafety } from '../backupRestoreSafety'
import {
  restoreBackupModules,
  validateBackupModules,
  type BackupModulesData,
} from '../backupModules'
import { writeSyncMeta, type SyncMeta, type SyncRecordMeta } from './changeTracker'
import {
  mergeSnapshots,
  type SyncCollectionStats,
  type SyncSnapshot,
} from './syncMerge'
import { getSyncCollections } from './syncCollections'
import { buildLocalSnapshot, snapshotToStorageValues } from './syncSnapshot'
import { DEFAULT_PROFILE_ID, withProfileView } from '../profileScope'
import {
  applyMergedProfiles,
  getFinancialProfiles,
  getFinancialProfilesState,
  type FinancialProfile,
} from '../financialProfilesStorage'

const CORE_KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  debtors: 'personal-finance-debtors-v1',
} as const

const CORE_KEY_SET = new Set<string>(Object.values(CORE_KEYS))

export type SyncApplyResult = {
  changed: boolean
  stats: Record<string, SyncCollectionStats>
  /** Resumo legível do que mudou neste aparelho */
  summary: string[]
}

const COLLECTION_LABELS: Record<string, string> = {
  transactions: 'transações',
  cards: 'cartões',
  cardPurchases: 'compras no cartão',
  cardPayments: 'pagamentos de fatura',
  debtors: 'devedores',
  debts: 'dívidas',
  debtorPayments: 'recebimentos',
  goals: 'metas',
  budgets: 'orçamentos',
  manualForecasts: 'previsões',
  savings: 'movimentações do Guardado',
  reminders: 'lembretes',
  recurring: 'transações recorrentes',
  userPreferences: 'perfil',
  appearance: 'aparência',
  notificationPreferences: 'notificações',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidRecordMeta(value: unknown): value is SyncRecordMeta {
  return (
    isRecord(value) &&
    typeof value.h === 'string' &&
    typeof value.t === 'number' &&
    Number.isFinite(value.t) &&
    value.t >= 0 &&
    typeof value.d === 'string' &&
    value.d !== '' &&
    (value.x === undefined || value.x === true)
  )
}

/** Confere se um pacote recebido tem o formato esperado. */
export function parseSyncSnapshot(value: unknown): SyncSnapshot {
  const invalid = new Error('Os dados recebidos não são um pacote de sincronização válido.')

  if (
    !isRecord(value) ||
    value.format !== 'personal-finance-sync' ||
    value.version !== 1 ||
    typeof value.deviceId !== 'string' ||
    value.deviceId === '' ||
    typeof value.clock !== 'number' ||
    !Number.isFinite(value.clock) ||
    !isRecord(value.collections)
  ) {
    throw invalid
  }

  const known = new Set(getSyncCollections().map(item => item.name))

  for (const [name, data] of Object.entries(value.collections)) {
    if (!known.has(name) || !isRecord(data) || !isRecord(data.records) || !isRecord(data.meta)) {
      throw invalid
    }

    for (const [id, entry] of Object.entries(data.meta)) {
      if (!isValidRecordMeta(entry)) throw invalid

      const hasRecord = Object.prototype.hasOwnProperty.call(data.records, id)
      if (entry.x ? hasRecord : !hasRecord) throw invalid
    }

    for (const id of Object.keys(data.records)) {
      if (!Object.prototype.hasOwnProperty.call(data.meta, id)) throw invalid
    }
  }

  return value as SyncSnapshot
}

function readJson(key: string, values: Map<string, string>): unknown {
  const raw = values.get(key) ?? localStorage.getItem(key)
  return raw === null ? null : JSON.parse(raw)
}

function readList(key: string, values: Map<string, string>): unknown[] {
  const value = readJson(key, values)
  return Array.isArray(value) ? value : []
}

function buildCorePlan(values: Map<string, string>): BackupRestorePlan {
  const debtors = readJson(CORE_KEYS.debtors, values)
  const debtorsObject = isRecord(debtors) ? debtors : {}

  return {
    version: 5,
    transactions: readList(CORE_KEYS.transactions, values),
    cards: readList(CORE_KEYS.cards, values),
    purchases: readList(CORE_KEYS.purchases, values),
    payments: readList(CORE_KEYS.payments, values),
    debtorsData: {
      debtors: Array.isArray(debtorsObject.debtors) ? debtorsObject.debtors : [],
      debts: Array.isArray(debtorsObject.debts) ? debtorsObject.debts : [],
      payments: Array.isArray(debtorsObject.payments) ? debtorsObject.payments : [],
    },
  } as BackupRestorePlan
}

function describe(stats: Record<string, SyncCollectionStats>): string[] {
  const lines: string[] = []

  for (const [name, counts] of Object.entries(stats)) {
    const parts: string[] = []
    if (counts.added) parts.push(`${counts.added} novo(s)`)
    if (counts.updated) parts.push(`${counts.updated} atualizado(s)`)
    if (counts.deleted) parts.push(`${counts.deleted} excluído(s)`)

    if (parts.length > 0) {
      lines.push(`${COLLECTION_LABELS[name] ?? name}: ${parts.join(', ')}`)
    }
  }

  return lines
}

/** Monta o pacote de UM perfil (o que está sendo visto). */
function createProfileSyncPackage(): SyncSnapshot {
  const safety = checkBackupRestoreSafety()

  if (!safety.safe) {
    throw new Error(safety.message)
  }

  return buildLocalSnapshot()
}

/**
 * Junta o pacote de UM perfil com os dados deste aparelho e grava o resultado.
 */
function applyProfileSyncPackage(received: unknown): SyncApplyResult {
  const remote = parseSyncSnapshot(received)

  const safety = checkBackupRestoreSafety()
  if (!safety.safe) throw new Error(safety.message)

  if (localStorage.getItem('personal-finance-pending-payment') !== null) {
    throw new Error(
      'Existe um pagamento de fatura pendente. ' +
      'Resolva-o antes de sincronizar.'
    )
  }

  const local = buildLocalSnapshot()

  if (remote.deviceId === local.deviceId) {
    throw new Error('Este pacote foi gerado por este mesmo aparelho.')
  }

  const merge = mergeSnapshots(local, remote)
  const { values, meta } = snapshotToStorageValues(merge.snapshot)

  // --- Validação completa ANTES de gravar qualquer coisa ---

  const coreChanged = [...values.keys()].some(key => CORE_KEY_SET.has(key))
  const plan = buildCorePlan(values)

  if (coreChanged) {
    const audit = safelyAuditBackupRestore(plan)

    if (!audit.valid) {
      throw new Error(
        'A junção dos dois aparelhos gerou dados inconsistentes, por isso ' +
        'nada foi alterado. Detalhe: ' + (audit.errors.join(' ') || 'dados inválidos.')
      )
    }
  }

  const moduleEntries: BackupModulesData = {}

  for (const [key, raw] of values) {
    if (!CORE_KEY_SET.has(key)) moduleEntries[key] = JSON.parse(raw)
  }

  const modules =
    Object.keys(moduleEntries).length > 0
      ? validateBackupModules(moduleEntries)
      : null

  // --- Gravação ---

  if (coreChanged) {
    // Guarda cópia dos dados atuais e recupera sozinho em caso de falha.
    executeBackupRestore(plan)
  }

  if (modules !== null) {
    try {
      restoreBackupModules(modules)
    } catch (error) {
      // Os dados financeiros já foram gravados: registra só a parte deles
      // no diário, mantendo o diário local para os módulos não gravados.
      writeSyncMeta(keepLocalMetaForModules(meta, local))
      throw error
    }
  }

  writeSyncMeta(meta)

  return {
    changed: merge.changed,
    stats: merge.stats,
    summary: describe(merge.stats),
  }
}

function keepLocalMetaForModules(merged: SyncMeta, local: SyncSnapshot): SyncMeta {
  const collections = { ...merged.collections }

  for (const collection of getSyncCollections()) {
    if (!CORE_KEY_SET.has(collection.storageKey)) {
      collections[collection.name] = { ...(local.collections[collection.name]?.meta ?? {}) }
    }
  }

  return { ...merged, collections }
}

// =========================================================
// MULTIPERFIS: um pacote com todos os perfis
// =========================================================

export type MultiProfileSyncPackage = {
  format: 'personal-finance-sync-profiles'
  version: 1
  profiles: FinancialProfile[]
  packages: Record<string, SyncSnapshot>
}

/**
 * Monta o pacote deste aparelho com TODOS os perfis: a lista de perfis
 * e, para cada um, os dados e o diário de sincronização dele.
 */
export function createLocalSyncPackage(): MultiProfileSyncPackage {
  const packages: Record<string, SyncSnapshot> = {}

  for (const profile of getFinancialProfiles()) {
    try {
      packages[profile.id] = withProfileView(profile.id, createProfileSyncPackage)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido'
      throw new Error(`Perfil "${profile.name}": ${reason}`)
    }
  }

  return {
    format: 'personal-finance-sync-profiles',
    version: 1,
    profiles: getFinancialProfilesState().profiles,
    packages,
  }
}

function parseMultiPackage(value: unknown): MultiProfileSyncPackage {
  // Pacote de uma versão anterior do app (sem perfis): vale para o principal.
  if (isRecord(value) && value.format === 'personal-finance-sync') {
    return {
      format: 'personal-finance-sync-profiles',
      version: 1,
      profiles: [],
      packages: { [DEFAULT_PROFILE_ID]: value as SyncSnapshot },
    }
  }

  if (
    !isRecord(value) ||
    value.format !== 'personal-finance-sync-profiles' ||
    value.version !== 1 ||
    !Array.isArray(value.profiles) ||
    !isRecord(value.packages)
  ) {
    throw new Error('Os dados recebidos não são um pacote de sincronização válido.')
  }

  return value as unknown as MultiProfileSyncPackage
}

/**
 * Recebe o pacote do outro aparelho: primeiro junta a lista de perfis
 * (perfis novos passam a existir aqui), depois junta os dados de cada
 * perfil separadamente, cada um com toda a proteção de antes.
 */
export function applyRemoteSyncPackage(received: unknown): SyncApplyResult {
  const remote = parseMultiPackage(received)

  // Confere todos os pacotes antes de mudar qualquer coisa.
  for (const [profileId, data] of Object.entries(remote.packages)) {
    withProfileView(profileId, () => parseSyncSnapshot(data))
  }

  const merged = applyMergedProfiles(remote.profiles)

  const profiles = getFinancialProfiles()
  const many = profiles.length > 1
  const result: SyncApplyResult = {
    changed: merged.changed,
    stats: {},
    summary: merged.changed ? ['Lista de perfis atualizada'] : [],
  }

  // O principal primeiro (leva as preferências), depois os outros.
  for (const profile of profiles) {
    const data = remote.packages[profile.id]
    if (!data) continue

    let partial: SyncApplyResult

    try {
      partial = withProfileView(profile.id, () => applyProfileSyncPackage(data))
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido'
      throw new Error(many ? `Perfil "${profile.name}": ${reason}` : reason)
    }

    result.changed ||= partial.changed

    for (const [name, counts] of Object.entries(partial.stats)) {
      const total = (result.stats[name] ??= { added: 0, updated: 0, deleted: 0 })
      total.added += counts.added
      total.updated += counts.updated
      total.deleted += counts.deleted
    }

    result.summary.push(...(many ? partial.summary.map(line => `${profile.name} — ${line}`) : partial.summary))
  }

  return result
}
