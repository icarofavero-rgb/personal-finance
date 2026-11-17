
export type NotificationPreferences = {
  enabled: boolean
  cardInvoices: boolean
  paymentReminders: boolean
  financialGoals: boolean
  daysBeforeDue: number
}

const STORAGE_KEY =
  'personal-finance-notification-preferences-v1'

export const DEFAULT_NOTIFICATION_PREFERENCES:
  NotificationPreferences = {
    enabled: true,
    cardInvoices: true,
    paymentReminders: true,
    financialGoals: true,
    daysBeforeDue: 3,
  }

const VALID_DAYS = [1, 3, 5, 7] as const

export function getNotificationPreferences():
  NotificationPreferences {
  const saved = localStorage.getItem(STORAGE_KEY)

  if (saved === null) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error(
      'Não foi possível ler as preferências de notificações. ' +
      'Nenhum dado foi alterado.'
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      'Estrutura de notificações inválida.'
    )
  }

  const data = parsed as Record<string, unknown>

  const booleanKeys = [
    'enabled',
    'cardInvoices',
    'paymentReminders',
    'financialGoals',
  ] as const

  for (const key of booleanKeys) {
    if (typeof data[key] !== 'boolean') {
      throw new Error(
        `Preferência de notificação inválida: ${key}.`
      )
    }
  }

  if (
    typeof data.daysBeforeDue !== 'number' ||
    !VALID_DAYS.includes(
      data.daysBeforeDue as (typeof VALID_DAYS)[number]
    )
  ) {
    throw new Error(
      'Prazo de antecedência das notificações inválido.'
    )
  }

  return {
    enabled: data.enabled as boolean,
    cardInvoices: data.cardInvoices as boolean,
    paymentReminders: data.paymentReminders as boolean,
    financialGoals: data.financialGoals as boolean,
    daysBeforeDue: data.daysBeforeDue as number,
  }
}

export function saveNotificationPreferences(
  preferences: NotificationPreferences
): void {
  const booleanKeys = [
    'enabled',
    'cardInvoices',
    'paymentReminders',
    'financialGoals',
  ] as const

  for (const key of booleanKeys) {
    if (typeof preferences[key] !== 'boolean') {
      throw new Error(
        `Valor inválido para ${key}.`
      )
    }
  }

  if (!VALID_DAYS.includes(
    preferences.daysBeforeDue as
      (typeof VALID_DAYS)[number]
  )) {
    throw new Error(
      'Selecione um prazo de antecedência válido.'
    )
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(preferences)
  )
}
