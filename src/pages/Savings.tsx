import { useCallback, useMemo, useState } from 'react'
import { getGoals } from '../services/goalsStorage'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarCheck,
  PiggyBank,
  Sparkles,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react'

import { AnimatedMoney } from '../components/AnimatedMoney'
import ConfirmDialog from '../components/ConfirmDialog'
import DatePicker from '../components/DatePicker'
import MonthPicker from '../components/MonthPicker'
import PfModal from '../components/PfModal'
import Toast, { type ToastMessage } from '../components/Toast'
import type { Transaction } from '../services/storage'
import {
  addSavingsMovement,
  calculateLeftoverSuggestionCents,
  calculateMonthResultCents,
  calculateSavingsBalanceCents,
  deleteSavingsMovement,
  getSavingsMovements,
  summarizeSavingsByMonth,
  type SavingsMovement,
} from '../services/savingsStorage'
import '../styles/savings.css'

type SavingsProps = {
  transactions: Transaction[]
}

type FormMode = 'leftover' | 'deposit' | 'withdrawal'

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const todayKey = () => new Date().toLocaleDateString('en-CA')
const currentMonth = () => todayKey().slice(0, 7)

function monthLabel(month: string, style: 'long' | 'short' = 'long') {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', {
    month: style,
    ...(style === 'long' ? { year: 'numeric' } : {}),
  })
}

function readMovements(): { movements: SavingsMovement[]; error: string | null } {
  try {
    return { movements: getSavingsMovements(), error: null }
  } catch (error) {
    return {
      movements: [],
      error: error instanceof Error ? error.message : 'Não foi possível ler o Guardado.',
    }
  }
}

type GoalSavingsMovement = SavingsMovement & { goalName: string }

/** Movimentações das Metas no formato do Guardado (só leitura). */
function readGoalMovements(): GoalSavingsMovement[] {
  try {
    return getGoals().flatMap(goal =>
      (goal.movements ?? []).map(movement => ({
        id: `goal-${goal.id}-${movement.id}`,
        type: movement.type,
        source: 'manual' as const,
        amountCents: Math.round(movement.amount * 100),
        date: movement.date.slice(0, 10),
        note: movement.note,
        createdAt: movement.date,
        goalName: goal.name,
      }))
    )
  } catch {
    return []
  }
}

export default function Savings({ transactions }: SavingsProps) {
  const [{ movements, error: loadError }, setState] = useState(readMovements)
  const [month, setMonth] = useState(currentMonth)
  const [mode, setMode] = useState<FormMode | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayKey)
  const [note, setNote] = useState('')
  const [toDelete, setToDelete] = useState<SavingsMovement | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const closeToast = useCallback(() => setToast(null), [])
  const closeForm = useCallback(() => setMode(null), [])

  const showToast = (type: 'success' | 'error', message: string) =>
    setToast({ id: crypto.randomUUID(), type, message })

  const reload = () => setState(readMovements())

  // Depósitos e retiradas das Metas também contam como dinheiro guardado
  const goalMovements = useMemo(() => readGoalMovements(), [])
  const allMovements = useMemo(() => [...movements, ...goalMovements], [movements, goalMovements])

  const balanceCents = calculateSavingsBalanceCents(allMovements)
  const monthResultCents = calculateMonthResultCents(transactions, month)
  const suggestionCents = calculateLeftoverSuggestionCents(transactions, movements, month)
  const alreadyFromLeftover = movements
    .filter(item => item.type === 'deposit' && item.source === 'leftover' && item.month === month)
    .reduce((sum, item) => sum + item.amountCents, 0)

  const thisMonth = currentMonth()
  const savedThisMonth = allMovements
    .filter(item => item.type === 'deposit' && item.date.startsWith(thisMonth))
    .reduce((sum, item) => sum + item.amountCents, 0)

  const history = useMemo(
    () =>
      [...allMovements].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      ),
    [allMovements]
  )

  const series = useMemo(() => summarizeSavingsByMonth(allMovements, thisMonth, 6), [allMovements, thisMonth])
  const maxBalance = Math.max(1, ...series.map(item => item.balanceCents))

  function openForm(next: FormMode) {
    setMode(next)
    setNote('')
    setDate(todayKey())
    setAmount(next === 'leftover' ? (suggestionCents / 100).toFixed(2) : '')
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mode) return

    const cents = Math.round(Number(amount.replace(',', '.')) * 100)

    if (!Number.isSafeInteger(cents) || cents <= 0) {
      showToast('error', 'Informe um valor maior que zero.')
      return
    }

    if (mode === 'leftover' && cents > suggestionCents) {
      showToast('error', `A sobra disponível de ${monthLabel(month)} é ${money(suggestionCents)}.`)
      return
    }

    try {
      addSavingsMovement({
        type: mode === 'withdrawal' ? 'withdrawal' : 'deposit',
        source: mode === 'leftover' ? 'leftover' : 'manual',
        month: mode === 'leftover' ? month : undefined,
        amountCents: cents,
        date,
        note,
      })

      reload()
      setMode(null)
      showToast(
        'success',
        mode === 'withdrawal' ? 'Retirada registrada.' : `${money(cents)} guardados! 🎉`
      )
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Não foi possível salvar.')
    }
  }

  function confirmDelete() {
    if (!toDelete) return

    try {
      deleteSavingsMovement(toDelete.id)
      reload()
      showToast('success', 'Movimentação excluída.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Não foi possível excluir.')
    } finally {
      setToDelete(null)
    }
  }

  const formTitle =
    mode === 'leftover' ? 'Guardar sobra do mês' : mode === 'withdrawal' ? 'Retirar do Guardado' : 'Depositar valor'

  return (
    <section className="pf-savings">
      <div className="pf-section-heading">
        <span className="eyebrow">RESERVA FINANCEIRA</span>
        <h1>
          Guardado<span className="neon-dot">.</span>
        </h1>
        <p>Separe o que sobrou do mês ou guarde valores quando quiser.</p>
      </div>

      {loadError && <p className="pf-inline-error">{loadError}</p>}

      <div className="pf-savings-hero panel">
        <div className="pf-savings-hero-icon">
          <PiggyBank size={30} />
        </div>

        <div className="pf-savings-hero-main">
          <span>Total guardado</span>
          <h2>
            <AnimatedMoney value={balanceCents / 100} />
          </h2>
          <small>
            {savedThisMonth > 0
              ? `${money(savedThisMonth)} guardados em ${monthLabel(thisMonth)}`
              : 'Nenhum depósito neste mês ainda'}
          </small>
        </div>

        <div className="pf-savings-actions">
          <button type="button" className="primary-button" onClick={() => openForm('deposit')}>
            <ArrowDownToLine size={17} />
            Depositar
          </button>
          <button
            type="button"
            className="pf-ghost-button"
            onClick={() => openForm('withdrawal')}
            disabled={balanceCents <= 0}
          >
            <ArrowUpFromLine size={17} />
            Retirar
          </button>
        </div>
      </div>

      <div className="pf-savings-grid">
        <div className="panel pf-savings-leftover">
          <div className="pf-card-heading">
            <div>
              <h3>
                <Sparkles size={18} /> Sobra do mês
              </h3>
              <p>Quanto sobrou de entradas menos saídas.</p>
            </div>
            <div className="pf-savings-month">
              <MonthPicker value={month} onChange={value => value && setMonth(value)} />
            </div>
          </div>

          <div className="pf-savings-figures">
            <div>
              <span>Resultado do mês</span>
              <strong className={monthResultCents < 0 ? 'negative' : 'positive'}>
                {money(monthResultCents)}
              </strong>
            </div>
            <div>
              <span>Já guardado da sobra</span>
              <strong>{money(alreadyFromLeftover)}</strong>
            </div>
            <div className="is-highlight">
              <span>Disponível para guardar</span>
              <strong>{money(suggestionCents)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="primary-button pf-full"
            onClick={() => openForm('leftover')}
            disabled={suggestionCents <= 0}
          >
            <CalendarCheck size={17} />
            {suggestionCents > 0 ? `Guardar sobra de ${monthLabel(month, 'short')}` : 'Sem sobra para guardar'}
          </button>
        </div>

        <div className="panel pf-savings-chart">
          <div className="pf-card-heading">
            <div>
              <h3>
                <Wallet size={18} /> Evolução
              </h3>
              <p>Total guardado ao fim de cada mês.</p>
            </div>
          </div>

          <div className="pf-bars" role="img" aria-label="Evolução do total guardado nos últimos 6 meses">
            {series.map((item, index) => (
              <div key={item.month} className="pf-bar-col">
                <span className="pf-bar-value">
                  {item.balanceCents > 0
                    ? (item.balanceCents / 100).toLocaleString('pt-BR', { notation: 'compact' })
                    : ''}
                </span>
                <span
                  className="pf-bar"
                  style={
                    {
                      '--bar': `${Math.max(3, (item.balanceCents / maxBalance) * 100)}%`,
                      '--i': index,
                    } as React.CSSProperties
                  }
                />
                <span className="pf-bar-label">{monthLabel(item.month, 'short').replace('.', '')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel pf-savings-history">
        <div className="pf-card-heading">
          <div>
            <h3>Histórico</h3>
            <p>{history.length} {history.length === 1 ? 'movimentação' : 'movimentações'}</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <PiggyBank size={34} />
            <strong>Nada guardado ainda</strong>
            <p>Comece guardando a sobra do mês ou um valor avulso.</p>
          </div>
        ) : (
          <ul className="pf-savings-list">
            {history.map((item, index) => (
              <li key={item.id} style={{ '--i': Math.min(index, 8) } as React.CSSProperties}>
                <span className={`pf-savings-badge ${item.type} ${'goalName' in item ? 'is-goal' : ''}`}>
                  {'goalName' in item ? <Target size={16} /> : item.type === 'deposit' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                </span>
                <div className="pf-savings-item-info">
                  <strong>
                    {'goalName' in item
                      ? `${item.type === 'deposit' ? 'Depositado na meta' : 'Retirado da meta'} “${item.goalName}”`
                      : item.type === 'withdrawal'
                      ? 'Retirada'
                      : item.source === 'leftover'
                        ? `Sobra de ${monthLabel(item.month ?? item.date.slice(0, 7))}`
                        : 'Depósito avulso'}
                  </strong>
                  <small>
                    {item.date.split('-').reverse().join('/')}
                    {item.note ? ` · ${item.note}` : ''}
                  </small>
                </div>
                <strong className={item.type === 'deposit' ? 'positive' : 'negative'}>
                  {item.type === 'deposit' ? '+' : '−'} {money(item.amountCents)}
                </strong>
                {'goalName' in item ? (
                  <span className="pf-savings-goal-tag" title="Altere em Metas">Meta</span>
                ) : (
                  <button
                    type="button"
                    className="history-icon-button"
                    aria-label="Excluir movimentação"
                    onClick={() => setToDelete(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PfModal
        open={mode !== null}
        title={formTitle}
        subtitle={
          mode === 'leftover'
            ? `Disponível em ${monthLabel(month)}: ${money(suggestionCents)}`
            : mode === 'withdrawal'
              ? `Guardado atualmente: ${money(balanceCents)}`
              : 'Guarde qualquer valor, quando quiser.'
        }
        onClose={closeForm}
      >
        <form onSubmit={submit} className="pf-form">
          <div className="form-group">
            <label htmlFor="savings-amount">Valor (R$)</label>
            <input
              id="savings-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="savings-date">Data</label>
            <DatePicker id="savings-date" value={date} onChange={setDate} required />
          </div>

          <div className="form-group">
            <label htmlFor="savings-note">Observação (opcional)</label>
            <input
              id="savings-note"
              type="text"
              maxLength={200}
              placeholder="Ex.: reserva de emergência"
              value={note}
              onChange={event => setNote(event.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="submit" className="primary-button">
              {mode === 'withdrawal' ? 'Confirmar retirada' : 'Guardar'}
            </button>
          </div>
        </form>
      </PfModal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir movimentação?"
        message="Essa ação não poderá ser desfeita."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <Toast key={toast?.id ?? 'empty'} toast={toast} onClose={closeToast} />
    </section>
  )
}
