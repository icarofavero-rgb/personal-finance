
import {
  downloadGoalsBackup,
  restoreGoalsBackup,
  validateGoalsBackup,
  type GoalsBackup,
} from '../services/goalsBackup'

import Toast, { type ToastMessage } from '../components/Toast'
import DatePicker from '../components/DatePicker'
import { useMemo, useState } from 'react'

import {
  Plus,
  Target,
  Wallet,
  Flag,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Pencil,
  Upload,
  Download,
} from 'lucide-react'

import {
  getGoals,
  createGoal,
  calculateGoalSaved,
  calculateGoalProgress,
  addGoalMovement,
  updateGoal,
  updateGoalMovementNote,
  type Goal,
} from '../services/goalsStorage'

const COLORS = [
  '#38d9ff',
  '#a78bfa',
  '#34d399',
  '#f59e0b',
  '#fb7185',
]

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(() => getGoals())
  const [showModal, setShowModal] = useState(false)
  const [safetyBackupDownloaded, setSafetyBackupDownloaded] =
  useState(false)
const [confirmRestore, setConfirmRestore] = useState(false)
const [restoreError, setRestoreError] = useState('')

const [closingMovementModal, setClosingMovementModal] =
  useState(false)

const [toast, setToast] = useState<ToastMessage | null>(null)

const [importPreview, setImportPreview] =
  useState<GoalsBackup | null>(null)

const [importError, setImportError] = useState('')
const [importFileName, setImportFileName] = useState('')

const [editingMovement, setEditingMovement] = useState<{
  goalId: string
  movementId: string
} | null>(null)

const [editingMovementNote, setEditingMovementNote] = useState('')
const [editingMovementError, setEditingMovementError] = useState('')

const [movementNote, setMovementNote] = useState('')

const [editingGoalId, setEditingGoalId] = useState<string | null>(null)

const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

function toggleGoalHistory(goalId: string) {
  setExpandedHistoryId(current =>
    current === goalId ? null : goalId
  )
}

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [initialAmount, setInitialAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')
  
const [closingGoalModal, setClosingGoalModal] = useState(false)

const [movementGoalId, setMovementGoalId] = useState<string | null>(null)
const [movementType, setMovementType] = useState<
  'deposit' | 'withdrawal'
>('deposit')
const [movementAmount, setMovementAmount] = useState('')
const [movementError, setMovementError] = useState('')

  const summary = useMemo(() => {
    return goals.reduce(
      (total, goal) => {
        total.saved += calculateGoalSaved(goal)
        total.target += goal.targetAmount

        if (calculateGoalProgress(goal) < 100) {
          total.active += 1
        }

        return total
      },
      { active: 0, saved: 0, target: 0 }
    )
  }, [goals])

  
function resetForm() {
  setEditingGoalId(null)
  setName('')
  setTargetAmount('')
  setInitialAmount('')
  setDeadline('')
  setColor(COLORS[0])
  setError('')
}


  
function closeModal() {
  if (closingGoalModal) return

  setClosingGoalModal(true)
}

function finishCloseGoalModal() {
  setShowModal(false)
  setClosingGoalModal(false)
  resetForm()
}



function openEditGoal(goal: Goal) {
  resetForm()

  setEditingGoalId(goal.id)
  setName(goal.name)
  setTargetAmount(String(goal.targetAmount))
  setDeadline(goal.deadline ?? '')
  setColor(goal.color)
  setShowModal(true)
}


  
function handleCreateGoal(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setError('')

  const target = Number(targetAmount)

  try {
    if (editingGoalId) {
      const updatedGoals = updateGoal(editingGoalId, {
        name,
        targetAmount: target,
        deadline: deadline || null,
        color,
      })

      setGoals(updatedGoals)
    } else {
      const initial =
        initialAmount.trim() === ''
          ? 0
          : Number(initialAmount)

      createGoal({
        name,
        targetAmount: target,
        initialAmount: initial,
        deadline: deadline || null,
        color,
      })

      setGoals(getGoals())
    }

    
const wasEditing = Boolean(editingGoalId)

closeModal()

showToast(
  'success',
  wasEditing
    ? 'Meta atualizada com sucesso!'
    : 'Meta criada com sucesso!'
)

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Não foi possível salvar a meta.'
    )
  }
}



function openMovementModal(
  goalId: string,
  type: 'deposit' | 'withdrawal'
) {
  setMovementGoalId(goalId)
  setMovementType(type)
  setMovementAmount('')
  setMovementError('')
  setMovementNote('')
}

function closeMovementModal() {
  if (closingMovementModal) return

  setClosingMovementModal(true)
}

function finishCloseMovementModal() {
  setMovementGoalId(null)
  setMovementAmount('')
  setMovementNote('')
  setMovementError('')
  setClosingMovementModal(false)
}


function handleMovement(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setMovementError('')

  if (!movementGoalId) return

  try {
    
const updatedGoals = addGoalMovement(
  movementGoalId,
  movementType,
  Number(movementAmount),
  movementNote
)

setGoals(updatedGoals)
closeMovementModal()

showToast(
  'success',
  movementType === 'deposit'
    ? 'Valor adicionado à meta com sucesso!'
    : 'Valor retirado da meta com sucesso!'
)

  } catch (error) {
    setMovementError(
      error instanceof Error
        ? error.message
        : 'Não foi possível registrar a movimentação.'
    )
  }
}


function openMovementNoteEditor(
  goalId: string,
  movementId: string,
  currentNote: string
) {
  setEditingMovement({ goalId, movementId })
  setEditingMovementNote(currentNote)
  setEditingMovementError('')
}

function closeMovementNoteEditor() {
  setEditingMovement(null)
  setEditingMovementNote('')
  setEditingMovementError('')
}

function handleSaveMovementNote(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()

  if (!editingMovement) return

  setEditingMovementError('')

  try {
    const updatedGoals = updateGoalMovementNote(
      editingMovement.goalId,
      editingMovement.movementId,
      editingMovementNote
    )

    
setGoals(updatedGoals)
closeMovementNoteEditor()

showToast(
  'success',
  'Observação atualizada com sucesso!'
)

  } catch (error) {
    setEditingMovementError(
      error instanceof Error
        ? error.message
        : 'Não foi possível salvar a observação.'
    )
  }
}


function handleExportGoals() {
  try {
    downloadGoalsBackup()
  } catch (error) {
    console.error('Erro ao exportar metas:', error)

    window.alert(
      'Não foi possível exportar as metas. Tente novamente.'
    )
  }
}


async function handleImportFile(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0]

  setImportPreview(null)
  setImportError('')
  setImportFileName('')
  setSafetyBackupDownloaded(false)
  setConfirmRestore(false)
  setRestoreError('')

  // Permite selecionar o mesmo arquivo novamente.
  event.target.value = ''

  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    setImportError('O arquivo ultrapassa o limite de 5 MB.')
    return
  }

  try {
    const content = await file.text()
    const parsed: unknown = JSON.parse(content)
    const backup = validateGoalsBackup(parsed)

    setImportPreview(backup)
    setImportFileName(file.name)
  } catch (error) {
    setImportError(
      error instanceof Error
        ? error.message
        : 'Não foi possível ler o arquivo.'
    )
  }
}
function closeImportPreview() {
  setImportPreview(null)
  setImportFileName('')
  setImportError('')
  setRestoreError('')
  setConfirmRestore(false)
  setSafetyBackupDownloaded(false)
}



function handleRestoreGoals() {
  if (
  !importPreview ||
  !confirmRestore ||
  !safetyBackupDownloaded
) return

  setRestoreError('')

  try {
    const updatedGoals = restoreGoalsBackup(importPreview)

    setGoals(updatedGoals)
    setConfirmRestore(false)
    closeImportPreview()
    setSafetyBackupDownloaded(false)
    
    showToast('success', 'Metas restauradas com sucesso!')
  } catch (error) {
    setRestoreError(
      error instanceof Error
        ? error.message
        : 'Não foi possível restaurar as metas.'
    )
  }
}

function handleDownloadSafetyBackup() {
  try {
    downloadGoalsBackup()
    setSafetyBackupDownloaded(true)
    setRestoreError('')
  } catch (error) {
    setSafetyBackupDownloaded(false)
    setRestoreError(
      'Não foi possível preparar o backup preventivo.'
    )
  }
}


function showToast(
  type: 'success' | 'error',
  message: string
) {
  setToast({
    id: crypto.randomUUID(),
    type,
    message,
  })
}


  return (
    <div className="goals-page">
      <div className="goals-header">
        <div>
          <span className="eyebrow">PLANEJAMENTO FINANCEIRO</span>
          <h1>
            Minhas metas<span className="neon-dot">.</span>
          </h1>
          <p>
            Organize seus objetivos e acompanhe cada conquista.
          </p>
        </div>

        

<div className="goals-header-actions">

  {/* Importar metas */}
  <label className="goals-import-button">
    <Upload size={17} />
    Importar metas

    <input
      type="file"
      accept=".json,application/json"
      onChange={handleImportFile}
      aria-label="Selecionar backup das metas"
    />
  </label>

  {/* Exportar metas */}
  <button
    type="button"
    className="goals-export-button"
    onClick={handleExportGoals}
  >
    <Download size={17} />
    Exportar metas
  </button>

  {/* Nova meta */}
  <button
    type="button"
    className="primary-button"
    onClick={() => {
      resetForm()
      setShowModal(true)
    }}
  >
    <Plus size={17} />
    Nova meta
  </button>

</div>

{importError && (
  <p className="goals-form-error" role="alert">
    {importError}
  </p>
)}


      </div>

      <div className="goals-summary">
        <div className="panel goals-summary-card">
          <Target size={20} />
          <span>Metas ativas</span>
          <strong>{summary.active}</strong>
        </div>

        <div className="panel goals-summary-card">
          <Wallet size={20} />
          <span>Total reservado</span>
          <strong>{formatMoney(summary.saved)}</strong>
        </div>

        <div className="panel goals-summary-card">
          <Flag size={20} />
          <span>Objetivo total</span>
          <strong>{formatMoney(summary.target)}</strong>
        </div>
      </div>

      <div className="goals-list">
        {goals.length === 0 ? (
          <div className="panel goals-empty">
            <div className="goals-empty-icon">
              <Target size={30} />
            </div>

            <h2>Seu próximo objetivo começa aqui</h2>

            <p>
              Crie metas para acompanhar suas economias,
              organizar seus planos e visualizar seu progresso.
            </p>

            <span>
              Clique em Nova meta para cadastrar seu primeiro objetivo.
            </span>
          </div>
        ) : (
          goals.map(goal => (
            <div className="panel goals-item" key={goal.id}>
              
<div className="goals-item-heading">
  <strong>{goal.name}</strong>

  <div className="goals-item-heading-actions">
    <span>
      {calculateGoalProgress(goal).toFixed(0)}%
    </span>

    <button
      type="button"
      className="goals-edit-button"
      onClick={() => openEditGoal(goal)}
      aria-label={`Editar meta ${goal.name}`}
      title="Editar meta"
    >
      <Pencil size={16} />
    </button>
  </div>
</div>


              <div className="goals-progress">
                <div
                  className="goals-progress-fill"
                  style={{
                    width: `${calculateGoalProgress(goal)}%`,
                    backgroundColor: goal.color,
                  }}
                />
              </div>

              <div className="goals-item-values">
                <span>
                  {formatMoney(calculateGoalSaved(goal))}
                </span>
                <span>
                  {formatMoney(goal.targetAmount)}
                </span>
              </div>

<div className="goals-movement-actions">
  <button
    type="button"
    className="goals-deposit-button"
    onClick={() => openMovementModal(goal.id, 'deposit')}
  >
    <ArrowDownCircle size={17} />
    Adicionar valor
  </button>

  <button
    type="button"
    className="goals-withdraw-button"
    onClick={() => openMovementModal(goal.id, 'withdrawal')}
    disabled={calculateGoalSaved(goal) <= 0}
  >
    <ArrowUpCircle size={17} />
    Retirar valor
  </button>
</div>


<div className="goals-history">
  <button
    type="button"
    className="goals-history-toggle"
    onClick={() => toggleGoalHistory(goal.id)}
    aria-expanded={expandedHistoryId === goal.id}
  >
    <span>
      <History size={16} />
      Histórico de movimentações
      <span className="goals-history-count">
        {goal.movements.length}
      </span>
    </span>

    {expandedHistoryId === goal.id
      ? <ChevronUp size={17} />
      : <ChevronDown size={17} />}
  </button>

  {expandedHistoryId === goal.id && (
    <div className="goals-history-content">
      {goal.movements.length === 0 ? (
        <p className="goals-history-empty">
          Nenhuma movimentação registrada nesta meta.
        </p>
      ) : (
        [...goal.movements]
          .sort((a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
          )
          .map(movement => (
            <div
              className="goals-history-item"
              key={movement.id}
            >
              <div className="goals-history-info">
                <span
                  className={
                    movement.type === 'deposit'
                      ? 'goals-history-icon deposit'
                      : 'goals-history-icon withdrawal'
                  }
                >
                  {movement.type === 'deposit'
                    ? <ArrowDownCircle size={17} />
                    : <ArrowUpCircle size={17} />}
                </span>

                <div>
                  <strong>
                    {movement.type === 'deposit'
                      ? 'Valor adicionado'
                      : 'Valor retirado'}
                  </strong>

                  <small>
                    {new Date(movement.date).toLocaleString(
                      'pt-BR',
                      {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }
                    )}
                  </small>

{movement.note?.trim() && (
  <p className="goals-history-note">
    {movement.note}
  </p>
)}

                </div>
              </div>

              
<div className="goals-history-item-actions">
  <strong
    className={
      movement.type === 'deposit'
        ? 'goals-history-amount deposit'
        : 'goals-history-amount withdrawal'
    }
  >
    {movement.type === 'deposit' ? '+' : '-'}
    {formatMoney(movement.amount)}
  </strong>

  <button
    type="button"
    className="goals-edit-note-button"
    onClick={() =>
      openMovementNoteEditor(
        goal.id,
        movement.id,
        movement.note ?? ''
      )
    }
    aria-label="Editar observação da movimentação"
    title="Editar observação"
  >
    <Pencil size={15} />
  </button>
</div>

            </div>
          ))
      )}
    </div>
  )}
</div>


            </div>
          ))
        )}
      </div>

      
{showModal && (
  <div
    className={`modal-overlay goals-overlay ${
      closingGoalModal ? 'goals-closing' : ''
    }`}
    onClick={closeModal}
    onAnimationEnd={event => {
      if (
        closingGoalModal &&
        event.target === event.currentTarget
      ) {
        finishCloseGoalModal()
      }
    }}
  >

          <div
            className="modal goals-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goals-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="goals-modal-title">
  {editingGoalId ? 'Editar meta' : 'Nova meta'}
</h2>
                <p>Cadastre um novo objetivo financeiro.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Fechar"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal}>
              <div className="goals-form-fields">
                <label>
                  Nome da meta
                  <input
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Ex.: Viagem internacional"
                    maxLength={80}
                    required
                  />
                </label>

                <label>
                  Valor desejado (R$)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={targetAmount}
                    onChange={event => setTargetAmount(event.target.value)}
                    placeholder="Ex.: 10000"
                    required
                  />
                </label>

                {!editingGoalId && (
  <label>
    Valor inicial (R$)
    <input
      type="number"
      min="0"
      step="0.01"
      value={initialAmount}
      onChange={event => setInitialAmount(event.target.value)}
      placeholder="Ex.: 500"
    />
  </label>
)}

             <label>
  Prazo (opcional)
  <DatePicker
    value={deadline}
    onChange={setDeadline}
  />
</label>

                <div className="goals-color-field">
                  <span>Cor da meta</span>

                  <div className="goals-color-options">
                    {COLORS.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={
                          color === option
                            ? 'goals-color-option selected'
                            : 'goals-color-option'
                        }
                        style={{ backgroundColor: option }}
                        onClick={() => setColor(option)}
                        aria-label={`Selecionar cor ${option}`}
                        aria-pressed={color === option}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="goals-form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="goals-form-actions">
                <button
                  type="button"
                  className="goals-cancel-button"
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-button">
                  <Plus size={17} />
                  {editingGoalId ? 'Salvar alterações' : 'Criar meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


{movementGoalId && (
  <div
    className={`modal-overlay goals-overlay ${
      closingMovementModal ? 'goals-closing' : ''
    }`}
    onClick={closeMovementModal}
    onAnimationEnd={event => {
      if (
        closingMovementModal &&
        event.target === event.currentTarget
      ) {
        finishCloseMovementModal()
      }
    }}
  >

    <div
      className="modal goals-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-movement-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="goal-movement-title">
            {movementType === 'deposit'
              ? 'Adicionar valor'
              : 'Retirar valor'}
          </h2>
          <p>Registre uma movimentação nesta meta.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar"
          onClick={closeMovementModal}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleMovement}>
        <div className="goals-form-fields">
          <label>
            Valor (R$)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={movementAmount}
              onChange={event => setMovementAmount(event.target.value)}
              placeholder="Ex.: 100"
              required
              autoFocus
            />
          </label>

<label>
  Observação (opcional)
  <textarea
    className="goals-note-input"
    value={movementNote}
    onChange={event => setMovementNote(event.target.value)}
    placeholder={
      movementType === 'deposit'
        ? 'Ex.: Dinheiro extra que recebi este mês'
        : 'Ex.: Retirei para uma despesa inesperada'
    }
    maxLength={300}
    rows={3}
  />
</label>

          {movementError && (
            <p className="goals-form-error" role="alert">
              {movementError}
            </p>
          )}
        </div>

        <div className="goals-form-actions">
          <button
            type="button"
            className="goals-cancel-button"
            onClick={closeMovementModal}
          >
            Cancelar
          </button>

          <button type="submit" className="primary-button">
            Confirmar
          </button>
        </div>
      </form>
    </div>
  </div>
)}


{editingMovement && (
  <div
    className="modal-overlay goals-overlay"
    onClick={closeMovementNoteEditor}
  >
    <div
      className="modal goals-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-edit-note-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="goal-edit-note-title">
            Editar observação
          </h2>
          <p>
            Atualize a descrição desta movimentação.
          </p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar"
          onClick={closeMovementNoteEditor}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSaveMovementNote}>
        <div className="goals-form-fields">
          <label>
            Observação
            <textarea
              className="goals-note-input"
              value={editingMovementNote}
              onChange={event =>
                setEditingMovementNote(event.target.value)
              }
              placeholder="Descreva esta movimentação..."
              maxLength={300}
              rows={4}
              autoFocus
            />
          </label>

          <span className="goals-note-counter">
            {editingMovementNote.length}/300 caracteres
          </span>

          {editingMovementError && (
            <p className="goals-form-error" role="alert">
              {editingMovementError}
            </p>
          )}
        </div>

        <div className="goals-form-actions">
          <button
            type="button"
            className="goals-cancel-button"
            onClick={closeMovementNoteEditor}
          >
            Cancelar
          </button>

          <button type="submit" className="primary-button">
            Salvar observação
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    
{importPreview && (
  <div
    className="modal-overlay goals-overlay"
    onClick={closeImportPreview}
  >
    <div
      className="modal goals-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goals-import-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="goals-import-title">
            Prévia da importação
          </h2>
          <p>Confira os dados antes de restaurar.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar"
          onClick={closeImportPreview}
        >
          <X size={20} />
        </button>
      </div>

      <div className="goals-import-preview">
        <div>
          <span>Arquivo</span>
          <strong>{importFileName}</strong>
        </div>

        <div>
          <span>Metas encontradas</span>
          <strong>{importPreview.goals.length}</strong>
        </div>

        <div>
          <span>Movimentações</span>
          <strong>
            {importPreview.goals.reduce(
              (total, goal) =>
                total + goal.movements.length,
              0
            )}
          </strong>
        </div>

        <div>
          <span>Total reservado no backup</span>
          <strong>
            {formatMoney(
              importPreview.goals.reduce(
                (total, goal) =>
                  total + calculateGoalSaved(goal),
                0
              )
            )}
          </strong>
        </div>

        
<p className="goals-import-warning">
  Atenção: restaurar este backup substituirá
  todas as metas atualmente cadastradas.
</p>

      </div>


<div className="goals-restore-confirmation">
  <p>
    Antes de restaurar, baixe uma cópia das
    metas atuais para evitar perda de dados.
  </p>

  <button
    type="button"
    className="goals-export-button"
    onClick={handleDownloadSafetyBackup}
  >
    <Download size={16} />
    Baixar cópia das metas atuais
  </button>

  <label className="goals-restore-checkbox">
    <input
      type="checkbox"
      checked={confirmRestore}
      onChange={event =>
        setConfirmRestore(event.target.checked)
      }
    />
    Confirmo que salvei uma cópia das metas
    atuais e desejo substituí-las pelo backup.
  </label>

  {restoreError && (
    <p className="goals-form-error" role="alert">
      {restoreError}
    </p>
  )}
</div>

      
<div className="goals-form-actions">
  <button
    type="button"
    className="goals-cancel-button"
    onClick={closeImportPreview}
  >
    Fechar
  </button>

  <button
    type="button"
    className="primary-button"
    disabled={!confirmRestore || !safetyBackupDownloaded}
    onClick={handleRestoreGoals}
  >
    <Upload size={17} />
    Restaurar metas
  </button>
</div>

    </div>
  </div>
)}

<Toast
  key={toast?.id ?? 'empty'}
  toast={toast}
  onClose={() => setToast(null)}
/>
</div>
  )
}
