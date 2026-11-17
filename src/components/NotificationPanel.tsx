
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react'

import type {
  FinancialNotification,
} from '../services/notificationTypes'

import '../styles/notifications.css'


type NotificationPanelProps = {
  notifications: FinancialNotification[]
  error: string | null
  onClose: () => void
  onMarkAllRead: () => void
  onToggleRead: (id: string, read: boolean) => void
}



export default function NotificationPanel({
  notifications,
  error,
  onClose,
  onToggleRead,
  onMarkAllRead,
}: NotificationPanelProps) {

  const unreadCount = notifications.filter(
    notification => !notification.read
  ).length

const sortedNotifications = [...notifications].sort((a, b) => {
  // Notificações não lidas primeiro.
  if (a.read !== b.read) {
    return a.read ? 1 : -1
  }

  // Dentro de cada grupo, ordenar por prioridade.
  const priorityOrder = {
    urgent: 0,
    warning: 1,
    info: 2,
  }

  const priorityDifference =
    priorityOrder[a.priority] - priorityOrder[b.priority]

  if (priorityDifference !== 0) {
    return priorityDifference
  }

  // Manter uma ordem previsível para avisos equivalentes.
  return a.id.localeCompare(b.id)
})

  return (
    <div
      className="notification-panel"
      role="region"
      aria-label="Painel de notificações"
    >
      <div className="notification-panel-header">
        <div>
          <h3>Notificações</h3>
          <span>
            {error
              ? 'Não foi possível carregar os avisos'
              : unreadCount === 0
                ? 'Nenhum aviso pendente'
                : `${unreadCount} aviso${
                    unreadCount === 1 ? '' : 's'
                  } financeiro${
                    unreadCount === 1 ? '' : 's'
                  }`}
          </span>
        </div>

{!error && unreadCount > 0 && (
  <button
    type="button"
    className="notification-mark-all-button"
    onClick={onMarkAllRead}
  >
    <CheckCheck size={15} />
    Marcar todas como lidas
  </button>
)}

        <button
          type="button"
          className="notification-panel-close"
          aria-label="Fechar notificações"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="notification-panel-content">
        {error ? (
          <div className="notification-panel-empty">
            <AlertTriangle size={30} />
            <strong>Não foi possível carregar</strong>
            <p>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-panel-empty">
            <Bell size={30} />
            <strong>Nenhuma notificação por enquanto</strong>
            <p>
              Seus avisos financeiros aparecerão aqui
              quando estiverem disponíveis.
            </p>
          </div>
        ) : (
          <div className="notification-list">
            
{sortedNotifications.map(notification => (

              <div
                key={notification.id}
                
className={`notification-item notification-item--${notification.priority}${
  notification.read ? ' notification-item--read' : ''
}`}

              >
                <div className="notification-item-icon">
                  {notification.priority === 'urgent' ? (
                    <AlertTriangle size={19} />
                  ) : (
                    <CalendarClock size={19} />
                  )}
                </div>

                <div className="notification-item-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>

                  
<button
  type="button"
  className="notification-read-button"
  onClick={() =>
    onToggleRead(notification.id, notification.read)
  }
>
  {notification.read
    ? 'Marcar como não lida'
    : 'Marcar como lida'}
</button>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="notification-panel-footer">
        <CheckCheck size={16} />
        <span>
          {error
            ? 'Verifique os registros financeiros.'
            : 'Avisos calculados a partir dos seus registros.'}
        </span>
      </div>
    </div>
  )
}
