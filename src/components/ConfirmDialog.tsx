
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import './confirm-dialog.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  showCloseButton?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ANIMATION_DURATION = 250

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  showCloseButton = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {

  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const [isVisible, setIsVisible] = useState(open)
  const [isClosing, setIsClosing] = useState(false)

  const closingRef = useRef(false)
  const confirmingRef = useRef(false)

  const onCancelRef = useRef(onCancel)
  const onConfirmRef = useRef(onConfirm)

  useEffect(() => {
    onCancelRef.current = onCancel
    onConfirmRef.current = onConfirm
  }, [onCancel, onConfirm])

  useEffect(() => {
    if (open) {
      closingRef.current = false
      confirmingRef.current = false
      setIsClosing(false)
      setIsVisible(true)
    } else {
      setIsVisible(false)
      setIsClosing(false)
    }
  }, [open])

  function handleCancelAnimated() {
    if (closingRef.current || confirmingRef.current) return

    closingRef.current = true
    setIsClosing(true)

    window.setTimeout(() => {
      onCancelRef.current()
    }, ANIMATION_DURATION)
  }

  function handleConfirm() {
    if (closingRef.current || confirmingRef.current) return

    confirmingRef.current = true
    onConfirmRef.current()
  }

  useEffect(() => {
    if (!open || !isVisible) return

    const previousFocus = document.activeElement

    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleCancelAnimated()
        return
      }

      if (event.key !== 'Tab') return

      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)'
        ) ?? []
      )

      if (buttons.length === 0) return

      const first = buttons[0]
      const last = buttons[buttons.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus()
      }
    }
  }, [open, isVisible])

  if (!isVisible) return null

  return createPortal(
    <div
      className={`pf-confirm-overlay ${
        isClosing ? 'is-closing' : ''
      }`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          handleCancelAnimated()
        }
      }}
    >
      <div
        ref={dialogRef}
        className="pf-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pf-confirm-title"
        aria-describedby="pf-confirm-message"
      >
        {showCloseButton && (
  <button
    type="button"
    className="pf-confirm-close"
    aria-label="Fechar"
    disabled={isClosing}
    onClick={handleCancelAnimated}
  >
    <X size={18} />
  </button>
)}

        <div className="pf-confirm-icon">
          <AlertTriangle size={23} />
        </div>

        <h2 id="pf-confirm-title">{title}</h2>

        <p id="pf-confirm-message">{message}</p>

        <div className="pf-confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="pf-confirm-cancel"
            disabled={isClosing}
            onClick={handleCancelAnimated}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="pf-confirm-accept"
            disabled={isClosing}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

