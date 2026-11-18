import { useState } from 'react'
import { DatabaseBackup } from 'lucide-react'

import { getBackupReminder, snoozeBackupReminder } from '../services/backupReminder'
import { usePresence } from '../hooks/usePresence'

type Props = {
  hasData: boolean
  onBackup: () => void
}

/** Aviso no Dashboard quando faz tempo desde o último backup. */
export default function BackupReminderBanner({ hasData, onBackup }: Props) {
  const [reminder] = useState(() => getBackupReminder(hasData))
  const [visible, setVisible] = useState(true)
  const { rendered, closing } = usePresence(visible && reminder.show, 260)

  if (!rendered) return null

  return (
    <div className={`pf-backup-reminder ${closing ? 'is-closing' : ''}`} role="status">
      <span className="pf-backup-reminder-icon">
        <DatabaseBackup size={22} />
      </span>

      <div className="pf-backup-reminder-text">
        <strong>
          {reminder.days === null
            ? 'Você ainda não fez nenhum backup'
            : `Faz ${reminder.days} dias desde o último backup`}
        </strong>
        <p>Seus dados ficam só neste aparelho. Guarde uma cópia para não perder nada.</p>
      </div>

      <div className="pf-backup-reminder-actions">
        <button
          type="button"
          className="pf-backup-reminder-later"
          onClick={() => {
            snoozeBackupReminder()
            setVisible(false)
          }}
        >
          Lembrar depois
        </button>
        <button type="button" className="primary-button" onClick={onBackup}>
          Fazer backup
        </button>
      </div>
    </div>
  )
}
