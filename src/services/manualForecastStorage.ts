
export type ManualForecast = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string
}

const STORAGE_KEY = 'personal-finance-manual-forecasts'

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  )
}

function isManualForecast(value: unknown): value is ManualForecast {
  if (typeof value !== 'object' || value === null) return false

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.description === 'string' &&
    item.description.trim().length > 0 &&
    typeof item.amount === 'number' &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    Number.isSafeInteger(Math.round(item.amount * 100)) &&
    Math.abs(item.amount * 100 - Math.round(item.amount * 100)) < 0.000001 &&
    (item.type === 'income' || item.type === 'expense') &&
    typeof item.date === 'string' &&
    isValidDate(item.date)
  )
}

export function getManualForecasts(): ManualForecast[] {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored === null) return []

  try {
    const parsed: unknown = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      throw new Error('Formato inválido das previsões.')
    }

    if (!parsed.every(isManualForecast)) {
      throw new Error('Existem previsões com dados inválidos.')
    }

    return parsed
  } catch {
    throw new Error(
      'Não foi possível ler as previsões salvas. ' +
      'Os dados originais foram preservados.'
    )
  }
}

function saveManualForecasts(items: ManualForecast[]): void {
  if (!items.every(isManualForecast)) {
    throw new Error('Dados de previsão inválidos.')
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addManualForecast(
  forecast: ManualForecast
): void {
  if (!isManualForecast(forecast)) {
    throw new Error('Previsão inválida.')
  }

  const items = getManualForecasts()

  if (items.some(item => item.id === forecast.id)) {
    throw new Error('Já existe uma previsão com esse identificador.')
  }

  saveManualForecasts([...items, forecast])
}

export function updateManualForecast(
  forecast: ManualForecast
): void {
  if (!isManualForecast(forecast)) {
    throw new Error('Previsão inválida.')
  }

  const items = getManualForecasts()
  const index = items.findIndex(item => item.id === forecast.id)

  if (index === -1) {
    throw new Error('Previsão não encontrada.')
  }

  const updated = [...items]
  updated[index] = forecast

  saveManualForecasts(updated)
}

export function deleteManualForecast(id: string): void {
  const items = getManualForecasts()

  if (!items.some(item => item.id === id)) {
    throw new Error('Previsão não encontrada.')
  }

  saveManualForecasts(items.filter(item => item.id !== id))
}
