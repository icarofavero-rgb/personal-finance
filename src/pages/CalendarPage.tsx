import { useCallback, useMemo, useState } from 'react'
import {
  Barcode,
  BellRing,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  HandCoins,
  Pencil,
  Plus,
  Receipt,
  Scissors,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import ConfirmDialog from '../components/ConfirmDialog'
import DatePicker from '../components/DatePicker'
import PfModal from '../components/PfModal'
import SelectField from '../components/SelectField'
import Toast, { type ToastMessage } from '../components/Toast'
import { buildCalendarEvents, monthBounds, type CalendarEvent, type CalendarEventKind } from '../services/calendarEvents'
import { getCards } from '../services/cardsStorage'
import { getTransactions } from '../services/storage'
import { getCardPurchases } from '../services/cardPurchasesStorage'
import { getCardPayments } from '../services/cardPaymentsStorage'
import { getDebtorsData } from '../services/debtors/debtorsStorage'
import { getManualForecasts } from '../services/manualForecastStorage'
import {
  addReminder,
  deleteReminder,
  getReminders,
  toggleReminderDone,
  updateReminder,
  type Reminder,
  type ReminderInput,
  type ReminderKind,
} from '../services/remindersStorage'
import '../styles/savings.css'
import '../styles/calendar-page.css'

/** Avisa o resto do app (sininho e notificações) que os lembretes mudaram. */
export const REMINDERS_CHANGED_EVENT = 'personal-finance-reminders-changed'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const KIND_META: Record<CalendarEventKind, { label: string; icon: typeof Receipt; tone: string }> = {
  'invoice-due': { label: 'Vencimento de fatura', icon: CreditCard, tone: 'invoice' },
  'invoice-closing': { label: 'Fechamento de fatura', icon: Scissors, tone: 'closing' },
  reminder: { label: 'Lembrete', icon: BellRing, tone: 'reminder' },
  'forecast-income': { label: 'Entrada prevista', icon: TrendingUp, tone: 'income' },
  'forecast-expense': { label: 'Saída prevista', icon: TrendingDown, tone: 'expense' },
  'debt-due': { label: 'A receber', icon: HandCoins, tone: 'debt' },
  boleto: { label: 'Boleto', icon: Barcode, tone: 'reminder' },
}

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

const todayKey = () => new Date().toLocaleDateString('en-CA')

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function safe<T>(read: () => T, fallback: T): T {
  try {
    return read()
  } catch {
    return fallback
  }
}

function loadSources(reminders: Reminder[]) {
  return {
    cards: safe(getCards, []),
    purchases: safe(getCardPurchases, []),
    payments: safe(getCardPayments, []),
    forecasts: safe(getManualForecasts, []),
    debts: safe(() => getDebtorsData().debts, []),
    reminders,
    // Boletos cadastrados em "Nova transação" aparecem no dia do pagamento
    transactions: safe(getTransactions, []),
  }
}

const EMPTY_FORM: ReminderInput = {
  title: '',
  kind: 'boleto',
  date: todayKey(),
  recurrence: 'none',
  amountCents: undefined,
  notes: undefined,
}

export default function CalendarPage() {
  const [reminders, setReminders] = useState<Reminder[]>(() => safe(getReminders, []))
  const [month, setMonth] = useState(() => todayKey().slice(0, 7))
  const [selected, setSelected] = useState(todayKey)
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null)
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null)
  const [form, setForm] = useState<ReminderInput>(EMPTY_FORM)
  const [amountText, setAmountText] = useState('')
  const [toDelete, setToDelete] = useState<Reminder | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const closeToast = useCallback(() => setToast(null), [])
  const closeForm = useCallback(() => setEditing(null), [])
  const showToast = (type: 'success' | 'error', message: string) =>
    setToast({ id: crypto.randomUUID(), type, message })

  const today = todayKey()

  const refresh = () => {
    setReminders(safe(getReminders, []))
    window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT))
  }

  const sources = useMemo(() => loadSources(reminders), [reminders])

  const monthEvents = useMemo(() => {
    const { from, to } = monthBounds(month)
    return safe(() => buildCalendarEvents(sources, from, to), [])
  }, [sources, month])

  const upcoming = useMemo(() => {
    const end = new Date(`${today}T12:00:00`)
    end.setDate(end.getDate() + 7)
    return safe(() => buildCalendarEvents(sources, today, end.toLocaleDateString('en-CA')), []).filter(
      event => !event.done && event.kind !== 'invoice-closing'
    )
  }, [sources, today])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of monthEvents) {
      map.set(event.date, [...(map.get(event.date) ?? []), event])
    }
    return map
  }, [monthEvents])

  // Grade: começa no domingo da primeira semana do mês.
  const cells = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number)
    const first = new Date(year, monthNumber - 1, 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = date.toLocaleDateString('en-CA')
      return { key, day: date.getDate(), inMonth: key.startsWith(month) }
    })
  }, [month])

  const selectedEvents = eventsByDay.get(selected) ?? []

  function goMonth(delta: number) {
    setSlide(delta > 0 ? 'next' : 'prev')
    const next = shiftMonth(month, delta)
    setMonth(next)
    setSelected(today.startsWith(next) ? today : `${next}-01`)
  }

  function goToday() {
    setSlide(today.slice(0, 7) >= month ? 'next' : 'prev')
    setMonth(today.slice(0, 7))
    setSelected(today)
  }

  function openForm(reminder: Reminder | 'new') {
    if (reminder === 'new') {
      setForm({ ...EMPTY_FORM, date: selected })
      setAmountText('')
    } else {
      setForm({
        title: reminder.title,
        kind: reminder.kind,
        date: reminder.date,
        recurrence: reminder.recurrence,
        amountCents: reminder.amountCents,
        notes: reminder.notes,
      })
      setAmountText(reminder.amountCents ? (reminder.amountCents / 100).toFixed(2) : '')
    }
    setEditing(reminder)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cents = amountText.trim() === '' ? undefined : Math.round(Number(amountText.replace(',', '.')) * 100)

    if (cents !== undefined && (!Number.isSafeInteger(cents) || cents <= 0)) {
      showToast('error', 'O valor precisa ser maior que zero (ou deixe em branco).')
      return
    }

    try {
      const input = { ...form, amountCents: cents }

      if (editing === 'new') addReminder(input)
      else if (editing) updateReminder(editing.id, input)

      setSelected(form.date)
      setMonth(form.date.slice(0, 7))
      setEditing(null)
      refresh()
      showToast('success', editing === 'new' ? 'Lembrete criado!' : 'Lembrete atualizado.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Não foi possível salvar o lembrete.')
    }
  }

  function toggleDone(event: CalendarEvent) {
    if (!event.reminderId) return

    try {
      toggleReminderDone(event.reminderId, event.date)
      refresh()
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Não foi possível atualizar.')
    }
  }

  function confirmDelete() {
    if (!toDelete) return

    try {
      deleteReminder(toDelete.id)
      refresh()
      showToast('success', 'Lembrete excluído.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Não foi possível excluir.')
    } finally {
      setToDelete(null)
    }
  }

  // Só a primeira letra maiúscula ("Novembro de 2026", não "Novembro De 2026").
  const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)

  const monthTitle = (() => {
    const [year, monthNumber] = month.split('-').map(Number)
    return capitalize(
      new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    )
  })()

  const selectedTitle = capitalize(
    new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  )

  const renderEvent = (event: CalendarEvent, withDate = false) => {
    const meta = KIND_META[event.kind]
    const Icon = meta.icon
    const reminder = event.reminderId ? reminders.find(item => item.id === event.reminderId) : undefined

    return (
      <li key={event.id} className={`pf-cal-event tone-${meta.tone} ${event.done ? 'is-done' : ''}`}>
        <span className="pf-cal-event-icon">
          <Icon size={17} />
        </span>
        <div className="pf-cal-event-info">
          <strong>{event.title}</strong>
          <small>
            {withDate && `${event.date.split('-').reverse().slice(0, 2).join('/')} · `}
            {event.subtitle ?? meta.label}
          </small>
        </div>
        {event.amountCents !== undefined && <span className="pf-cal-event-amount">{money(event.amountCents)}</span>}
        {reminder && !withDate && (
          <div className="pf-cal-event-actions">
            <button
              type="button"
              className={`pf-cal-check ${event.done ? 'is-checked' : ''}`}
              aria-label={event.done ? 'Marcar como pendente' : 'Marcar como pago/feito'}
              onClick={() => toggleDone(event)}
            >
              <Check size={15} />
            </button>
            <button type="button" className="history-icon-button" aria-label="Editar" onClick={() => openForm(reminder)}>
              <Pencil size={15} />
            </button>
            <button type="button" className="history-icon-button" aria-label="Excluir" onClick={() => setToDelete(reminder)}>
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <section className="pf-cal">
      <div className="pf-section-heading pf-cal-heading">
        <div>
          <span className="eyebrow">AGENDA FINANCEIRA</span>
          <h1>
            Calendário<span className="neon-dot">.</span>
          </h1>
          <p>Faturas, boletos e lembretes em um só lugar.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => openForm('new')}>
          <Plus size={17} />
          Novo lembrete
        </button>
      </div>

      <div className="pf-cal-layout">
        <div className="panel pf-cal-board">
          <div className="pf-cal-toolbar">
            <button type="button" className="pf-cal-nav" aria-label="Mês anterior" onClick={() => goMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <h3>{monthTitle}</h3>
            <button type="button" className="pf-cal-nav" aria-label="Próximo mês" onClick={() => goMonth(1)}>
              <ChevronRight size={18} />
            </button>
            <button type="button" className="pf-cal-today" onClick={goToday}>
              Hoje
            </button>
          </div>

          <div className="pf-cal-weekdays" aria-hidden="true">
            {WEEKDAYS.map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div key={month} className={`pf-cal-grid ${slide ? `slide-${slide}` : ''}`} role="grid" aria-label={monthTitle}>
            {cells.map(cell => {
              const events = eventsByDay.get(cell.key) ?? []
              const pending = events.filter(event => !event.done)
              const tones = [...new Set(pending.map(event => KIND_META[event.kind].tone))].slice(0, 3)

              return (
                <button
                  key={cell.key}
                  type="button"
                  role="gridcell"
                  className={[
                    'pf-cal-day',
                    cell.inMonth ? '' : 'is-outside',
                    cell.key === today ? 'is-today' : '',
                    cell.key === selected ? 'is-selected' : '',
                    pending.some(event => event.kind === 'invoice-due' || event.kind === 'reminder') ? 'has-due' : '',
                  ].join(' ')}
                  aria-label={`${cell.day}${events.length ? `, ${events.length} evento(s)` : ''}`}
                  aria-selected={cell.key === selected}
                  onClick={() => {
                    setSelected(cell.key)
                    if (!cell.inMonth) {
                      setSlide(cell.key > `${month}-31` ? 'next' : 'prev')
                      setMonth(cell.key.slice(0, 7))
                    }
                  }}
                >
                  <span className="pf-cal-day-number">{cell.day}</span>
                  {tones.length > 0 && (
                    <span className="pf-cal-dots">
                      {tones.map(tone => (
                        <i key={tone} className={`tone-${tone}`} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="pf-cal-legend">
            {(['invoice', 'reminder', 'closing', 'income', 'expense', 'debt'] as const).map(tone => {
              const entry = Object.values(KIND_META).find(meta => meta.tone === tone)!
              return (
                <span key={tone}>
                  <i className={`tone-${tone}`} /> {entry.label}
                </span>
              )
            })}
          </div>
        </div>

        <div className="pf-cal-side">
          <div className="panel pf-cal-day-panel">
            <div className="pf-card-heading">
              <div>
                <h3>
                  <CalendarClock size={18} /> <span>{selectedTitle}</span>
                </h3>
                <p>{selectedEvents.length === 0 ? 'Nada marcado para este dia.' : `${selectedEvents.length} item(ns)`}</p>
              </div>
              <button type="button" className="pf-ghost-button" onClick={() => openForm('new')}>
                <Plus size={16} /> Lembrete
              </button>
            </div>

            {selectedEvents.length > 0 && (
              <ul key={selected} className="pf-cal-events">
                {selectedEvents.map(event => renderEvent(event))}
              </ul>
            )}
          </div>

          <div className="panel pf-cal-day-panel">
            <div className="pf-card-heading">
              <div>
                <h3>
                  <FileText size={18} /> Próximos 7 dias
                </h3>
                <p>{upcoming.length === 0 ? 'Nenhum vencimento chegando. 🎉' : 'O que vence em breve'}</p>
              </div>
            </div>

            {upcoming.length > 0 && <ul className="pf-cal-events">{upcoming.map(event => renderEvent(event, true))}</ul>}
          </div>
        </div>
      </div>

      <PfModal
        open={editing !== null}
        title={editing === 'new' ? 'Novo lembrete' : 'Editar lembrete'}
        subtitle="Você será avisado no app e, no Android, também fora dele."
        onClose={closeForm}
      >
        <form onSubmit={submit} className="pf-form">
          <div className="form-group">
            <label htmlFor="reminder-title">Título</label>
            <input
              id="reminder-title"
              type="text"
              maxLength={80}
              placeholder="Ex.: Boleto da internet"
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reminder-kind">Tipo</label>
              <SelectField
                id="reminder-kind"
                value={form.kind}
                onChange={value => setForm({ ...form, kind: value as ReminderKind })}
                options={[
                  { value: 'boleto', label: 'Boleto' },
                  { value: 'conta', label: 'Conta' },
                  { value: 'outro', label: 'Outro lembrete' },
                ]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reminder-amount">Valor (opcional)</label>
              <input
                id="reminder-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={amountText}
                onChange={event => setAmountText(event.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reminder-date">Data</label>
            <DatePicker
              id="reminder-date"
              value={form.date}
              onChange={value => setForm({ ...form, date: value })}
              required
            />
          </div>

          <label className="pf-switch">
            <input
              type="checkbox"
              checked={form.recurrence === 'monthly'}
              onChange={event => setForm({ ...form, recurrence: event.target.checked ? 'monthly' : 'none' })}
            />
            <span className="pf-switch-track" aria-hidden="true" />
            <span>Repetir todo mês</span>
          </label>

          <div className="form-group">
            <label htmlFor="reminder-notes">Observação (opcional)</label>
            <input
              id="reminder-notes"
              type="text"
              maxLength={300}
              value={form.notes ?? ''}
              onChange={event => setForm({ ...form, notes: event.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="submit" className="primary-button">
              {editing === 'new' ? 'Criar lembrete' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </PfModal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir lembrete?"
        message={
          toDelete?.recurrence === 'monthly'
            ? 'Todas as repetições mensais deste lembrete serão removidas.'
            : 'Essa ação não poderá ser desfeita.'
        }
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <Toast key={toast?.id ?? 'empty'} toast={toast} onClose={closeToast} />
    </section>
  )
}
