
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import './toast.css'
import { createPortal } from 'react-dom'

export type ToastMessage = {
  id: string
  type: 'success' | 'error'
  message: string
}

type ToastProps = {
  toast: ToastMessage | null
  onClose: () => void
}

const DURATION = 4000
const EXIT_DURATION = 250

export default function Toast({ toast, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!toast) return

    const exitTimer = window.setTimeout(() => {
      setExiting(true)
    }, DURATION - EXIT_DURATION)

    const closeTimer = window.setTimeout(() => {
      onClose()
    }, DURATION)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(closeTimer)
    }
  }, [toast, onClose])

  if (!toast) return null

  function handleClose() {
  setExiting(true)
  window.setTimeout(onClose, EXIT_DURATION)
}

return createPortal(
  <div
    className={`pf-toast pf-toast-${toast.type} ${
      exiting ? 'pf-toast-exit' : ''
    }`}
    role={toast.type === 'error' ? 'alert' : 'status'}
  >
    <div className="pf-toast-content">
      {toast.type === 'success' ? (
        <CheckCircle2 size={21} />
      ) : (
        <AlertCircle size={21} />
      )}

      <span>{toast.message}</span>

      <button
        type="button"
        className="pf-toast-close"
        aria-label="Fechar notificação"
        onClick={handleClose}
      >
        <X size={16} />
      </button>
    </div>

    <div className="pf-toast-progress" />
  </div>,
  document.body
)
}
