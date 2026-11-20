
import { useState } from 'react'
import { Plus, Wallet, X, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import SelectField from '../components/SelectField'
import type { Transaction } from '../services/storage'
import {
  addBudget,
  deleteBudget,
  getBudgets,
  getBudgetsStrict,
  updateBudget,
  type Budget,
} from '../services/budgetsStorage'
import { calculateBudgetSummary } from '../services/budgetsCalculations'
import { formatDecimal } from '../services/format'
import { calculateBudgetsHistory } from '../services/budgetsHistory'

import {
  compareBudgetMonths,
  findBudgetHistoryMonth,
  getPreviousBudgetMonth,
  getBudgetVariationType,
} from '../services/budgetsComparison'

import MonthPicker from '../components/MonthPicker'

type BudgetsProps = {
  transactions: Transaction[]
}

const budgetCategories = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Assinaturas',
  'Outros',
]

function getCurrentMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}`
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatBudgetMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)

  const date = new Date(year, monthNumber - 1, 1)

  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export default function Budgets({ transactions }: BudgetsProps) {
  const [budgets, setBudgets] = useState<Budget[]>(() => getBudgets())
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [category, setCategory] = useState('Alimentação')
  const [limit, setLimit] = useState('')
  const [error, setError] = useState('')

  const monthlyBudgets = budgets.filter(
    budget => budget.month === selectedMonth
  )

  const summaries = monthlyBudgets.map(budget => ({
    budget,
    summary: calculateBudgetSummary(budget, transactions),
  }))

  const totalLimitCents = summaries.reduce(
    (total, item) => total + item.summary.limitCents,
    0
  )

  const totalSpentCents = summaries.reduce(
    (total, item) => total + item.summary.spentCents,
    0
  )

  const totalRemainingCents = totalLimitCents - totalSpentCents
const budgetHistory = calculateBudgetsHistory(budgets, transactions)

const previousMonth = getPreviousBudgetMonth(selectedMonth)

const currentHistory = findBudgetHistoryMonth(
  budgetHistory,
  selectedMonth
)

const previousHistory = findBudgetHistoryMonth(
  budgetHistory,
  previousMonth
)

const budgetComparison = compareBudgetMonths(
  currentHistory,
  previousHistory
)

function closeForm() {
  setShowForm(false)
  setEditingBudget(null)
  setCategory('Alimentação')
  setLimit('')
  setError('')
}

function openCreateForm() {
  setEditingBudget(null)
  setCategory('Alimentação')
  setLimit('')
  setError('')
  setShowForm(true)
}

function openEditForm(budget: Budget) {
  setEditingBudget(budget)
  setCategory(budget.category)
  setLimit((budget.limitCents / 100).toFixed(2))
  setError('')
  setShowForm(true)
}

function openDeleteConfirmation(budget: Budget) {
  setBudgetToDelete(budget)
  setDeleteError('')
}

function closeDeleteConfirmation() {
  setBudgetToDelete(null)
  setDeleteError('')
}

function handleDeleteBudget() {
  if (!budgetToDelete) return

  try {
    deleteBudget(budgetToDelete.id)

    setBudgets(getBudgetsStrict())
    closeDeleteConfirmation()
  } catch (caughtError) {
    setDeleteError(
      caughtError instanceof Error
        ? caughtError.message
        : 'Não foi possível excluir o orçamento.'
    )
  }
}


  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedLimit = limit.trim().replace(',', '.')
    const amount = Number(normalizedLimit)
    const limitCents = Math.round(amount * 100)

    if (
      normalizedLimit === '' ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(limitCents) ||
      limitCents <= 0 ||
      Math.abs(amount * 100 - limitCents) > 0.000001
    ) {
      setError('Informe um limite válido, com até duas casas decimais.')
      return
    }


try {
  if (editingBudget) {
    updateBudget({
      ...editingBudget,
      category,
      limitCents,
    })
  } else {
    const newBudget: Budget = {
      id: crypto.randomUUID(),
      category,
      month: selectedMonth,
      limitCents,
      createdAt: new Date().toISOString(),
    }

    addBudget(newBudget)
  }

  setBudgets(getBudgets())
  closeForm()
} catch (caughtError) {
  setError(
    caughtError instanceof Error
      ? caughtError.message
      : 'Não foi possível salvar o orçamento.'
  )
}
}

  return (
    <section className="budgets-page">
      <div className="panel-heading budgets-heading">
  <div className="budgets-heading-content">
    <span className="eyebrow">
      PLANEJAMENTO FINANCEIRO
    </span>

    <h1>
      Meus orçamentos<span className="neon-dot">.</span>
    </h1>

    <p>
      Defina limites e acompanhe suas despesas mensais.
    </p>
  </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Novo orçamento
        </button>
      </div>

      <div className="panel budget-period-panel">
        <label htmlFor="budget-month">Mês de referência</label>
        <MonthPicker
  id="budget-month"
  value={selectedMonth}
  onChange={setSelectedMonth}
/>
      </div>

      <div className="budgets-summary">
        <div className="panel">
          <p>Limite total</p>
          <h3>{formatCents(totalLimitCents)}</h3>
        </div>

        <div className="panel">
          <p>Total utilizado</p>
          <h3>{formatCents(totalSpentCents)}</h3>
        </div>

        <div className="panel">
          <p>Saldo disponível</p>
          <h3>{formatCents(totalRemainingCents)}</h3>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h3>Orçamentos cadastrados</h3>
            <p>
              {monthlyBudgets.length} {monthlyBudgets.length === 1 ? 'orçamento' : 'orçamentos'} neste mês.
            </p>
          </div>
        </div>

        {summaries.length === 0 ? (
          <div className="empty-state">
            <Wallet size={36} />
            <strong>Nenhum orçamento neste mês</strong>
            <p>Clique em Novo orçamento para começar.</p>
          </div>
        ) : (
          <div className="budget-list">
            {summaries.map(({ budget, summary }) => {
              const progress = Math.max(
                0,
                Math.min(summary.progressPercent, 100)
              )

              return (
                <div className="budget-card" key={budget.id}>
                  <div className="budget-card-header">
                    <strong>{budget.category}</strong>


<div className="budget-card-actions">
  <button
    type="button"
    className="budget-edit-button"
    onClick={() => openEditForm(budget)}
    aria-label={`Editar orçamento de ${budget.category}`}
    title="Editar orçamento"
  >
    <Pencil size={16} />
  </button>

  <button
    type="button"
    className="budget-delete-button"
    onClick={() => openDeleteConfirmation(budget)}
    aria-label={`Excluir orçamento de ${budget.category}`}
    title="Excluir orçamento"
  >
    <Trash2 size={16} />
  </button>
</div>

<span
  className={
    summary.progressPercent > 100
      ? 'budget-status exceeded'
: summary.progressPercent === 100
  ? 'budget-status reached'
  : summary.progressPercent >= 80
    ? 'budget-status warning'
        : 'budget-status normal'
  }
>
  {summary.progressPercent > 100
    ? 'Limite ultrapassado'
    : summary.progressPercent === 100
      ? 'Limite atingido'
      : summary.progressPercent >= 80
        ? 'Próximo do limite'
        : 'Dentro do limite'}
</span>

                  </div>

                  <div className="budget-card-values">
                    <span>
                      Utilizado: {formatCents(summary.spentCents)}
                    </span>
                    <span>
                      Limite: {formatCents(summary.limitCents)}
                    </span>
                  </div>

                  <div
                    className="budget-progress-track"
                    role="progressbar"
                    aria-label={`Orçamento de ${budget.category}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      
className={
  summary.progressPercent > 100
    ? 'budget-progress-fill exceeded'
    : summary.progressPercent === 100
      ? 'budget-progress-fill reached'
      : summary.progressPercent >= 80
        ? 'budget-progress-fill warning'
        : 'budget-progress-fill'
}

                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="budget-card-footer">
                    <span>
                      {formatDecimal(summary.progressPercent)}% utilizado
                    </span>
                    <strong>
                      {summary.remainingCents >= 0
                        ? `${formatCents(summary.remainingCents)} disponível`
                        : `${formatCents(
                            Math.abs(summary.remainingCents)
                          )} acima do limite`}
                    </strong>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

<div className="panel budget-comparison-panel">
  <div className="panel-heading">
    <div>
      <h3>Comparação mensal</h3>
      <p>
        {formatBudgetMonth(selectedMonth)} em relação a{' '}
        {formatBudgetMonth(previousMonth)}
      </p>
    </div>
  </div>

  {currentHistory.budgetCount === 0 ||
  previousHistory.budgetCount === 0 ? (


<div
  className="budget-comparison-empty"
  role="status"
>
  <p>
    {currentHistory.budgetCount === 0 &&
    previousHistory.budgetCount === 0
      ? 'Ainda não existem orçamentos cadastrados nesses dois meses.'
      : `Ainda não há dados suficientes para comparar ${formatBudgetMonth(
          selectedMonth
        )} com ${formatBudgetMonth(previousMonth)}.`}
  </p>

  <span>
    Cadastre orçamentos nos dois períodos para
    visualizar a evolução dos seus limites e gastos.
  </span>
</div>


  ) : null}

{currentHistory.budgetCount > 0 &&
 previousHistory.budgetCount > 0 && (

  <div className="budget-comparison-grid">

<div
  className={`budget-comparison-item variation-${getBudgetVariationType(
    budgetComparison.limitDifferenceCents
  )}`}
>
  <span>Variação do limite</span>

  <div className="budget-comparison-value">
    {budgetComparison.limitDifferenceCents > 0 ? (
      <TrendingUp size={20} />
    ) : budgetComparison.limitDifferenceCents < 0 ? (
      <TrendingDown size={20} />
    ) : (
      <Minus size={20} />
    )}

    <strong>
      {budgetComparison.limitDifferenceCents > 0 ? '+' : ''}
      {formatCents(budgetComparison.limitDifferenceCents)}
    </strong>
  </div>
</div>

<div
  className={`budget-comparison-item variation-${
    getBudgetVariationType(
  budgetComparison.spentDifferenceCents
)
  }`}
>
  <span>Variação dos gastos</span>

  <div className="budget-comparison-value">
    {budgetComparison.spentDifferenceCents > 0 ? (
      <TrendingUp size={20} />
    ) : budgetComparison.spentDifferenceCents < 0 ? (
      <TrendingDown size={20} />
    ) : (
      <Minus size={20} />
    )}

    <strong>
      {budgetComparison.spentDifferenceCents > 0 ? '+' : ''}
      {formatCents(budgetComparison.spentDifferenceCents)}
    </strong>
  </div>
</div>


<div
  className={`budget-comparison-item variation-${getBudgetVariationType(
    budgetComparison.progressDifference
  )}`}
>
  <span>Variação do consumo</span>

  <div className="budget-comparison-value">
    {budgetComparison.progressDifference > 0.000001 ? (
      <TrendingUp size={20} />
    ) : budgetComparison.progressDifference < -0.000001 ? (
      <TrendingDown size={20} />
    ) : (
      <Minus size={20} />
    )}

    <strong>
      {budgetComparison.progressDifference > 0.000001 ? '+' : ''}
      {formatDecimal(budgetComparison.progressDifference)}
      {' '}p.p.
    </strong>
  </div>
</div>

  </div>
  )}
</div>

<div className="panel budget-history-panel">
  <div className="panel-heading">
    <div>
      <h3>Histórico mensal</h3>
      <p>Compare seus limites e gastos entre diferentes meses.</p>
    </div>
  </div>

  {budgetHistory.length === 0 ? (
    <div className="empty-state">
      <Wallet size={32} />
      <strong>Nenhum histórico disponível</strong>
      <p>Cadastre um orçamento para começar.</p>
    </div>
  ) : (
    <div className="budget-history-scroll">
      <table className="budget-history-table">
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Limite</th>
            <th scope="col">Utilizado</th>
            <th scope="col">Disponível</th>
            <th scope="col">Consumo</th>
          </tr>
        </thead>

        <tbody>
          {budgetHistory.map(item => (
            <tr key={item.month}>
              
<td>
  <button
    type="button"
    className="budget-history-month-button"
    onClick={() => setSelectedMonth(item.month)}
    aria-label={`Visualizar orçamentos de ${formatBudgetMonth(item.month)}`}
    aria-current={
      selectedMonth === item.month ? 'date' : undefined
    }
  >
    {formatBudgetMonth(item.month)}
  </button>
</td>

              <td>{formatCents(item.limitCents)}</td>
              <td>{formatCents(item.spentCents)}</td>
              <td>{formatCents(item.remainingCents)}</td>
              
<td>
  <div className="budget-history-consumption">
    <span>{formatDecimal(item.progressPercent)}%</span>

    <div
      className="budget-history-track"
      role="progressbar"
      aria-label={`Consumo de ${formatBudgetMonth(item.month)}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.max(0, item.progressPercent))}
    >
      <div
        className={
          item.progressPercent > 100
            ? 'budget-history-fill exceeded'
            : item.progressPercent >= 80
              ? 'budget-history-fill warning'
              : 'budget-history-fill'
        }
        style={{
          width: `${Math.min(100, Math.max(0, item.progressPercent))}%`,
        }}
      />
    </div>
  </div>
</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="budget-modal-title">
  {editingBudget ? 'Editar orçamento' : 'Novo orçamento'}
</h2>
                <p>Defina um limite para {selectedMonth}.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Fechar"
                onClick={closeForm}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="transaction-modal-content">
                <div className="form-group">
                  <label htmlFor="budget-category">Categoria</label>
                 <SelectField
  id="budget-category"
  value={category}
  onChange={setCategory}
  options={budgetCategories.map(item => ({
    value: item,
    label: item,
  }))}
  placeholder="Selecione uma categoria"
/>
                </div>

                <div className="form-group">
                  <label htmlFor="budget-limit">
                    Limite mensal (R$)
                  </label>
                  <input
                    id="budget-limit"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={limit}
                    onChange={event => setLimit(event.target.value)}
                    placeholder="Ex.: 600.00"
                    required
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
                  onClick={closeForm}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-button">
  {editingBudget ? 'Salvar alterações' : 'Salvar orçamento'}
</button>
              </div>
            </form>
          </div>
        </div>
      )}

{budgetToDelete && (
  <div
    className="modal-overlay"
    onClick={closeDeleteConfirmation}
  >
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-delete-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="budget-delete-title">
            Excluir orçamento
          </h2>
          <p>Confirme antes de continuar.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar confirmação"
          onClick={closeDeleteConfirmation}
        >
          <X size={20} />
        </button>
      </div>

      <div className="transaction-modal-content">
        <p>
          Deseja excluir o orçamento de{' '}
          <strong>{budgetToDelete.category}</strong>
          {' '}do mês{' '}
          <strong>{budgetToDelete.month}</strong>?
        </p>

        <p>
          Limite cadastrado:{' '}
          <strong>
            {formatCents(budgetToDelete.limitCents)}
          </strong>
        </p>

        <p>
          Esta ação não poderá ser desfeita.
        </p>

        {deleteError && (
          <p role="alert" style={{ color: '#f87171' }}>
            {deleteError}
          </p>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="cancel-button"
          onClick={closeDeleteConfirmation}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="budget-confirm-delete"
          onClick={handleDeleteBudget}
        >
          Confirmar exclusão
        </button>
      </div>
    </div>
  </div>
)}

    </section>
  )
}
