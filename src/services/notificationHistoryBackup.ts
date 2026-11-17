
import type {
  NotificationHistoryData,
} from './notificationHistoryTypes'

import {
  readNotificationHistory,
} from './notificationHistoryStorage'

export type NotificationHistoryBackupResult =
  | {
      success: true
      data: NotificationHistoryData
    }
  | {
      success: false
      error: string
    }

export function exportNotificationHistory():
  NotificationHistoryBackupResult {
  const result = readNotificationHistory()

  if (!result.success) {
    return {
      success: false,
      error:
        'Não foi possível exportar o histórico: ' +
        result.error,
    }
  }

  try {
    // Cria uma cópia independente dos registros.
    const copy = structuredClone(result.data)

    return {
      success: true,
      data: copy,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao preparar o backup do histórico.',
    }
  }
}
