
const STORAGE_KEY = 'personal-finance-notification-read-v1'

type NotificationReadData = {
  version: 1
  readIds: string[]
}

export function getReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('readIds' in parsed) ||
      !Array.isArray(parsed.readIds)
    ) {
      throw new Error('Formato de leitura inválido.')
    }

    if (
      !parsed.readIds.every(
        (id: unknown) => typeof id === 'string'
      )
    ) {
      throw new Error('Identificadores inválidos.')
    }

    return [...new Set(parsed.readIds)]
  } catch (error) {
    console.error(
      'Não foi possível carregar o estado de leitura:',
      error
    )

    throw new Error(
      'Não foi possível recuperar as notificações lidas.'
    )
  }
}

export function saveReadNotificationIds(ids: string[]): void {
  const uniqueIds = [...new Set(ids)]

  const data: NotificationReadData = {
    version: 1,
    readIds: uniqueIds,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function markNotificationAsRead(id: string): void {
  if (!id.trim()) {
    throw new Error('Identificador de notificação inválido.')
  }

  const currentIds = getReadNotificationIds()

  if (currentIds.includes(id)) {
    return
  }

  saveReadNotificationIds([...currentIds, id])
}

export function markNotificationAsUnread(id: string): void {
  if (!id.trim()) {
    throw new Error('Identificador de notificação inválido.')
  }

  const currentIds = getReadNotificationIds()

  if (!currentIds.includes(id)) {
    return
  }

  saveReadNotificationIds(
    currentIds.filter(currentId => currentId !== id)
  )
}

export function markAllNotificationsAsRead(
  notificationIds: string[]
): void {
  if (notificationIds.length === 0) return

  if (
    notificationIds.some(
      id => typeof id !== 'string' || !id.trim()
    )
  ) {
    throw new Error('Identificadores de notificações inválidos.')
  }

  const currentIds = getReadNotificationIds()

  const updatedIds = [
    ...new Set([...currentIds, ...notificationIds]),
  ]

  if (updatedIds.length === currentIds.length) return

  saveReadNotificationIds(updatedIds)
}
