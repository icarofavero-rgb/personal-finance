
import type {
  NotificationHistoryData,
  NotificationHistoryEntry,
} from './notificationHistoryTypes'

import {
  NOTIFICATION_HISTORY_STORAGE_KEY,
  NOTIFICATION_HISTORY_VERSION,
  NOTIFICATION_HISTORY_MAX_ENTRIES,
} from './notificationHistoryConfig'

import {
  withNotificationHistoryLock,
} from './notificationHistoryLock'

export type NotificationHistoryReadResult =
  | {
      success: true
      data: NotificationHistoryData
    }
  | {
      success: false
      error: string
    }


function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

function isValidEntry(
  value: unknown
): value is NotificationHistoryEntry {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }

  const entry = value as Record<string, unknown>

  if (
    typeof entry.id !== 'string' ||
    !entry.id.trim() ||
    (entry.status !== 'active' &&
      entry.status !== 'resolved') ||
    !isValidDate(entry.firstSeenAt) ||
    !isValidDate(entry.lastSeenAt)
  ) {
    return false
  }

  const firstSeen = Date.parse(entry.firstSeenAt)
  const lastSeen = Date.parse(entry.lastSeenAt)

  if (lastSeen < firstSeen) {
    return false
  }

  if (entry.status === 'resolved') {
    if (
      !isValidDate(entry.resolvedAt) ||
      Date.parse(entry.resolvedAt) < lastSeen
    ) {
      return false
    }
  } else if (entry.resolvedAt !== undefined) {
    return false
  }

  const notification = entry.notification

  if (
    typeof notification !== 'object' ||
    notification === null ||
    Array.isArray(notification)
  ) {
    return false
  }

  const notice = notification as Record<string, unknown>

  const validTypes = [
    'card-invoice',
    'payment-reminder',
    'financial-goal',
  ]

  const validPriorities = [
    'info',
    'warning',
    'urgent',
  ]

  if (
    typeof notice.id !== 'string' ||
    notice.id !== entry.id ||
    typeof notice.title !== 'string' ||
    !notice.title.trim() ||
    typeof notice.message !== 'string' ||
    !notice.message.trim() ||
    !validTypes.includes(String(notice.type)) ||
    !validPriorities.includes(String(notice.priority)) ||
    !isValidDate(notice.createdAt) ||
    typeof notice.read !== 'boolean'
  ) {
    return false
  }

  if (
    notice.dueDate !== undefined &&
    !isValidDate(notice.dueDate)
  ) {
    return false
  }

  if (
    notice.referenceId !== undefined &&
    (
      typeof notice.referenceId !== 'string' ||
      !notice.referenceId.trim()
    )
  ) {
    return false
  }

  return true
}

export function readNotificationHistory():
  NotificationHistoryReadResult {
  try {
    const raw = localStorage.getItem(
      NOTIFICATION_HISTORY_STORAGE_KEY
    )

    if (raw === null) {
      return {
        success: true,
        data: {
          version: NOTIFICATION_HISTORY_VERSION,
          entries: [],
        },
      }
    }

    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error('Estrutura inválida.')
    }

    const data = parsed as Record<string, unknown>

    if (
      data.version !== NOTIFICATION_HISTORY_VERSION ||
      !Array.isArray(data.entries)
    ) {
      throw new Error(
        'Versão ou lista de notificações inválida.'
      )
    }

    if (
      data.entries.length >
      NOTIFICATION_HISTORY_MAX_ENTRIES
    ) {
      throw new Error(
        'Histórico acima do limite configurado.'
      )
    }

    if (!data.entries.every(isValidEntry)) {
      throw new Error(
        'O histórico contém registros inválidos.'
      )
    }

    const ids = new Set(
      data.entries.map(
        (entry: NotificationHistoryEntry) => entry.id
      )
    )

    if (ids.size !== data.entries.length) {
      throw new Error(
        'O histórico contém identificadores duplicados.'
      )
    }

    return {
      success: true,
      data: data as NotificationHistoryData,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao ler o histórico.',
    }
  }
}

export type NotificationHistoryWriteResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

export function saveNotificationHistory(
  nextData: NotificationHistoryData,
  expectedRaw: string | null
): NotificationHistoryWriteResult {
  try {
    // 1. Verificar se o histórico atual pode ser lido.
    const current = readNotificationHistory()

    if (!current.success) {
      return {
        success: false,
        error:
          'O histórico existente está inválido. ' +
          'A gravação foi bloqueada para proteger os dados.',
      }
    }

    // 2. Verificar alterações desde a leitura anterior.
    const currentRaw = localStorage.getItem(
      NOTIFICATION_HISTORY_STORAGE_KEY
    )

    if (currentRaw !== expectedRaw) {
      return {
        success: false,
        error:
          'O histórico foi alterado desde a última leitura.',
      }
    }

    // 3. Validar a estrutura recebida.
    if (
      !nextData ||
      nextData.version !== NOTIFICATION_HISTORY_VERSION ||
      !Array.isArray(nextData.entries)
    ) {
      return {
        success: false,
        error: 'Estrutura de histórico inválida.',
      }
    }

    // 4. Respeitar o limite de armazenamento.
    if (
      nextData.entries.length >
      NOTIFICATION_HISTORY_MAX_ENTRIES
    ) {
      return {
        success: false,
        error: 'Limite de registros excedido.',
      }
    }

    // 5. Validar todos os registros.
    if (!nextData.entries.every(isValidEntry)) {
      return {
        success: false,
        error: 'Existem notificações inválidas.',
      }
    }

    // 6. Impedir identificadores duplicados.
    const ids = new Set(
      nextData.entries.map(entry => entry.id)
    )

    if (ids.size !== nextData.entries.length) {
      return {
        success: false,
        error: 'Existem notificações duplicadas.',
      }
    }

// Proteger registros existentes contra exclusão acidental.
const existingEntries = new Map(
  current.data.entries.map(entry => [entry.id, entry])
)

const nextEntries = new Map(
  nextData.entries.map(entry => [entry.id, entry])
)

for (const [id, previousEntry] of existingEntries) {
  const updatedEntry = nextEntries.get(id)

  if (!updatedEntry) {
    return {
      success: false,
      error:
        'A atualização removeria notificações existentes.',
    }
  }

  if (
    updatedEntry.firstSeenAt !== previousEntry.firstSeenAt
  ) {
    return {
      success: false,
      error:
        'A data original de uma notificação foi alterada.',
    }
  }

  if (
    Date.parse(updatedEntry.lastSeenAt) <
    Date.parse(previousEntry.lastSeenAt)
  ) {
    return {
      success: false,
      error:
        'A última ocorrência de uma notificação retrocedeu.',
    }
  }

  if (
    previousEntry.status === 'resolved' &&
    updatedEntry.status === 'active'
  ) {
    return {
      success: false,
      error:
        'Uma notificação resolvida não pode ser reativada.',
    }
  }

  if (
    previousEntry.status === 'resolved' &&
    updatedEntry.resolvedAt !== previousEntry.resolvedAt
  ) {
    return {
      success: false,
      error:
        'A data de resolução de uma notificação foi alterada.',
    }
  }
}

    // 7. Serializar antes de gravar.
    const serialized = JSON.stringify(nextData)

    // 8. Persistir somente após todas as verificações.
    localStorage.setItem(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      serialized
    )

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao salvar o histórico.',
    }
  }
}

export async function saveNotificationHistorySafely(
  nextData: NotificationHistoryData,
  expectedRaw: string | null
): Promise<NotificationHistoryWriteResult> {
  const lockResult = await withNotificationHistoryLock(
    () => saveNotificationHistory(nextData, expectedRaw)
  )

  if (!lockResult.success) {
    return {
      success: false,
      error: lockResult.error,
    }
  }

  return lockResult.value
}
