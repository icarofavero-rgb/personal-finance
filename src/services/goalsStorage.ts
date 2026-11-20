
export type GoalMovement = {
  id: string
  amount: number
  type: 'deposit' | 'withdrawal'
  date: string
  note?: string
}


export type Goal = {
  id: string
  name: string
  targetAmount: number
  deadline: string | null
  color: string
  createdAt: string
  movements: GoalMovement[]
}

const STORAGE_KEY = 'personal-finance-goals'

export function getGoals(): Goal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)

    return Array.isArray(parsed)
      ? (parsed as Goal[])
      : []
  } catch {
    return []
  }
}

export function saveGoals(goals: Goal[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(goals)
  )
}


export type CreateGoalInput = {
  name: string
  targetAmount: number
  initialAmount: number
  deadline: string | null
  color: string
}

export function createGoal(input: CreateGoalInput): Goal {
  const name = input.name.trim()

  if (!name) {
    throw new Error('Informe o nome da meta.')
  }

  if (
    !Number.isFinite(input.targetAmount) ||
    input.targetAmount <= 0
  ) {
    throw new Error('Informe um valor desejado válido.')
  }

  if (
    !Number.isFinite(input.initialAmount) ||
    input.initialAmount < 0
  ) {
    throw new Error('Informe um valor inicial válido.')
  }

  const now = new Date().toISOString()

  const goal: Goal = {
    id: crypto.randomUUID(),
    name,
    targetAmount: input.targetAmount,
    deadline: input.deadline,
    color: input.color,
    createdAt: now,
    movements:
      input.initialAmount > 0
        ? [
            {
              id: crypto.randomUUID(),
              amount: input.initialAmount,
              type: 'deposit',
              date: now,
            },
          ]
        : [],
  }

  const currentGoals = getGoals()

  saveGoals([...currentGoals, goal])

  return goal
}


export function calculateGoalSaved(goal: Goal): number {
  // Soma em centavos (evita resíduos como 0,1 + 0,2 = 0,30000000004)
  const cents = goal.movements.reduce((total, movement) => {
    const value = Math.round(movement.amount * 100)
    return movement.type === 'deposit' ? total + value : total - value
  }, 0)
  return cents / 100
}

export function calculateGoalProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0

  const saved = calculateGoalSaved(goal)

  return Math.min(
    100,
    Math.max(0, (saved / goal.targetAmount) * 100)
  )
}


export type GoalMovementType = 'deposit' | 'withdrawal'

export function addGoalMovement(
  goalId: string,
  type: GoalMovementType,
  amount: number,
  note = ''
): Goal[] {

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Informe um valor maior que zero.')
  }

  const goals = getGoals()
  const goal = goals.find(item => item.id === goalId)

  if (!goal) {
    throw new Error('Meta não encontrada.')
  }

  const currentSaved = calculateGoalSaved(goal)

  if (type === 'withdrawal' && amount > currentSaved) {
    throw new Error(
      'O valor da retirada não pode ultrapassar o total reservado.'
    )
  }

  
const movement: GoalMovement = {
  id: crypto.randomUUID(),
  type,
  amount,
  date: new Date().toISOString(),
  note: note.trim().slice(0, 300),
}


  const updatedGoals = goals.map(item =>
    item.id === goalId
      ? {
          ...item,
          movements: [...item.movements, movement],
        }
      : item
  )

  saveGoals(updatedGoals)

  return updatedGoals
}


export type UpdateGoalInput = {
  name: string
  targetAmount: number
  deadline: string | null
  color: string
}

export function updateGoal(
  goalId: string,
  input: UpdateGoalInput
): Goal[] {
  const name = input.name.trim()

  if (!name) {
    throw new Error('Informe o nome da meta.')
  }

  if (
    !Number.isFinite(input.targetAmount) ||
    input.targetAmount <= 0
  ) {
    throw new Error('Informe um valor desejado válido.')
  }

  const goals = getGoals()
  const existingGoal = goals.find(goal => goal.id === goalId)

  if (!existingGoal) {
    throw new Error('Meta não encontrada.')
  }

  const updatedGoals = goals.map(goal =>
    goal.id === goalId
      ? {
          ...goal,
          name,
          targetAmount: input.targetAmount,
          deadline: input.deadline,
          color: input.color,
        }
      : goal
  )

  saveGoals(updatedGoals)

  return updatedGoals
}


export function updateGoalMovementNote(
  goalId: string,
  movementId: string,
  note: string
): Goal[] {
  if (note.length > 300) {
    throw new Error(
      'A observação deve ter no máximo 300 caracteres.'
    )
  }

  const goals = getGoals()
  const goal = goals.find(item => item.id === goalId)

  if (!goal) {
    throw new Error('Meta não encontrada.')
  }

  const movementExists = goal.movements.some(
    movement => movement.id === movementId
  )

  if (!movementExists) {
    throw new Error('Movimentação não encontrada.')
  }

  const updatedGoals = goals.map(item => {
    if (item.id !== goalId) return item

    return {
      ...item,
      movements: item.movements.map(movement =>
        movement.id === movementId
          ? {
              ...movement,
              note: note.trim(),
            }
          : movement
      ),
    }
  })

  saveGoals(updatedGoals)

  return updatedGoals
}
