import AccentSelect from '../components/AccentSelect'
import { formatDecimal } from '../services/format'
import { useEffect, useRef, useState } from 'react'
import {
  UsersRound,
  Plus,
  Wallet,
  HandCoins,
  X,
  Pencil,
} from 'lucide-react'

import {
  getDebtorsData,
  addDebtor,
  addDebtorDebt,
  addDebtorPayment,
  updateDebtor,
  updateDebtorDebt,
  updateDebtorPayment,
} from '../services/debtors/debtorsStorage'

import type {
  Debtor,
  DebtorDebt,
  DebtorPayment,
} from '../services/debtors/debtorsTypes'

import {
  calculateDebtSummary,
} from '../services/debtors/debtorsCalculations'

import DatePicker from '../components/DatePicker'

export default function Debtors() {
  const [debtors, setDebtors] = useState<Debtor[]>(() =>
    getDebtorsData().debtors
  )

  const [expandedDebtorIds, setExpandedDebtorIds] = useState<string[]>([])

const [debtorSearch, setDebtorSearch] = useState('')

const [debtorStatusFilter, setDebtorStatusFilter] =
  useState<'all' | 'pending' | 'paid'>('all')

const [debtorSort, setDebtorSort] =
  useState<'name' | 'highest' | 'lowest'>('name')

  // Dívidas e recebimentos já armazenados
  const [debts, setDebts] = useState<DebtorDebt[]>(() =>
    getDebtorsData().debts
  )

const [payments, setPayments] = useState<DebtorPayment[]>(() =>
  getDebtorsData().payments
)
  // Controle do formulário de dívidas
  const [selectedDebtorId, setSelectedDebtorId] =
    useState<string | null>(null)

  const [debtDescription, setDebtDescription] = useState('')
  const [debtAmount, setDebtAmount] = useState('')
  const [debtInstallments, setDebtInstallments] = useState('1')

  const [debtDate, setDebtDate] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  const [debtError, setDebtError] = useState('')
const [editingDebtId, setEditingDebtId] =
  useState<string | null>(null)

const [debtDueDate, setDebtDueDate] = useState('')
  
const [selectedPaymentDebtId, setSelectedPaymentDebtId] =
  useState<string | null>(null)

const [paymentAmount, setPaymentAmount] = useState('')
const [paymentNotes, setPaymentNotes] = useState('')
const [paymentDate, setPaymentDate] = useState(() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const [paymentError, setPaymentError] = useState('')

const [editingPaymentId, setEditingPaymentId] =
  useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

const [editingDebtorId, setEditingDebtorId] =
  useState<string | null>(null)

  type DebtorModalType =
  | 'new'
  | 'edit'
  | 'debt'
  | 'payment'

const [closingDebtorModal, setClosingDebtorModal] =
  useState<DebtorModalType | null>(null)

const debtorModalTimer =
  useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleClose() {
  setShowForm(false)
  setName('')
  setNotes('')
  setError('')
  setEditingDebtorId(null)
}

  function closeDebtorModal(mode: DebtorModalType) {
  if (closingDebtorModal !== null) return
if (mode === 'edit' && editingDebtorId === null) return
  if (mode === 'new' && !showForm) return
  if (mode === 'debt' && selectedDebtorId === null) return
  if (mode === 'payment' && selectedPaymentDebtId === null) return

  setClosingDebtorModal(mode)

  if (debtorModalTimer.current !== null) {
    clearTimeout(debtorModalTimer.current)
  }

  debtorModalTimer.current = setTimeout(() => {
    if (mode === 'new' || mode === 'edit') {
  handleClose()
    } else if (mode === 'debt') {
  setSelectedDebtorId(null)
  setEditingDebtId(null)
  setDebtDescription('')
  setDebtAmount('')
  setDebtInstallments('1')
  setDebtDueDate('')
  setDebtError('')

} else {
  setSelectedPaymentDebtId(null)
  setEditingPaymentId(null)
  setPaymentAmount('')
  setPaymentNotes('')
  setPaymentError('')
}

    setClosingDebtorModal(null)
    debtorModalTimer.current = null
  }, 250)
}

useEffect(() => {
  function handleEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

if (showForm) {
  event.preventDefault()

  closeDebtorModal(
    editingDebtorId !== null ? 'edit' : 'new'
  )
    } else if (selectedDebtorId !== null) {
      event.preventDefault()
      closeDebtorModal('debt')
    } else if (selectedPaymentDebtId !== null) {
      event.preventDefault()
      closeDebtorModal('payment')
    }
  }

  window.addEventListener('keydown', handleEscape)

  return () => {
    window.removeEventListener('keydown', handleEscape)
  }
})

useEffect(() => {
  return () => {
    if (debtorModalTimer.current !== null) {
      clearTimeout(debtorModalTimer.current)
    }
  }
}, [])

  
function handleSave(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setError('')

  const trimmedName = name.trim()

  if (!trimmedName) {
    setError('Informe o nome do devedor.')
    return
  }

  try {
    if (editingDebtorId !== null) {
      updateDebtor(editingDebtorId, {
        name: trimmedName,
        notes: notes.trim(),
      })
    } else {
      const newDebtor: Debtor = {
        id: crypto.randomUUID(),
        name: trimmedName,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      }

      addDebtor(newDebtor)
    }

    setDebtors(getDebtorsData().debtors)
    handleClose()
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : 'Não foi possível salvar o devedor.'
    )
  }
}


  

function handleSaveDebt(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()
  setDebtError('')

  if (!selectedDebtorId) {
    setDebtError('Selecione um devedor.')
    return
  }

  const description = debtDescription.trim()
  const amountCents = Math.round(Number(debtAmount) * 100)
  const installments = Number(debtInstallments)

  if (!description) {
    setDebtError('Informe a descrição da dívida.')
    return
  }

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0
  ) {
    setDebtError('Informe um valor válido.')
    return
  }

  if (
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 120
  ) {
    setDebtError('Informe entre 1 e 120 parcelas.')
    return
  }

  if (!debtDate) {
    setDebtError('Informe a data da dívida.')
    return
  }

  try {
    if (editingDebtId !== null) {
      updateDebtorDebt(editingDebtId, {
        description,
        amountCents,
        installments,
        date: debtDate,
        dueDate: debtDueDate || undefined,
      })
    } else {
      const newDebt: DebtorDebt = {
        id: crypto.randomUUID(),
        debtorId: selectedDebtorId,
        description,
        amountCents,
        installments,
        date: debtDate,
        dueDate: debtDueDate || undefined,
        createdAt: new Date().toISOString(),
      }

      addDebtorDebt(newDebt)
    }

    const updatedData = getDebtorsData()

    setDebts(updatedData.debts)
    setPayments(updatedData.payments)

    setSelectedDebtorId(null)
    setEditingDebtId(null)
    setDebtDescription('')
    setDebtAmount('')
    setDebtInstallments('1')
    setDebtDueDate('')
    setDebtError('')

  } catch (error) {
    setDebtError(
      error instanceof Error
        ? error.message
        : 'Não foi possível salvar a dívida.'
    )
  }
}



const debtSummaries = debts.map(debt =>
  calculateDebtSummary(debt, payments)
)

const totalLentCents = debtSummaries.reduce(
  (total, summary) => total + summary.totalCents,
  0
)

const totalReceivedCents = debtSummaries.reduce(
  (total, summary) => total + summary.receivedCents,
  0
)

const totalRemainingCents = debtSummaries.reduce(
  (total, summary) => total + summary.remainingCents,
  0
)

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function handleSavePayment(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()
  setPaymentError('')

  if (!selectedPaymentDebtId) {
    setPaymentError('Selecione uma dívida.')
    return
  }

  const amountCents = Math.round(
    Number(paymentAmount) * 100
  )

  if (
    paymentAmount.trim() === '' ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0
  ) {
    setPaymentError('Informe um valor válido.')
    return
  }

  if (!paymentDate) {
    setPaymentError('Informe a data do pagamento.')
    return
  }

const currentDebt = debts.find(
  debt => debt.id === selectedPaymentDebtId
)

if (!currentDebt) {
  setPaymentError('Dívida não encontrada.')
  return
}

const summary = calculateDebtSummary(currentDebt, payments)

// Ao editar, descontamos o valor antigo do pagamento
// para calcular corretamente o máximo permitido.
const previousPayment = editingPaymentId
  ? payments.find(payment => payment.id === editingPaymentId)
  : undefined

const availableCents =
  summary.remainingCents +
  (previousPayment?.amountCents ?? 0)

if (amountCents > availableCents) {
  setPaymentError(
    availableCents <= 0
      ? 'Esta dívida já está quitada. Não é possível registrar outro pagamento.'
      : `O valor máximo permitido é ${formatCents(availableCents)}.`
  )
  return
}

  try {
    if (editingPaymentId !== null) {
      updateDebtorPayment(editingPaymentId, {
        amountCents,
        date: paymentDate,
        notes: paymentNotes.trim(),
      })
    } else {
      const newPayment: DebtorPayment = {
        id: crypto.randomUUID(),
        debtId: selectedPaymentDebtId,
        amountCents,
        date: paymentDate,
        notes: paymentNotes.trim(),
        createdAt: new Date().toISOString(),
      }

      addDebtorPayment(newPayment)
    }

    const updatedData = getDebtorsData()
    setPayments(updatedData.payments)

    setSelectedPaymentDebtId(null)
    setEditingPaymentId(null)
    setPaymentAmount('')
    setPaymentNotes('')
    setPaymentError('')
  } catch (error) {
    setPaymentError(
      error instanceof Error
        ? error.message
        : 'Não foi possível salvar o recebimento.'
    )
  }
}

function toggleDebtorDetails(debtorId: string) {
  setExpandedDebtorIds(current =>
    current.includes(debtorId)
      ? current.filter(id => id !== debtorId)
      : [...current, debtorId]
  )
}


const normalizedDebtorSearch = debtorSearch
  .trim()
  .toLocaleLowerCase('pt-BR')

const debtorBalances = new Map(
  debtors.map(debtor => {
    const personDebts = debts.filter(
      debt => debt.debtorId === debtor.id
    )

    const remainingCents = personDebts.reduce(
      (total, debt) =>
        total +
        calculateDebtSummary(debt, payments).remainingCents,
      0
    )

    return [
      debtor.id,
      {
        remainingCents,
        hasDebts: personDebts.length > 0,
      },
    ] as const
  })
)

const filteredDebtors = debtors
  .filter(debtor => {
    const matchesSearch = debtor.name
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedDebtorSearch)

    const balance = debtorBalances.get(debtor.id)

    if (!matchesSearch) return false

    if (debtorStatusFilter === 'pending') {
      return (balance?.remainingCents ?? 0) > 0
    }

    if (debtorStatusFilter === 'paid') {
      return (
        balance?.hasDebts === true &&
        balance.remainingCents === 0
      )
    }

    return true
  })
  .sort((a, b) => {
    if (debtorSort === 'highest') {
      return (
        (debtorBalances.get(b.id)?.remainingCents ?? 0) -
        (debtorBalances.get(a.id)?.remainingCents ?? 0)
      )
    }

    if (debtorSort === 'lowest') {
      return (
        (debtorBalances.get(a.id)?.remainingCents ?? 0) -
        (debtorBalances.get(b.id)?.remainingCents ?? 0)
      )
    }

    return a.name.localeCompare(b.name, 'pt-BR')
  })

  return (
    <section className="debtors-page">
      

<div className="panel-heading debtors-page-heading">
  <div className="debtors-heading-content">
    <span className="eyebrow">
      CONTROLE DE RECEBIMENTOS
    </span>

    <h1>
      Meus devedores<span className="neon-dot">.</span>
    </h1>

    <p>
      Gerencie empréstimos, compras e valores a receber.
    </p>
  </div>


  <button
    type="button"
    className="primary-button debtors-new-button"
    onClick={() => setShowForm(true)}
  >
    <Plus size={18} />
    Novo devedor
  </button>
</div>



<div className="debtors-summary">
  <div className="panel">
    <Wallet size={24} />
    <p>Total emprestado</p>
    <h3>{formatCents(totalLentCents)}</h3>
  </div>

  <div className="panel">
    <HandCoins size={24} />
    <p>Total recebido</p>
    <h3>{formatCents(totalReceivedCents)}</h3>
  </div>

  <div className="panel">
    <UsersRound size={24} />
    <p>Saldo a receber</p>
    <h3>{formatCents(totalRemainingCents)}</h3>
  </div>
</div>


      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Pessoas cadastradas</h3>
            
<p>
  {debtors.length === 0
    ? 'Nenhuma pessoa cadastrada.'
    : `${filteredDebtors.length} de ${debtors.length} pessoa(s) exibida(s).`}
</p>

          </div>
        </div>

<div className="debtors-toolbar">
  <div className="form-group">
    <label htmlFor="debtor-search">
      Buscar pessoa
    </label>

    <input
      id="debtor-search"
      type="search"
      value={debtorSearch}
      onChange={event =>
        setDebtorSearch(event.target.value)
      }
      placeholder="Pesquisar pelo nome..."
    />
  </div>

  
<div className="form-group">
  <AccentSelect
    label="Situação"
    value={debtorStatusFilter}
    onChange={setDebtorStatusFilter}
    options={[
      { value: 'all', label: 'Todos' },
      { value: 'pending', label: 'Com saldo pendente' },
      { value: 'paid', label: 'Quitados' },
    ]}
  />
</div>

<div className="form-group">
  <AccentSelect
    label="Ordenar por"
    value={debtorSort}
    onChange={setDebtorSort}
    options={[
      { value: 'name', label: 'Nome (A–Z)' },
      { value: 'highest', label: 'Maior saldo' },
      { value: 'lowest', label: 'Menor saldo' },
    ]}
  />
</div>
</div>

        {debtors.length === 0 ? (
          <div className="empty-state">
            <UsersRound size={36} />
            <strong>Nenhum devedor cadastrado</strong>
            <p>
              Clique em Novo devedor para cadastrar uma pessoa.
            </p>
          </div>
        ) : (
          <div className="debtors-list">
            {filteredDebtors.length === 0 && (
  <div className="empty-state" role="status">
    <UsersRound size={30} />
    <strong>Nenhum resultado encontrado</strong>
    <p>
      Tente outra busca ou altere o filtro selecionado.
    </p>
  </div>
)}
            {filteredDebtors.map(debtor => (
              <div className="debtor-item" key={debtor.id}>
                
<div className="debtor-compact-header">
  <div>
    <strong>{debtor.name}</strong>
    <p>
      {debts.filter(debt => debt.debtorId === debtor.id).length}{' '}
      dívida(s)
    </p>
  </div>

<button
  type="button"
  className="debtor-expand-button"
  onClick={() => {
    setEditingDebtorId(debtor.id)
    setName(debtor.name)
    setNotes(debtor.notes ?? '')
    setError('')
    setShowForm(true)
  }}
>
  <Pencil size={14} />
  Editar
</button>

  <button
    type="button"
    className="debtor-expand-button"
    aria-expanded={expandedDebtorIds.includes(debtor.id)}
    onClick={() => toggleDebtorDetails(debtor.id)}
  >
    {expandedDebtorIds.includes(debtor.id)
      ? 'Recolher'
      : 'Ver detalhes'}
  </button>
</div>

<div className="debtor-compact-balance">
  <span>Saldo a receber</span>
  <strong>
    {formatCents(
      debts
        .filter(debt => debt.debtorId === debtor.id)
        .reduce(
          (total, debt) =>
            total +
            calculateDebtSummary(debt, payments).remainingCents,
          0
        )
    )}
  </strong>
</div>

<div
  className={`debtor-expand-content ${
    expandedDebtorIds.includes(debtor.id) ? 'is-open' : ''
  }`}
  aria-hidden={!expandedDebtorIds.includes(debtor.id)}
  inert={!expandedDebtorIds.includes(debtor.id)}
>
  <div className="debtor-expand-inner">
<div className="debtor-debts">
  {debts
    .filter(debt => debt.debtorId === debtor.id)
    .map(debt => {
      const summary = calculateDebtSummary(debt, payments)

      return (
        
<div className="debtor-debt-card" key={debt.id}>
  <div className="debtor-debt-header">
    <div>
      <strong>{debt.description}</strong>
      <span>
        {debt.installments} parcela(s) ·{' '}
        {debt.date.split('-').reverse().join('/')}
      </span>
    </div>

    <span
      className={`debtor-debt-status status-${summary.status}`}
    >
      {summary.status === 'paid'
        ? 'Quitada'
        : summary.status === 'partial'
          ? 'Parcialmente paga'
          : 'Pendente'}
    </span>

<button
  type="button"
  className="debtor-expand-button"
  onClick={() => {
    setEditingDebtId(debt.id)
    setSelectedDebtorId(debt.debtorId)

    setDebtDescription(debt.description)
    setDebtAmount(
      (debt.amountCents / 100).toFixed(2)
    )
    setDebtInstallments(
      String(debt.installments)
    )
    setDebtDate(debt.date)
    setDebtDueDate(debt.dueDate ?? '')
    setDebtError('')
  }}
>
  <Pencil size={14} />
  Editar dívida
</button>

  </div>

  <div className="debtor-debt-values">
    <div>
      <span>Valor total</span>
      <strong>{formatCents(summary.totalCents)}</strong>
    </div>

    <div>
      <span>Total recebido</span>
      <strong>{formatCents(summary.receivedCents)}</strong>
    </div>

    <div>
      <span>Saldo restante</span>
      <strong>{formatCents(summary.remainingCents)}</strong>
    </div>
  </div>

  <div className="debtor-debt-progress">
    <div className="debtor-debt-progress-label">
      <span>Progresso de recebimento</span>
      <strong>{formatDecimal(summary.progressPercent)}%</strong>
    </div>

    <div
      className="debtor-debt-progress-track"
      role="progressbar"
      aria-label={`Progresso de ${debt.description}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={summary.progressPercent}
    >
      <div
        className="debtor-debt-progress-fill"
        style={{ width: `${summary.progressPercent}%` }}
      />
    </div>
  </div>

<details className="debtor-payment-history">
  <summary>
    Histórico de pagamentos (
    {payments.filter(payment => payment.debtId === debt.id).length})
  </summary>

    {payments.filter(payment => payment.debtId === debt.id)
      .length === 0 ? (
      <p>Nenhum pagamento registrado.</p>
    ) : (
      payments
        .filter(payment => payment.debtId === debt.id)
        .slice()
        .sort((a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt)
        )
        .map(payment => (
          <div
            className="debtor-payment-history-item"
            key={payment.id}
          >
            <div>
              <strong>
                {payment.notes?.trim() || 'Pagamento recebido'}
              </strong>
              <span>
                {payment.date.split('-').reverse().join('/')}
              </span>
            </div>

            <strong className="debtor-payment-history-value">
              + {formatCents(payment.amountCents)}
            </strong>

<button
  type="button"
  className="debtor-expand-button"
  onClick={() => {
    setEditingPaymentId(payment.id)
    setSelectedPaymentDebtId(payment.debtId)
    setPaymentAmount(
      (payment.amountCents / 100).toFixed(2)
    )
    setPaymentDate(payment.date)
    setPaymentNotes(payment.notes ?? '')
    setPaymentError('')
  }}
>
  <Pencil size={14} />
  Editar
</button>

          </div>
        ))
    )}
 </details>

<div className="debtor-debt-footer">
  <button
    type="button"
    className="primary-button"
    onClick={() => {
      setPaymentError('')
      setPaymentAmount('')
      setPaymentNotes('')
      setSelectedPaymentDebtId(debt.id)
    }}
  >
    <HandCoins size={16} />
    Registrar pagamento
  </button>
</div>


</div>

      )
    })}
</div>

                <div className="debtor-actions">
  <strong>
    {formatCents(
      debts
        .filter(debt => debt.debtorId === debtor.id)
        .reduce((total, debt) => {
          const summary = calculateDebtSummary(debt, payments)
          return total + summary.remainingCents
        }, 0)
    )}
  </strong>

  <button
    type="button"
    className="primary-button"
    onClick={() => setSelectedDebtorId(debtor.id)}
  >
      <Plus size={16} />
    Adicionar dívida
  </button>
</div>

  </div>
</div>

</div>
))}
          </div>
        )}
      </div>

      {showForm && (
        <div

className={`modal-overlay debtor-modal-overlay ${
  closingDebtorModal ===
  (editingDebtorId !== null ? 'edit' : 'new')
    ? 'is-closing'
    : ''
}`}

onClick={() =>
  closeDebtorModal(
    editingDebtorId !== null ? 'edit' : 'new'
  )
}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="debtor-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="debtor-modal-title">
  {editingDebtorId !== null
    ? 'Editar devedor'
    : 'Novo devedor'}
</h2>
                <p>
  {editingDebtorId !== null
    ? 'Atualize os dados da pessoa cadastrada.'
    : 'Cadastre uma pessoa para acompanhar suas dívidas.'}
</p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Fechar"
                onClick={() =>
  closeDebtorModal(
    editingDebtorId !== null ? 'edit' : 'new'
  )
}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="transaction-modal-content">
                <div className="form-group">
                  <label htmlFor="debtor-name">
                    Nome
                  </label>
                  <input
                    id="debtor-name"
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Ex.: Mariana"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="debtor-notes">
                    Observações (opcional)
                  </label>
                  <textarea
                    id="debtor-notes"
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    placeholder="Informações adicionais"
                    rows={3}
                  />
                </div>

                {error && (
                  <p role="alert" style={{ color: '#f87171' }}>
                    {error}
                  </p>
                )}
              </div>


<div className="modal-footer">
  <button
    type="button"
    className="cancel-button"
    onClick={() =>
      closeDebtorModal(
        editingDebtorId !== null ? 'edit' : 'new'
      )
    }
  >
    Cancelar
  </button>

  <button
    type="submit"
    className="primary-button"
  >
    {editingDebtorId !== null
      ? 'Salvar alterações'
      : 'Salvar devedor'}
  </button>
</div>

            </form>
          </div>
        </div>
      )}
      
{selectedDebtorId && (
  <div
    className={`modal-overlay debtor-modal-overlay ${
      closingDebtorModal === 'debt' ? 'is-closing' : ''
    }`}
    onClick={() => closeDebtorModal('debt')}
  >
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-modal-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="debt-modal-title">
  {editingDebtId !== null
    ? 'Editar dívida'
    : 'Adicionar dívida'}
</h2>
          <p>
  {editingDebtId !== null
    ? 'Atualize os dados da dívida cadastrada.'
    : 'Registre um valor que você tem a receber.'}
</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar"
          onClick={() => closeDebtorModal('debt')}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSaveDebt}>
        <div className="transaction-modal-content">
          <div className="form-group">
            <label htmlFor="debt-description">Descrição</label>
            <input
              id="debt-description"
              value={debtDescription}
              onChange={event =>
                setDebtDescription(event.target.value)
              }
              placeholder="Ex.: Empréstimo via PIX"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="debt-amount">Valor total (R$)</label>
            <input
              id="debt-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={debtAmount}
              onChange={event =>
                setDebtAmount(event.target.value)
              }
              placeholder="0,00"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="debt-installments">Parcelas</label>
              <input
                id="debt-installments"
                type="number"
                min="1"
                max="120"
                value={debtInstallments}
                onChange={event =>
                  setDebtInstallments(event.target.value)
                }
                required
              />
            </div>

            
<div className="form-group">
  <label htmlFor="debt-date">Data</label>

  <DatePicker
    id="debt-date"
    value={debtDate}
    onChange={setDebtDate}
    required
  />
</div>

          </div>
<div className="form-group">
  <label htmlFor="debt-due-date">
    Data de vencimento (opcional)
  </label>

  <DatePicker
    id="debt-due-date"
    value={debtDueDate}
    onChange={setDebtDueDate}
  />
</div>

          {debtError && (
            <p role="alert" style={{ color: '#f87171' }}>
              {debtError}
            </p>
          )}
        </div>


<div className="modal-footer">
  <button
    type="button"
    className="cancel-button"
onClick={() => closeDebtorModal('debt')}
  >
    Cancelar
  </button>

  <button
    type="submit"
    className="primary-button"
  >
{editingDebtId !== null
  ? 'Salvar alterações'
  : 'Salvar dívida'}
  </button>
</div>
      </form>
    </div>
  </div>
)}

{selectedPaymentDebtId && (
  <div
    className={`modal-overlay debtor-modal-overlay ${
      closingDebtorModal === 'payment' ? 'is-closing' : ''
    }`}
    onClick={() => closeDebtorModal('payment')}
  >
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>

<h2 id="payment-modal-title">
  {editingPaymentId !== null
    ? 'Editar recebimento'
    : 'Registrar pagamento'}
</h2>

          <p>Informe o valor recebido do devedor.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar"
          onClick={() => closeDebtorModal('payment')}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSavePayment}>
        <div className="transaction-modal-content">
          <div className="form-group">
            <label htmlFor="payment-amount">
              Valor recebido (R$)
            </label>
            <input
              id="payment-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={event =>
                setPaymentAmount(event.target.value)
              }
              placeholder="Ex.: 37,83"
              required
            />
          </div>

          
<div className="form-group">
  <label htmlFor="payment-date">Data</label>

  <DatePicker
    id="payment-date"
    value={paymentDate}
    onChange={setPaymentDate}
    required
  />
</div>


          <div className="form-group">
            <label htmlFor="payment-notes">
              Observações (opcional)
            </label>
            <textarea
              id="payment-notes"
              value={paymentNotes}
              onChange={event =>
                setPaymentNotes(event.target.value)
              }
              rows={3}
              placeholder="Ex.: Pagamento via PIX"
            />
          </div>

          {paymentError && (
            <p role="alert" style={{ color: '#f87171' }}>
              {paymentError}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="cancel-button"
            onClick={() => closeDebtorModal('payment')}
          >
            Cancelar
          </button>


<button
  type="submit"
  className="primary-button"
>
  {editingPaymentId !== null
    ? 'Salvar alterações'
    : 'Registrar pagamento'}
</button>

  </div>
</form>
    </div>
  </div>
)}

    </section>
  )
}
