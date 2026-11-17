
export type FinancialNotificationType =
  | 'card-invoice'
  | 'payment-reminder'
  | 'financial-goal'

export type FinancialNotificationPriority =
  | 'info'
  | 'warning'
  | 'urgent'

export type FinancialNotification = {
  id: string
  type: FinancialNotificationType
  title: string
  message: string
  priority: FinancialNotificationPriority
  createdAt: string
  dueDate?: string
  referenceId?: string
  read: boolean
}

export type NotificationSummary = {
  total: number
  unread: number
  urgent: number
}

export function summarizeNotifications(
  notifications: FinancialNotification[]
): NotificationSummary {
  return {
    total: notifications.length,

    unread: notifications.filter(
      notification => !notification.read
    ).length,

    urgent: notifications.filter(
      notification =>
        notification.priority === 'urgent' &&
        !notification.read
    ).length,
  }
}
