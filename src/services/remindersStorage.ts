/**
 * Lembretes do Calendário (boletos, contas e outros compromissos).
 *
 * Um lembrete pode acontecer uma vez ou todo mês no mesmo dia. Quando o
 * dia não existe no mês (ex.: 31 em fevereiro), usa o último dia do mês.
 * Cada ocorrência pode ser marcada como "feita" individualmente.
 */

export type ReminderKind = 'boleto' | 'conta' | 'outro'
export type ReminderRecurrence = 'none' | 'monthly'

export type Reminder = {
  id: string
  title: string
  kind: ReminderKind
  /** Primeira (ou única) data, AAAA-MM-DD */
  date: string
  amountCents?: number
  recurrence: ReminderRecurrence
  notes?: string
  /** Datas das ocorrências já concluídas */
  doneDates: string[]
  createdAt: string
}

export type ReminderOccurrence = {
  reminder: Reminder
  date: string
  done: boolean
}

const STORAGE_KEY = 'personal-finance-reminders-v1'

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  boleto: 'Boleto',
  conta: 'Conta',
  outro: 'Lembrete',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}

function isValidReminder(value: unknown): value is Reminder {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    typeof value.title === 'string' &&
    value.title.trim() !== '' &&
    value.title.length <= 80 &&
    (value.kind === 'boleto' || value.kind === 'conta' || value.kind === 'outro') &&
    isValidDateKey(value.date) &&
    (value.amountCents === undefined ||
      (typeof value.amountCents === 'number' &&
        Number.isSafeInteger(value.amountCents) &&
        value.amountCents > 0)) &&
    (value.recurrence === 'none' || value.recurrence === 'monthly') &&
    (value.notes === undefined || (typeof value.notes === 'string' && value.notes.length <= 300)) &&
    Array.isArray(value.doneDates) &&
    value.doneDates.every(isValidDateKey) &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt))
  )
}

/** Valida uma lista de lembretes (usado também pelo backup). */
export function validateRemindersData(data: unknown): Reminder[] {
  if (!Array.isArray(data) || !data.every(isValidReminder)) {
    throw new Error('Os lembretes do Calendário são inválidos.')
  }

  const ids = data.map(item => item.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error('Existem lembretes duplicados.')
  }

  return data
}

export function getReminders(): Reminder[] {
  const saved = localStorage.getItem(STORAGE_KEY)

  if (saved === null) return []

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Não foi possível ler os lembretes. Os dados originais foram preservados.')
  }

  return validateRemindersData(parsed)
}

function saveReminders(reminders: Reminder[]): void {
  validateRemindersData(reminders)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
}

export type ReminderInput = Pick<Reminder, 'title' | 'kind' | 'date' | 'amountCents' | 'recurrence' | 'notes'>

function normalize(input: ReminderInput): ReminderInput {
  return {
    ...input,
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    amountCents: input.amountCents && input.amountCents > 0 ? input.amountCents : undefined,
  }
}

export function addReminder(input: ReminderInput): Reminder {
  const reminder: Reminder = {
    ...normalize(input),
    id: crypto.randomUUID(),
    doneDates: [],
    createdAt: new Date().toISOString(),
  }

  if (!isValidReminder(reminder)) {
    throw new Error('Confira o título, a data e o valor do lembrete.')
  }

  saveReminders([...getReminders(), reminder])
  return reminder
}

export function updateReminder(id: string, input: ReminderInput): void {
  const reminders = getReminders()
  const current = reminders.find(item => item.id === id)

  if (!current) throw new Error('Lembrete não encontrado.')

  const updated: Reminder = { ...current, ...normalize(input) }

  if (!isValidReminder(updated)) {
    throw new Error('Confira o título, a data e o valor do lembrete.')
  }

  saveReminders(reminders.map(item => (item.id === id ? updated : item)))
}

export function deleteReminder(id: string): void {
  const reminders = getReminders()
  const next = reminders.filter(item => item.id !== id)

  if (next.length === reminders.length) throw new Error('Lembrete não encontrado.')

  saveReminders(next)
}

/** Marca ou desmarca uma ocorrência como concluída. */
export function toggleReminderDone(id: string, occurrenceDate: string): void {
  if (!isValidDateKey(occurrenceDate)) throw new Error('Data inválida.')

  const reminders = getReminders()
  const current = reminders.find(item => item.id === id)

  if (!current) throw new Error('Lembrete não encontrado.')

  const done = current.doneDates.includes(occurrenceDate)
  const doneDates = done
    ? current.doneDates.filter(date => date !== occurrenceDate)
    : [...current.doneDates, occurrenceDate].sort()

  saveReminders(reminders.map(item => (item.id === id ? { ...item, doneDates } : item)))
}

// ---------- Ocorrências ----------

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Data da ocorrência mensal no mês informado (ajusta dias 29–31). */
export function monthlyOccurrence(startDate: string, year: number, month: number): string {
  const day = Number(startDate.slice(8, 10))
  const validDay = Math.min(day, daysInMonth(year, month))

  return `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
}

/** Todas as ocorrências entre `from` e `to` (inclusive), em ordem. */
export function getReminderOccurrences(
  reminders: Reminder[],
  from: string,
  to: string
): ReminderOccurrence[] {
  const result: ReminderOccurrence[] = []

  for (const reminder of reminders) {
    if (reminder.recurrence === 'none') {
      if (reminder.date >= from && reminder.date <= to) {
        result.push({ reminder, date: reminder.date, done: reminder.doneDates.includes(reminder.date) })
      }
      continue
    }

    let year = Number(from.slice(0, 4))
    let month = Number(from.slice(5, 7))
    const endKey = to.slice(0, 7)

    while (`${year}-${String(month).padStart(2, '0')}` <= endKey) {
      const date = monthlyOccurrence(reminder.date, year, month)

      if (date >= reminder.date && date >= from && date <= to) {
        result.push({ reminder, date, done: reminder.doneDates.includes(date) })
      }

      month++
      if (month > 12) {
        month = 1
        year++
      }
    }
  }

  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.reminder.title.localeCompare(b.reminder.title, 'pt-BR')
  )
}
