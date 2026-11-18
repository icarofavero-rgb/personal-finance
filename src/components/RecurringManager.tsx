import { useEffect, useState } from 'react'
import { Check, Pause, Pencil, Play, Repeat, Trash2, X } from 'lucide-react'

import PfModal from './PfModal'
import ConfirmDialog from './ConfirmDialog'
import CategoryIcon from './CategoryIcon'
import { getTransactionVisual } from '../services/categories'
import {
  deleteRecurringRule,
  getRecurringRules,
  nextOccurrence,
  RECURRING_CHANGED_EVENT,
  updateRecurringRule,
  type RecurringRule,
} from '../services/recurringStorage'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`

type Draft = { id: string; amount: string; day: string; description: string }

/** Botão "Recorrentes" + janela para pausar, editar ou parar de repetir. */
export default function RecurringManager() {
  const [rules, setRules] = useState(getRecurringRules)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [toDelete, setToDelete] = useState<RecurringRule | null>(null)

  useEffect(() => {
    const refresh = () => setRules(getRecurringRules())
    window.addEventListener(RECURRING_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(RECURRING_CHANGED_EVENT, refresh)
  }, [])

  function saveDraft() {
    if (!draft) return

    const amount = Number(draft.amount.replace(',', '.'))
    const day = Number(draft.day)

    if (!draft.description.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(day) || day < 1 || day > 31) {
      return
    }

    updateRecurringRule(draft.id, {
      description: draft.description.trim(),
      amount: Math.round(amount * 100) / 100,
      dayOfMonth: day,
    })
    setDraft(null)
  }

  return (
    <>
      <button type="button" className="pf-recurring-button" onClick={() => setOpen(true)}>
        <Repeat size={16} />
        Recorrentes
        {rules.length > 0 && <span className="pf-recurring-count">{rules.length}</span>}
      </button>

      <PfModal
        open={open}
        title="Transações recorrentes"
        subtitle="Lançadas sozinhas todo mês. Para criar, marque “Repetir todo mês” ao cadastrar uma transação."
        onClose={() => {
          setOpen(false)
          setDraft(null)
        }}
      >
        {rules.length === 0 ? (
          <div className="pf-recurring-empty">
            <Repeat size={30} />
            <strong>Nenhuma transação recorrente</strong>
            <p>Ao cadastrar o salário, o aluguel ou uma assinatura, ative “Repetir todo mês”.</p>
          </div>
        ) : (
          <ul className="pf-recurring-list">
            {rules.map(rule => {
              const visual = getTransactionVisual(rule.category, rule.type)
              const editing = draft?.id === rule.id

              return (
                <li key={rule.id} className={`pf-recurring-row ${rule.paused ? 'is-paused' : ''}`}>
                  <span className="pf-recurring-icon" style={{ '--tx-color': visual.color } as React.CSSProperties}>
                    <CategoryIcon icon={visual.icon} size={18} />
                  </span>

                  {editing ? (
                    <div className="pf-recurring-edit">
                      <input
                        aria-label="Descrição"
                        value={draft.description}
                        onChange={event => setDraft({ ...draft, description: event.target.value })}
                      />
                      <div className="pf-recurring-edit-row">
                        <label>
                          Valor
                          <input
                            inputMode="decimal"
                            value={draft.amount}
                            onChange={event => setDraft({ ...draft, amount: event.target.value })}
                          />
                        </label>
                        <label>
                          Todo dia
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={draft.day}
                            onChange={event => setDraft({ ...draft, day: event.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <span className="pf-recurring-text">
                      <strong>{rule.description}</strong>
                      <small>
                        {rule.paused ? 'Pausada' : `Todo dia ${rule.dayOfMonth} · próxima em ${shortDate(nextOccurrence(rule))}`}
                      </small>
                    </span>
                  )}

                  {!editing && (
                    <strong className={`pf-recurring-amount ${rule.type}`}>
                      {rule.type === 'income' ? '+' : '-'} {money(rule.amount)}
                    </strong>
                  )}

                  <span className="pf-recurring-actions">
                    {editing ? (
                      <>
                        <button type="button" aria-label="Salvar" onClick={saveDraft}>
                          <Check size={16} />
                        </button>
                        <button type="button" aria-label="Cancelar" onClick={() => setDraft(null)}>
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-label={rule.paused ? `Retomar ${rule.description}` : `Pausar ${rule.description}`}
                          title={rule.paused ? 'Retomar' : 'Pausar'}
                          onClick={() => updateRecurringRule(rule.id, { paused: !rule.paused })}
                        >
                          {rule.paused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                        <button
                          type="button"
                          aria-label={`Editar ${rule.description}`}
                          title="Editar"
                          onClick={() =>
                            setDraft({
                              id: rule.id,
                              description: rule.description,
                              amount: String(rule.amount).replace('.', ','),
                              day: String(rule.dayOfMonth),
                            })
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          aria-label={`Parar de repetir ${rule.description}`}
                          title="Parar de repetir"
                          onClick={() => setToDelete(rule)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </PfModal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Parar de repetir?"
        message={`“${toDelete?.description ?? ''}” não será mais lançada nos próximos meses. Os lançamentos já feitos continuam nas suas transações.`}
        confirmLabel="Parar de repetir"
        onConfirm={() => {
          if (toDelete) deleteRecurringRule(toDelete.id)
          setToDelete(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
