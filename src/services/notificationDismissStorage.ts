/**
 * Excluir avisos do sininho e limpá-los sozinho depois de um tempo.
 *
 * Os avisos são calculados a partir dos registros (faturas, boletos,
 * lembretes). "Excluir" guarda o id do aviso para ele não aparecer mais.
 * A limpeza automática esconde os avisos JÁ LIDOS cuja data passou há mais
 * de N dias (N escolhido em Configurações → Notificações; 0 = nunca).
 * Avisos não lidos nunca somem sozinhos: uma fatura vencida e não paga
 * continua avisando.
 */

const DISMISSED_KEY = 'personal-finance-notification-dismissed-v1'
const AUTO_CLEAN_KEY = 'personal-finance-notification-autoclean-v1'

export const AUTO_CLEAN_OPTIONS = [
  { days: 0, label: 'Nunca' },
  { days: 3, label: '3 dias' },
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
] as const

type Dismissed = Record<string, string>

function readDismissed(): Dismissed {
  try {
    const data = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}') as unknown
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Dismissed) : {}
  } catch {
    return {}
  }
}

function saveDismissed(data: Dismissed) {
  // Guarda só os últimos 90 dias (os avisos antigos já não voltam mesmo)
  const limit = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const kept = Object.fromEntries(Object.entries(data).filter(([, at]) => at >= limit))
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(kept))
}

export function dismissNotifications(ids: string[]): void {
  const data = readDismissed()
  const now = new Date().toISOString()
  for (const id of ids) data[id] = now
  saveDismissed(data)
}

export function getAutoCleanDays(): number {
  const value = Number(localStorage.getItem(AUTO_CLEAN_KEY) ?? 7)
  return AUTO_CLEAN_OPTIONS.some(option => option.days === value) ? value : 7
}

export function setAutoCleanDays(days: number): void {
  localStorage.setItem(AUTO_CLEAN_KEY, String(days))
}

/** Tira da lista os avisos excluídos e os antigos demais. */
export function filterVisibleNotifications<T extends { id: string; dueDate?: string; createdAt?: string }>(
  notifications: T[],
  today: string,
  readIds: Set<string> = new Set(),
  autoCleanDays = getAutoCleanDays()
): T[] {
  const dismissed = readDismissed()
  const limit = autoCleanDays > 0 ? new Date(new Date(`${today}T12:00:00`).getTime() - autoCleanDays * 86_400_000).toLocaleDateString('en-CA') : ''

  return notifications.filter(notification => {
    if (dismissed[notification.id]) return false
    const date = notification.dueDate ?? notification.createdAt ?? ''
    if (limit && readIds.has(notification.id) && date && date.slice(0, 10) < limit) return false
    return true
  })
}
