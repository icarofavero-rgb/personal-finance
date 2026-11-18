/**
 * Controle do tutorial de boas-vindas (por aparelho, não é sincronizado).
 */

const STORAGE_KEY = 'personal-finance-onboarding-v1'

/** Evento para reabrir o tutorial (ex.: pelo botão nas Configurações). */
export const OPEN_TUTORIAL_EVENT = 'personal-finance-open-tutorial'

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    // Sem acesso ao armazenamento: não insiste em mostrar o tutorial.
    return true
  }
}

/** Avisado quando o tutorial termina (o app pede a permissão de notificações). */
export const ONBOARDING_FINISHED_EVENT = 'personal-finance-onboarding-finished'

export function markOnboardingCompleted(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedAt: new Date().toISOString() })
    )
  } catch {
    // Sem problema: apenas mostrará o tutorial de novo na próxima vez.
  }

  window.dispatchEvent(new Event(ONBOARDING_FINISHED_EVENT))
}

export function requestOpenTutorial(): void {
  window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT))
}
