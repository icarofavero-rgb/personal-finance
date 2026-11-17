
export type NotificationHistoryLockResult<T> =
  | {
      success: true
      value: T
    }
  | {
      success: false
      error: string
    }

const LOCK_NAME =
  'personal-finance-notification-history-v1-lock'

export async function withNotificationHistoryLock<T>(
  operation: () => Promise<T> | T
): Promise<NotificationHistoryLockResult<T>> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.locks
    ) {
      return {
        success: false,
        error:
          'Este navegador não oferece o bloqueio ' +
          'necessário para gravações coordenadas.',
      }
    }

    const value = await navigator.locks.request(
      LOCK_NAME,
      { mode: 'exclusive' },
      async () => operation()
    )

    return {
      success: true,
      value,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao coordenar o acesso ao histórico.',
    }
  }
}
