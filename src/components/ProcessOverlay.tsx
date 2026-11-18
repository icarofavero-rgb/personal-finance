import { useEffect, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import { createPortal } from 'react-dom'

import { usePresence } from '../hooks/usePresence'
import '../styles/process-overlay.css'

export type ProcessState = 'idle' | 'working' | 'success' | 'error'

type ProcessOverlayProps = {
  state: ProcessState
  /** Texto enquanto trabalha (ex.: "Sincronizando…") */
  workingText?: string
  successText?: string
  errorText?: string
  /** Detalhe opcional embaixo (ex.: o motivo do erro) */
  detail?: string
  onClose: () => void
  /** Fecha sozinho depois do sucesso (ms). 0 = só pelo botão. */
  autoCloseMs?: number
}

/**
 * Tela de processamento: a tela desvanece, o símbolo de sincronização
 * gira e, no fim, vira um check verde (deu certo) ou um X vermelho
 * (deu errado), com a mensagem correspondente.
 */
export default function ProcessOverlay({
  state,
  workingText = 'Sincronizando seus dados…',
  successText = 'Backup realizado com sucesso!',
  errorText = 'Transferência não concluída. Tente novamente.',
  detail,
  onClose,
  autoCloseMs = 2200,
}: ProcessOverlayProps) {
  const { rendered, closing } = usePresence(state !== 'idle', 320)

  // Lembra o último estado para a animação de saída manter a aparência.
  const [lastState, setLastState] = useState<Exclude<ProcessState, 'idle'>>('working')
  if (state !== 'idle' && state !== lastState) setLastState(state)

  useEffect(() => {
    if (state !== 'success' || !autoCloseMs) return
    const timer = window.setTimeout(onClose, autoCloseMs)
    return () => window.clearTimeout(timer)
  }, [state, autoCloseMs, onClose])

  useEffect(() => {
    if (state !== 'success' && state !== 'error') return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.key === 'Enter') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, onClose])

  if (!rendered) return null

  // Durante a saída mantém a aparência do último estado.
  const visual = state === 'idle' ? lastState : state
  const finished = visual === 'success' || visual === 'error'

  return createPortal(
    <div
      className={`pf-process-overlay ${closing ? 'is-closing' : ''}`}
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={visual === 'working' ? workingText : visual === 'success' ? successText : errorText}
      onClick={finished ? onClose : undefined}
    >
      <div className={`pf-process-card is-${visual}`} onClick={event => event.stopPropagation()}>
        <div className="pf-process-badge">
          <span className="pf-process-ring" aria-hidden="true" />
          {visual === 'working' && <RefreshCw className="pf-process-spin" size={42} strokeWidth={2.2} />}
          {visual === 'success' && <Check className="pf-process-pop" size={46} strokeWidth={3} />}
          {visual === 'error' && <X className="pf-process-pop" size={46} strokeWidth={3} />}
        </div>

        <strong key={visual} className="pf-process-title">
          {visual === 'working' ? workingText : visual === 'success' ? successText : errorText}
        </strong>

        {detail && finished && <p className="pf-process-detail">{detail}</p>}

        {finished && (
          <button type="button" className="pf-process-button" onClick={onClose}>
            {visual === 'success' ? 'Concluir' : 'Entendi'}
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
