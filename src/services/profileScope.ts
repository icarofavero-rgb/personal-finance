/**
 * MULTIPERFIS — separa os dados financeiros de cada perfil.
 *
 * O app inteiro continua lendo e gravando nas chaves de sempre
 * (ex.: "personal-finance-transactions"). Este módulo fica no meio do
 * caminho e manda cada leitura/gravação para o espaço do perfil:
 *
 *  - Perfil principal ("default"): usa as próprias chaves de sempre.
 *    Nada muda para quem já tinha dados (sem migração).
 *  - Outros perfis: "personal-finance-p:<id>:<chave>".
 *
 * Preferências do aparelho (aparência, layout, nome/foto do usuário...)
 * continuam únicas, compartilhadas por todos os perfis.
 *
 * Sincronização e backup trabalham um perfil de cada vez com
 * `withProfileView`, que troca o perfil "visto" só durante a operação.
 */

export const DEFAULT_PROFILE_ID = 'default'
export const PROFILES_STORAGE_KEY = 'personal-finance-profiles-v1'
const PHYSICAL_PREFIX = 'personal-finance-p:'

/** Chaves que pertencem a cada perfil (dados financeiros e seus controles). */
export const PROFILE_SCOPED_KEYS: ReadonlySet<string> = new Set([
  'personal-finance-transactions',
  'personal-finance-credit-cards',
  'personal-finance-card-purchases',
  'personal-finance-card-payments',
  'personal-finance-debtors-v1',
  'personal-finance-goals',
  'personal-finance-goals-before-restore',
  'personal-finance-budgets-v1',
  'personal-finance-manual-forecasts',
  'personal-finance-savings-v1',
  'personal-finance-reminders-v1',
  'personal-finance-recurring-v1',
  'personal-finance-notification-read-v1',
  'personal-finance-notification-history-v1',
  'personal-finance-notification-history-v1-lock',
  'personal-finance-pending-payment',
  'personal-finance-pending-backup-snapshot',
  'personal-finance-pending-backup-restore',
  // Cada perfil tem o seu próprio diário de sincronização
  'personal-finance-sync-meta-v1',
])

let activeProfileId = DEFAULT_PROFILE_ID
let viewProfileId: string | null = null

/** Perfil cujos dados o app está vendo agora. */
export function getViewProfileId(): string {
  return viewProfileId ?? activeProfileId
}

export function getActiveProfileId(): string {
  return activeProfileId
}

/** Chave real no armazenamento para uma chave do app, no perfil indicado. */
export function physicalKey(key: string, profileId = getViewProfileId()): string {
  if (profileId === DEFAULT_PROFILE_ID || !PROFILE_SCOPED_KEYS.has(key)) return key
  return `${PHYSICAL_PREFIX}${profileId}:${key}`
}

/** Prefixo das chaves reais de um perfil (para apagar um perfil inteiro). */
export function profileKeyPrefix(profileId: string): string {
  return `${PHYSICAL_PREFIX}${profileId}:`
}

/**
 * Executa `fn` como se o perfil `profileId` estivesse ativo.
 * Só para operações síncronas (sincronização, backup).
 */
export function withProfileView<T>(profileId: string, fn: () => T): T {
  const previous = viewProfileId
  viewProfileId = profileId

  try {
    return fn()
  } finally {
    viewProfileId = previous
  }
}

function readActiveFromStorage(get: (key: string) => string | null): string {
  try {
    const raw = get(PROFILES_STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE_ID

    const parsed = JSON.parse(raw) as { activeProfileId?: unknown; profiles?: unknown }
    const id = parsed.activeProfileId

    if (
      typeof id === 'string' &&
      Array.isArray(parsed.profiles) &&
      parsed.profiles.some(
        item =>
          typeof item === 'object' &&
          item !== null &&
          (item as { id?: unknown }).id === id &&
          !(item as { deleted?: unknown }).deleted
      )
    ) {
      return id
    }
  } catch {
    // Lista ilegível: usa o perfil principal (os dados dele nunca somem).
  }

  return DEFAULT_PROFILE_ID
}

let installed = false

/**
 * Liga o redirecionamento. Deve ser chamado ANTES do rastreador de
 * alterações da sincronização (ele precisa "ver" as chaves do app).
 */
export function installProfileScope(): void {
  if (installed || typeof Storage === 'undefined' || typeof localStorage === 'undefined') return
  installed = true

  const prototype = Storage.prototype
  const originalGet = prototype.getItem
  const originalSet = prototype.setItem
  const originalRemove = prototype.removeItem

  activeProfileId = readActiveFromStorage(key => originalGet.call(localStorage, key))

  prototype.getItem = function getItem(this: Storage, key: string) {
    return originalGet.call(this, this === localStorage ? physicalKey(String(key)) : key)
  }

  prototype.setItem = function setItem(this: Storage, key: string, value: string) {
    originalSet.call(this, this === localStorage ? physicalKey(String(key)) : key, value)
  }

  prototype.removeItem = function removeItem(this: Storage, key: string) {
    originalRemove.call(this, this === localStorage ? physicalKey(String(key)) : key)
  }
}

/** Atualiza o perfil ativo em memória (a tela é recarregada logo depois). */
export function setActiveProfileInMemory(profileId: string): void {
  activeProfileId = profileId
}
