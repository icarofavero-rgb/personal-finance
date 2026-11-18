/**
 * Lista de perfis financeiros (Multiperfis).
 *
 * A lista é a mesma em todos os aparelhos (vai na sincronização e no
 * backup). Qual perfil está aberto (`activeProfileId`) é de cada aparelho.
 * Perfis excluídos ficam como "lápide" (`deleted`) para a exclusão também
 * chegar aos outros aparelhos.
 */

import {
  DEFAULT_PROFILE_ID,
  PROFILES_STORAGE_KEY,
  profileKeyPrefix,
  setActiveProfileInMemory,
} from './profileScope'

export { DEFAULT_PROFILE_ID }

export type FinancialProfile = {
  id: string
  name: string
  color: string
  icon: string
  createdAt: string
  /** última alteração (nome, cor, ícone ou exclusão) */
  updatedAt: string
  deleted?: true
}

export type FinancialProfilesState = {
  version: 1
  activeProfileId: string
  profiles: FinancialProfile[]
}

export const PROFILES_CHANGED_EVENT = 'personal-finance-profiles-changed'

export const PROFILE_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#22d3ee', '#a3e635']
export const PROFILE_ICONS = ['user', 'briefcase', 'house', 'heart', 'store', 'graduation-cap', 'baby', 'plane']

const EPOCH = '1970-01-01T00:00:00.000Z'

function defaultProfile(): FinancialProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Principal',
    color: '#38bdf8',
    icon: 'user',
    createdAt: EPOCH,
    updatedAt: EPOCH,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)

/** Lê um perfil, completando campos antigos. Retorna null se for inválido. */
export function normalizeProfile(value: unknown): FinancialProfile | null {
  if (!isRecord(value)) return null

  const { id, name, color, icon, createdAt, updatedAt, deleted } = value

  if (typeof id !== 'string' || !id.trim() || id.length > 80) return null
  if (typeof name !== 'string' || !name.trim()) return null

  const created = typeof createdAt === 'string' ? createdAt : EPOCH

  return {
    id,
    name: name.trim().slice(0, 40),
    color: isColor(color) ? color.toLowerCase() : '#38bdf8',
    icon: typeof icon === 'string' && icon ? icon : 'user',
    createdAt: created,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : created,
    ...(deleted === true && id !== DEFAULT_PROFILE_ID ? { deleted: true as const } : {}),
  }
}

/** Garante uma lista válida: sem repetidos e sempre com o perfil principal ativo. */
export function normalizeProfilesList(list: unknown): FinancialProfile[] {
  const profiles = new Map<string, FinancialProfile>()

  for (const item of Array.isArray(list) ? list : []) {
    const profile = normalizeProfile(item)
    if (profile && !profiles.has(profile.id)) profiles.set(profile.id, profile)
  }

  if (!profiles.has(DEFAULT_PROFILE_ID)) {
    profiles.set(DEFAULT_PROFILE_ID, defaultProfile())
  }

  return [profiles.get(DEFAULT_PROFILE_ID)!, ...[...profiles.values()].filter(item => item.id !== DEFAULT_PROFILE_ID)]
}

export function getFinancialProfilesState(): FinancialProfilesState {
  let parsed: unknown = null

  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }

  const data = isRecord(parsed) ? parsed : {}
  const profiles = normalizeProfilesList(data.profiles)
  const active = profiles.find(item => item.id === data.activeProfileId && !item.deleted)

  return {
    version: 1,
    activeProfileId: active?.id ?? DEFAULT_PROFILE_ID,
    profiles,
  }
}

function saveState(state: FinancialProfilesState): void {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(state))

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(PROFILES_CHANGED_EVENT))
  }
}

/** Perfis visíveis (sem os excluídos). */
export function getFinancialProfiles(): FinancialProfile[] {
  return getFinancialProfilesState().profiles.filter(item => !item.deleted)
}

export function getActiveFinancialProfile(): FinancialProfile {
  const state = getFinancialProfilesState()
  return state.profiles.find(item => item.id === state.activeProfileId) ?? defaultProfile()
}

function validateFields(name: string, color: string): string {
  const trimmed = name.trim()

  if (!trimmed) throw new Error('Informe um nome para o perfil.')
  if (trimmed.length > 40) throw new Error('Use um nome com até 40 letras.')
  if (!isColor(color)) throw new Error('Cor do perfil inválida.')

  return trimmed
}

export function createFinancialProfile(name: string, color = '#a78bfa', icon = 'briefcase'): FinancialProfile {
  const state = getFinancialProfilesState()
  const trimmed = validateFields(name, color)

  if (state.profiles.some(item => !item.deleted && item.name.toLocaleLowerCase('pt-BR') === trimmed.toLocaleLowerCase('pt-BR'))) {
    throw new Error('Já existe um perfil com esse nome.')
  }

  const now = new Date().toISOString()
  const profile: FinancialProfile = {
    id: crypto.randomUUID(),
    name: trimmed,
    color: color.toLowerCase(),
    icon,
    createdAt: now,
    updatedAt: now,
  }

  saveState({ ...state, profiles: [...state.profiles, profile] })
  return profile
}

export function updateFinancialProfile(
  id: string,
  changes: Partial<Pick<FinancialProfile, 'name' | 'color' | 'icon'>>
): FinancialProfile {
  const state = getFinancialProfilesState()
  const current = state.profiles.find(item => item.id === id && !item.deleted)

  if (!current) throw new Error('Perfil não encontrado.')

  const name = validateFields(changes.name ?? current.name, changes.color ?? current.color)

  if (
    state.profiles.some(
      item => item.id !== id && !item.deleted && item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')
    )
  ) {
    throw new Error('Já existe um perfil com esse nome.')
  }

  const updated: FinancialProfile = {
    ...current,
    name,
    color: (changes.color ?? current.color).toLowerCase(),
    icon: changes.icon ?? current.icon,
    updatedAt: new Date().toISOString(),
  }

  saveState({ ...state, profiles: state.profiles.map(item => (item.id === id ? updated : item)) })
  return updated
}

/** Apaga todos os dados guardados de um perfil (nunca do principal). */
export function removeProfileData(id: string): void {
  if (id === DEFAULT_PROFILE_ID) return

  const prefix = profileKeyPrefix(id)
  const keys: string[] = []

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) keys.push(key)
  }

  keys.forEach(key => localStorage.removeItem(key))
}

/** Exclui um perfil e os dados dele. O principal não pode ser excluído. */
export function deleteFinancialProfile(id: string): void {
  if (id === DEFAULT_PROFILE_ID) throw new Error('O perfil principal não pode ser excluído.')

  const state = getFinancialProfilesState()
  const current = state.profiles.find(item => item.id === id && !item.deleted)
  if (!current) throw new Error('Perfil não encontrado.')

  removeProfileData(id)

  saveState({
    ...state,
    activeProfileId: state.activeProfileId === id ? DEFAULT_PROFILE_ID : state.activeProfileId,
    profiles: state.profiles.map(item =>
      item.id === id ? { ...item, deleted: true, updatedAt: new Date().toISOString() } : item
    ),
  })
}

/** Marca o perfil como aberto neste aparelho (a tela é recarregada em seguida). */
export function setActiveFinancialProfile(id: string): void {
  const state = getFinancialProfilesState()

  if (!state.profiles.some(item => item.id === id && !item.deleted)) {
    throw new Error('Perfil não encontrado.')
  }

  saveState({ ...state, activeProfileId: id })
  setActiveProfileInMemory(id)
}

/**
 * Junta a lista de perfis de dois aparelhos (sincronização e backup):
 * cada perfil fica com a versão alterada por último; exclusões também valem.
 * Retorna a lista final e os perfis que acabaram de ser excluídos aqui.
 */
export function mergeProfilesLists(
  local: FinancialProfile[],
  remote: unknown
): { profiles: FinancialProfile[]; removed: string[] } {
  const merged = new Map(local.map(item => [item.id, item]))
  const removed: string[] = []

  for (const candidate of normalizeProfilesList(remote)) {
    const current = merged.get(candidate.id)

    if (!current) {
      merged.set(candidate.id, candidate)
      continue
    }

    if (candidate.updatedAt > current.updatedAt) {
      merged.set(candidate.id, candidate)
      if (candidate.deleted && !current.deleted) removed.push(candidate.id)
    }
  }

  return { profiles: normalizeProfilesList([...merged.values()]), removed }
}

/**
 * Restauração de backup: os perfis do backup voltam a existir aqui
 * (mesmo que tenham sido excluídos depois), com o nome/cor do backup.
 */
export function ensureProfilesFromBackup(list: unknown): void {
  const state = getFinancialProfilesState()
  const byId = new Map(state.profiles.map(item => [item.id, item]))
  const now = new Date().toISOString()
  let changed = false

  for (const profile of normalizeProfilesList(list)) {
    if (profile.deleted || profile.id === DEFAULT_PROFILE_ID) continue

    const current = byId.get(profile.id)
    if (current && !current.deleted) continue

    byId.set(profile.id, {
      id: profile.id,
      name: profile.name,
      color: profile.color,
      icon: profile.icon,
      createdAt: profile.createdAt,
      updatedAt: now,
    })
    changed = true
  }

  if (changed) saveState({ ...state, profiles: normalizeProfilesList([...byId.values()]) })
}

/** Grava a lista juntada, apagando os dados dos perfis excluídos. */
export function applyMergedProfiles(remote: unknown): { removed: string[]; activeChanged: boolean; changed: boolean } {
  const state = getFinancialProfilesState()
  const { profiles, removed } = mergeProfilesLists(state.profiles, remote)

  removed.forEach(removeProfileData)

  const activeStillExists = profiles.some(item => item.id === state.activeProfileId && !item.deleted)
  const activeProfileId = activeStillExists ? state.activeProfileId : DEFAULT_PROFILE_ID

  // Só grava se algo mudou (uma junção recusada não deixa rastro).
  const next: FinancialProfilesState = { version: 1, activeProfileId, profiles }
  let changed = false
  if (JSON.stringify(next) !== localStorage.getItem(PROFILES_STORAGE_KEY) && (
    removed.length > 0 ||
    !activeStillExists ||
    JSON.stringify(profiles) !== JSON.stringify(state.profiles)
  )) {
    saveState(next)
    changed = true
  }

  if (!activeStillExists) setActiveProfileInMemory(DEFAULT_PROFILE_ID)

  return { removed, activeChanged: !activeStillExists, changed }
}
