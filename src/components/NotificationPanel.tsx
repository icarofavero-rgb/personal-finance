
import { useState } from 'react'
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  CalendarClock,
  Trash2,
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
  /** exclui avisos (somem da lista) */
  onDelete: (ids: string[]) => void
}



export default function NotificationPanel({
  notifications,
  error,
  onClose,
  onToggleRead,
  onMarkAllRead,
  onDelete,
}: NotificationPanelProps) {

  const unreadCount = notifications.filter(
    notification => !notification.read
  ).length
  const readCount = notifications.length - unreadCount

  // Lidas ficam escondidas (dá para ver de novo em "Mostrar lidas")
  const [showRead, setShowRead] = useState(false)
  // Aviso saindo da lista com animação antes de ser marcado
  const [leaving, setLeaving] = useState<string[]>([])

  function remove(ids: string[]) {
    setLeaving(current => [...current, ...ids])
    window.setTimeout(() => {
      onDelete(ids)
      setLeaving(current => current.filter(item => !ids.includes(item)))
    }, 260)
  }

  function toggleRead(id: string, read: boolean) {
    if (read) {
      onToggleRead(id, read)
      return
    }
    setLeaving(current => [...current, id])
    window.setTimeout(() => {
      onToggleRead(id, false)
      setLeaving(current => current.filter(item => item !== id))
    }, 260)
  }

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
        ) : notifications.length === 0 || (unreadCount === 0 && !showRead && leaving.length === 0) ? (
          <div className="notification-panel-empty">
            <Bell size={30} />
            <strong>{notifications.length === 0 ? 'Nenhuma notificação por enquanto' : 'Tudo lido por aqui!'}</strong>
            <p>
              {notifications.length === 0
                ? 'Seus avisos financeiros aparecerão aqui quando estiverem disponíveis.'
                : 'Você não tem avisos novos.'}
            </p>
          </div>
        ) : (
          <div className="notification-list">
            
{sortedNotifications.filter(notification => showRead || !notification.read || leaving.includes(notification.id)).map(notification => (

              <div
                key={notification.id}
                
className={`notification-item notification-item--${notification.priority}${
  notification.read ? ' notification-item--read' : ''
}${leaving.includes(notification.id) ? ' is-leaving' : ''}`}

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

                  
<div className="notification-item-actions">
<button
  type="button"
  className="notification-read-button"
  onClick={() =>
    toggleRead(notification.id, notification.read)
  }
>
  {notification.read
    ? 'Marcar como não lida'
    : 'Marcar como lida'}
</button>
<button
  type="button"
  className="notification-delete-button"
  onClick={() => remove([notification.id])}
  aria-label={`Excluir o aviso ${notification.title}`}
  title="Excluir aviso"
>
  <Trash2 size={14} /> Excluir
</button>
</div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!error && readCount > 0 && (
        <div className="notification-read-tools">
          <button type="button" className="notification-show-read" onClick={() => setShowRead(value => !value)}>
            {showRead ? 'Esconder lidas' : `Mostrar lidas (${readCount})`}
          </button>
          <button
            type="button"
            className="notification-show-read is-danger"
            onClick={() => remove(notifications.filter(item => item.read).map(item => item.id))}
          >
            <Trash2 size={13} /> Excluir lidas
          </button>
        </div>
      )}

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
