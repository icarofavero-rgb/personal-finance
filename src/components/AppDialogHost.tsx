import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

import { resolveAppDialog, subscribeAppDialogs, type AppDialogRequest } from '../services/appDialog'
import './confirm-dialog.css'

const CLOSE_MS = 220

function tone(message: string): 'success' | 'warning' | 'info' {
  if (/sucesso|salv[oa]s?!|registrad[oa]!|recuperad|pronto/i.test(message)) return 'success'
  if (/não|erro|inválid|confira|selecione|falh|segurança|imposs/i.test(message)) return 'warning'
  return 'info'
}

/** Mostra os avisos do app (no lugar do "Essa página diz..."), um por vez. */
export default function AppDialogHost() {
  const [queue, setQueue] = useState<AppDialogRequest[]>([])
  const [closing, setClosing] = useState(false)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => subscribeAppDialogs(setQueue), [])

  const current = queue[0]

  useEffect(() => {
    if (!current) return
    setClosing(false)
    okRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  if (!current) return null

  function close(value: boolean) {
    if (closing || !current) return
    setClosing(true)
    const id = current.id
    window.setTimeout(() => resolveAppDialog(id, value), CLOSE_MS)
  }

  const kind = current.kind === 'confirm' ? 'warning' : tone(current.message)
  const Icon = kind === 'success' ? CheckCircle2 : kind === 'warning' ? AlertTriangle : Info
  const title = current.title ?? (kind === 'success' ? 'Tudo certo!' : kind === 'warning' ? 'Atenção' : 'Aviso')

  return createPortal(
    <div
      className={`pf-confirm-overlay pf-app-dialog ${closing ? 'is-closing' : ''}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) close(false)
      }}
    >
      <div
        key={current.id}
        className={`pf-confirm-dialog is-${kind}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pf-app-dialog-title"
        aria-describedby="pf-app-dialog-message"
      >
        <div className={`pf-confirm-icon pf-app-dialog-icon is-${kind}`}>
          <Icon size={23} />
        </div>

        <h2 id="pf-app-dialog-title">{title}</h2>
        <p id="pf-app-dialog-message" style={{ whiteSpace: 'pre-line' }}>
          {current.message}
        </p>

        <div className="pf-confirm-actions">
          {current.kind === 'confirm' && (
            <button type="button" className="pf-confirm-cancel" onClick={() => close(false)}>
              Cancelar
            </button>
          )}
          <button ref={okRef} type="button" className="pf-confirm-accept" onClick={() => close(true)}>
            {current.kind === 'confirm' ? current.confirmLabel ?? 'Confirmar' : 'OK'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
