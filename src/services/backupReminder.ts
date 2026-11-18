/**
 * Lembrete de backup: como os dados ficam só no aparelho, o app avisa
 * quando faz muito tempo desde o último backup. Informação deste aparelho
 * (não vai para a sincronização).
 */

const KEY = 'personal-finance-backup-reminder-v1'
export const BACKUP_REMINDER_DAYS = 7
const SNOOZE_DAYS = 3
const DAY = 24 * 60 * 60 * 1000

type State = { lastBackupAt?: string; snoozedUntil?: string }

function read(): State {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function write(state: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // sem espaço: o lembrete só aparece de novo
  }
}

export function markBackupDone(now = new Date()): void {
  write({ lastBackupAt: now.toISOString() })
}

export function snoozeBackupReminder(now = new Date()): void {
  write({ ...read(), snoozedUntil: new Date(now.getTime() + SNOOZE_DAYS * DAY).toISOString() })
}

/**
 * Diz se o lembrete deve aparecer e há quantos dias foi o último backup
 * (`null` = nunca fez backup neste aparelho).
 */
export function getBackupReminder(hasData: boolean, now = new Date()): { show: boolean; days: number | null } {
  const state = read()
  const last = state.lastBackupAt ? new Date(state.lastBackupAt) : null
  const days = last && !Number.isNaN(last.getTime()) ? Math.floor((now.getTime() - last.getTime()) / DAY) : null

  if (!hasData) return { show: false, days }
  if (state.snoozedUntil && new Date(state.snoozedUntil) > now) return { show: false, days }

  return { show: days === null || days >= BACKUP_REMINDER_DAYS, days }
}
