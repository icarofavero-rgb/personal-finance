
export type FinancialProfile = {
  id: string
  name: string
  color: string
  icon: string
  createdAt: string
}

type FinancialProfilesState = {
  version: 1
  activeProfileId: string
  profiles: FinancialProfile[]
}

const STORAGE_KEY = 'personal-finance-profiles-v1'

const DEFAULT_PROFILE_ID = 'default'

function createDefaultState(): FinancialProfilesState {
  return {
    version: 1,
    activeProfileId: DEFAULT_PROFILE_ID,
    profiles: [
      {
        id: DEFAULT_PROFILE_ID,
        name: 'Pessoal',
        color: '#38BDF8',
        icon: 'user',
        createdAt: new Date().toISOString(),
      },
    ],
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isValidState(
  value: unknown
): value is FinancialProfilesState {
  if (!isRecord(value)) return false

  if (
    value.version !== 1 ||
    typeof value.activeProfileId !== 'string' ||
    !Array.isArray(value.profiles) ||
    value.profiles.length === 0
  ) {
    return false
  }

  const profiles = value.profiles

  if (
    !profiles.every(
      profile =>
        isRecord(profile) &&
        typeof profile.id === 'string' &&
        profile.id.trim().length > 0 &&
        typeof profile.name === 'string' &&
        profile.name.trim().length > 0 &&
        typeof profile.color === 'string' &&
        /^#[0-9a-fA-F]{6}$/.test(profile.color) &&
        typeof profile.icon === 'string' &&
        typeof profile.createdAt === 'string'
    )
  ) {
    return false
  }

  const ids = profiles.map(profile => profile.id)

  return (
    new Set(ids).size === ids.length &&
    ids.includes(value.activeProfileId) &&
    ids.includes(DEFAULT_PROFILE_ID)
  )
}

export function getFinancialProfilesState():
  FinancialProfilesState {
  const saved = localStorage.getItem(STORAGE_KEY)

  if (saved === null) {
    return createDefaultState()
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      'Não foi possível ler os perfis financeiros. Nenhum dado foi alterado.'
    )
  }

  if (!isValidState(parsed)) {
    throw new Error(
      'Estrutura dos perfis financeiros inválida. Nenhum dado foi alterado.'
    )
  }

  return parsed
}

function saveState(
  state: FinancialProfilesState
): void {
  if (!isValidState(state)) {
    throw new Error('Estado dos perfis inválido.')
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  )
}

export function initializeFinancialProfiles(): void {
  const existing = localStorage.getItem(STORAGE_KEY)

  if (existing !== null) {
    getFinancialProfilesState()
    return
  }

  saveState(createDefaultState())
}

export function getFinancialProfiles():
  FinancialProfile[] {
  return getFinancialProfilesState().profiles
}

export function getActiveFinancialProfile():
  FinancialProfile {
  const state = getFinancialProfilesState()

  const profile = state.profiles.find(
    item => item.id === state.activeProfileId
  )

  if (!profile) {
    throw new Error('Perfil ativo não encontrado.')
  }

  return profile
}

export function createFinancialProfile(
  name: string,
  color = '#A78BFA',
  icon = 'wallet'
): FinancialProfile {
  const state = getFinancialProfilesState()

  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Informe um nome para o perfil.')
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error('Cor do perfil inválida.')
  }

  const profile: FinancialProfile = {
    id: crypto.randomUUID(),
    name: trimmedName,
    color,
    icon,
    createdAt: new Date().toISOString(),
  }

  saveState({
    ...state,
    profiles: [...state.profiles, profile],
  })

  return profile
}
