
import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import './AppDialog.css'

type AppDialogProps = {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export default function AppDialog({
  open,
  title,
  message,
  onClose,
}: AppDialogProps) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) setClosing(false)
  }, [open])

  if (!open) return null

  function handleClose() {
    if (closing) return
    setClosing(true)
  }

  return (
    <div
      className={`app-dialog-overlay ${
        closing ? 'is-closing' : ''
      }`}
      onAnimationEnd={event => {
        if (
          closing &&
          event.target === event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <section
        className="app-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
      >
        <div className="app-dialog-header">
          <div className="app-dialog-icon">
            <AlertTriangle size={21} />
          </div>

          <button
            type="button"
            className="app-dialog-close"
            onClick={handleClose}
            aria-label="Fechar aviso"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="app-dialog-title">{title}</h2>
        <p id="app-dialog-message">{message}</p>

        <button
          type="button"
          className="app-dialog-confirm"
          onClick={handleClose}
        >
          Entendi
        </button>
      </section>
    </div>
  )
}
