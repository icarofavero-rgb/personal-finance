import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type PfModalProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** classe extra (ex.: "is-wide" para janelas mais largas) */
  className?: string
}

const CLOSE_DURATION = 240

/**
 * Janela simples e reutilizável. Usa as classes .modal-overlay/.modal
 * do app: no celular sobe de baixo; no computador aparece com "mola".
 * Fecha com Esc, tocando fora ou no X.
 */
export default function PfModal({ open, title, subtitle, onClose, children, className = '' }: PfModalProps) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)
  const timer = useRef<number | null>(null)

  // Abre na hora; ao fechar, espera a animação de saída.
  if (open && !rendered) {
    setRendered(true)
    setClosing(false)
  }

  if (!open && rendered && !closing) {
    setClosing(true)
  }

  useEffect(() => {
    if (!closing) return

    timer.current = window.setTimeout(() => {
      setRendered(false)
      setClosing(false)
    }, CLOSE_DURATION)

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [closing])

  useEffect(() => {
    if (!open) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!rendered) return null

  // Portal: abre por cima da tela inteira, mesmo quando o botão está
  // dentro de um bloco de vidro (que "prenderia" a janela dentro dele)
  return createPortal(
    <div className={`modal-overlay ${closing ? 'is-closing' : ''}`} onClick={onClose}>
      <div
        className={`modal pf-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button type="button" className="modal-close" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  )
}
