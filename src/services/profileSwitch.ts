import { setActiveFinancialProfile } from './financialProfilesStorage'

/** Pede para abrir Configurações → Perfis (o App escuta este evento). */
export const OPEN_PROFILES_SETTINGS_EVENT = 'personal-finance-open-profiles-settings'

export function requestOpenProfilesSettings(): void {
  window.dispatchEvent(new Event(OPEN_PROFILES_SETTINGS_EVENT))
}

/**
 * Abre outro perfil: grava a escolha e recarrega a tela, para todas as
 * páginas lerem os dados do novo perfil do zero (sem misturar nada).
 * A animação de entrada não é repetida nessa recarga.
 */
export function switchToProfile(profileId: string): void {
  setActiveFinancialProfile(profileId)
  reloadApp()
}

/** Recarrega a tela sem repetir a animação de entrada. */
export function reloadApp(): void {
  try {
    sessionStorage.setItem('pf-skip-splash', '1')
  } catch {
    // sem sessionStorage: a animação aparece, mas tudo funciona
  }

  window.location.reload()
}
