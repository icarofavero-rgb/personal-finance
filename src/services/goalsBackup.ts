
import {
  getGoals,
  saveGoals,
  type Goal,
} from './goalsStorage'

export type GoalsBackup = {
  format: 'personal-finance-goals'
  version: 1
  exportedAt: string
  goals: Goal[]
}

export function createGoalsBackup(): GoalsBackup {
  return {
    format: 'personal-finance-goals',
    version: 1,
    exportedAt: new Date().toISOString(),
    goals: getGoals(),
  }
}

export function downloadGoalsBackup(): void {
  const backup = createGoalsBackup()

  const content = JSON.stringify(backup, null, 2)

  const blob = new Blob([content], {
    type: 'application/json',
  })

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download =
    `personal-finance-metas-${new Date()
      .toISOString()
      .slice(0, 10)}.json`

  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}


function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    Number.isFinite(Date.parse(value))
  )
}

function isValidMovement(value: unknown): boolean {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    (value.type === 'deposit' ||
      value.type === 'withdrawal') &&
    isValidDate(value.date) &&
    (
      value.note === undefined ||
      (
        typeof value.note === 'string' &&
        value.note.length <= 300
      )
    )
  )
}

function isValidGoal(value: unknown): boolean {
  if (!isRecord(value)) return false

  if (
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    typeof value.targetAmount !== 'number' ||
    !Number.isFinite(value.targetAmount) ||
    value.targetAmount <= 0 ||
    typeof value.color !== 'string' ||
    !/^#[0-9a-fA-F]{6}$/.test(value.color) ||
    !isValidDate(value.createdAt) ||
    !Array.isArray(value.movements)
  ) {
    return false
  }

  if (
    value.deadline !== null &&
    (
      typeof value.deadline !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.deadline)
    )
  ) {
    return false
  }

  if (!value.movements.every(isValidMovement)) {
    return false
  }

  const movementIds = value.movements.map(
    movement => movement.id
  )

  if (new Set(movementIds).size !== movementIds.length) {
    return false
  }

  let saved = 0

  for (const movement of value.movements) {
    saved += movement.type === 'deposit'
      ? movement.amount
      : -movement.amount

    if (saved < -0.000001) {
      return false
    }
  }

  return true
}

export function validateGoalsBackup(
  data: unknown
): GoalsBackup {
  if (!isRecord(data)) {
    throw new Error('Arquivo de backup inválido.')
  }

  if (
    data.format !== 'personal-finance-goals' ||
    data.version !== 1 ||
    !isValidDate(data.exportedAt) ||
    !Array.isArray(data.goals)
  ) {
    throw new Error(
      'Formato ou versão de backup incompatível.'
    )
  }

  if (!data.goals.every(isValidGoal)) {
    throw new Error(
      'O backup contém metas ou movimentações inválidas.'
    )
  }

  const goalIds = data.goals.map(goal => goal.id)

  if (new Set(goalIds).size !== goalIds.length) {
    throw new Error(
      'O backup contém identificadores de metas duplicados.'
    )
  }

  return data as GoalsBackup
}


export function restoreGoalsBackup(
  backupData: unknown
): Goal[] {
  const backup = validateGoalsBackup(backupData)

  // Guarda os dados atuais antes de qualquer alteração.
  const currentGoals = getGoals()

  const safetyBackup: GoalsBackup = {
    format: 'personal-finance-goals',
    version: 1,
    exportedAt: new Date().toISOString(),
    goals: currentGoals,
  }

  // Salva uma cópia preventiva no armazenamento local.
  // Esta chave é independente das metas principais.
  const safetyKey =
    'personal-finance-goals-before-restore'

  localStorage.setItem(
    safetyKey,
    JSON.stringify(safetyBackup)
  )

  // Substitui as metas apenas após a cópia preventiva.
  saveGoals(backup.goals)

  return getGoals()
}
