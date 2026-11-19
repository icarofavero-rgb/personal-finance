import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2 } from 'lucide-react'

import { wipeAllFinancialData } from '../services/resetData'
import { reloadApp } from '../services/profileSwitch'

const WORD = 'APAGAR'

/** Final de Dados e armazenamento: apagar tudo e começar do zero. */
export default function DangerZone() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  return (
    <div className="settings-appearance-group pf-danger-zone">
      <h3>Começar do zero</h3>
      <p>
        Apaga todas as transações, cartões, faturas, metas, orçamentos, guardado, lembretes, devedores e perfis
        deste aparelho. Aparência, layout e seu nome continuam.
      </p>

      <button type="button" className="pf-danger-button" onClick={() => setOpen(true)}>
        <Trash2 size={17} /> Apagar todos os dados
      </button>

      {open &&
        createPortal(
          <div className="pf-confirm-overlay" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
            <div className="pf-confirm-dialog pf-danger-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pf-danger-title">
              <div className="pf-confirm-icon pf-danger-icon">
                <AlertTriangle size={23} />
              </div>
              <h2 id="pf-danger-title">Apagar todos os dados?</h2>
              <p>
                Isso <strong>não pode ser desfeito</strong>. Se quiser guardar uma cópia, faça um backup antes. Os
                outros aparelhos conectados não são apagados.
              </p>
              <label className="pf-danger-label">
                Para confirmar, digite <b>{WORD}</b>
                <input
                  value={typed}
                  onChange={event => setTyped(event.target.value.toUpperCase())}
                  autoFocus
                  autoComplete="off"
                  aria-label={`Digite ${WORD} para confirmar`}
                />
              </label>
              <div className="pf-confirm-actions">
                <button type="button" className="pf-confirm-cancel" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="pf-danger-button"
                  disabled={typed !== WORD}
                  onClick={() => {
                    wipeAllFinancialData()
                    reloadApp()
                  }}
                >
                  Apagar tudo
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
