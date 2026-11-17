
const PROFILE_STORAGE_PREFIX = 'personal-finance-profile'

export type ProfileDataArea =
  | 'transactions'
  | 'cards'
  | 'card-purchases'
  | 'card-payments'
  | 'debtors'
  | 'goals'
  | 'budgets'
  | 'manual-forecast'

export function getFinancialProfileStorageKey(
  profileId: string,
  area: ProfileDataArea
): string {
  if (!profileId || !profileId.trim()) {
    throw new Error('Identificador do perfil inválido.')
  }

  return `${PROFILE_STORAGE_PREFIX}:${encodeURIComponent(profileId)}:${area}:v1`
}
