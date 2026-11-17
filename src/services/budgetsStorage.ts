
export type Budget = {
  id: string
  category: string
  month: string
  limitCents: number
  createdAt: string
}

const STORAGE_KEY = 'personal-finance-budgets-v1'

export function getBudgets(): Budget[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return []

    const data: unknown = JSON.parse(saved)

    return Array.isArray(data) ? data as Budget[] : []
  } catch {
    return []
  }
}

export function getBudgetsStrict(): Budget[] {
  const errorMessage =
    'Não foi possível validar os orçamentos armazenados.'

  let saved: string | null

  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    throw new Error(errorMessage)
  }

  if (saved === null) {
    return []
  }

  let data: unknown

  try {
    data = JSON.parse(saved)
  } catch {
    throw new Error(errorMessage)
  }

  if (!Array.isArray(data)) {
    throw new Error(errorMessage)
  }

  const valid = data.every(item => {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item)
    ) {
      return false
    }

    const budget = item as Record<string, unknown>

    return (
      typeof budget.id === 'string' &&
      budget.id.trim().length > 0 &&
      typeof budget.category === 'string' &&
      budget.category.trim().length > 0 &&
      typeof budget.month === 'string' &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(budget.month) &&
      typeof budget.limitCents === 'number' &&
      Number.isSafeInteger(budget.limitCents) &&
      budget.limitCents > 0 &&
      typeof budget.createdAt === 'string' &&
      !Number.isNaN(Date.parse(budget.createdAt))
    )
  })

  if (!valid) {
    throw new Error(errorMessage)
  }

  const budgets = data as Budget[]

  const ids = budgets.map(item => item.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error(errorMessage)
  }

  const combinations = budgets.map(
    item => JSON.stringify([item.month, item.category])
  )

  if (new Set(combinations).size !== combinations.length) {
    throw new Error(errorMessage)
  }

  return budgets
}

export function addBudget(budget: Budget): void {
  const budgets = getBudgetsStrict()

  if (
    !Number.isSafeInteger(budget.limitCents) ||
    budget.limitCents <= 0
  ) {
    throw new Error('O limite deve ser maior que zero.')
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(budget.month)) {
    throw new Error('Informe um mês válido.')
  }

  if (!budget.category.trim()) {
    throw new Error('Selecione uma categoria.')
  }

  const alreadyExists = budgets.some(
    item =>
      item.category === budget.category &&
      item.month === budget.month
  )

  if (alreadyExists) {
    throw new Error(
      'Já existe um orçamento para esta categoria neste mês.'
    )
  }

  if (budgets.some(item => item.id === budget.id)) {
    throw new Error('Identificador de orçamento duplicado.')
  }

  budgets.push(budget)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets))
}

export function updateBudget(
  updatedBudget: Budget
): void {
  const budgets = getBudgetsStrict()

  const existingIndex = budgets.findIndex(
    budget => budget.id === updatedBudget.id
  )

  if (existingIndex === -1) {
    throw new Error(
      'O orçamento que você tentou editar não foi encontrado.'
    )
  }

  if (
    !Number.isSafeInteger(updatedBudget.limitCents) ||
    updatedBudget.limitCents <= 0
  ) {
    throw new Error(
      'O limite deve ser maior que zero.'
    )
  }

  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(
      updatedBudget.month
    )
  ) {
    throw new Error('Informe um mês válido.')
  }

  if (!updatedBudget.category.trim()) {
    throw new Error('Selecione uma categoria.')
  }

  const duplicate = budgets.some(
    budget =>
      budget.id !== updatedBudget.id &&
      budget.category === updatedBudget.category &&
      budget.month === updatedBudget.month
  )

  if (duplicate) {
    throw new Error(
      'Já existe um orçamento para esta categoria neste mês.'
    )
  }

  const existingBudget = budgets[existingIndex]

  const updatedBudgets = [...budgets]

  updatedBudgets[existingIndex] = {
    ...updatedBudget,
    id: existingBudget.id,
    createdAt: existingBudget.createdAt,
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedBudgets)
  )
}

export function deleteBudget(id: string): void {
  const budgets = getBudgetsStrict()

  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(
      'Identificador de orçamento inválido.'
    )
  }

  const existingBudget = budgets.find(
    budget => budget.id === id
  )

  if (!existingBudget) {
    throw new Error(
      'O orçamento que você tentou excluir não foi encontrado.'
    )
  }

  const updatedBudgets = budgets.filter(
    budget => budget.id !== id
  )

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedBudgets)
  )
}
