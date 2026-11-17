
import type {
  FinancialNotification,
} from './notificationTypes'

export type NotificationHistoryStatus =
  | 'active'
  | 'resolved'

export type NotificationHistoryEntry = {
  id: string
  notification: FinancialNotification
  status: NotificationHistoryStatus
  firstSeenAt: string
  lastSeenAt: string
  resolvedAt?: string
}

export type NotificationHistoryData = {
  version: 1
  entries: NotificationHistoryEntry[]
}
