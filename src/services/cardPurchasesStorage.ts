
export type CardPurchase = {
  id: string
  cardId: string
  description: string
  amount: number
  category: string
  date: string
  installments: number
  /** observação opcional */
  notes?: string
}

const STORAGE_KEY = 'personal-finance-card-purchases'

export function getCardPurchases(): CardPurchase[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)

    return Array.isArray(parsed)
      ? parsed as CardPurchase[]
      : []
  } catch {
    return []
  }
}

export function saveCardPurchases(
  purchases: CardPurchase[]
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(purchases)
  )
}

export function addCardPurchase(
  purchase: CardPurchase
): void {
  if (
    !purchase.id ||
    !purchase.cardId ||
    !purchase.description.trim() ||
    !Number.isFinite(purchase.amount) ||
    purchase.amount <= 0 ||
    !Number.isInteger(purchase.installments) ||
    purchase.installments < 1 ||
    purchase.installments > 120 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(purchase.date)
  ) {
    throw new Error('Dados da compra inválidos.')
  }

  const purchases = getCardPurchases()

  if (purchases.some(item => item.id === purchase.id)) {
    throw new Error('Esta compra já está cadastrada.')
  }

  // Toque duplo em "Salvar": a mesma compra de novo em poucos segundos
  // não é gravada duas vezes.
  const key = [purchase.cardId, purchase.description.trim(), purchase.amount, purchase.date, purchase.installments].join('|')
  if (lastAdded && lastAdded.key === key && Date.now() - lastAdded.at < DUPLICATE_WINDOW_MS && purchases.some(item => item.id === lastAdded?.id)) {
    return
  }

  saveCardPurchases([...purchases, purchase])
  lastAdded = { key, id: purchase.id, at: Date.now() }
}

const DUPLICATE_WINDOW_MS = 5_000
let lastAdded: { key: string; id: string; at: number } | null = null

export function deleteCardPurchase(id: string): void {
  const purchases = getCardPurchases()

  saveCardPurchases(
    purchases.filter(purchase => purchase.id !== id)
  )
}

/** Atualiza uma compra no cartão (as faturas se recalculam a partir dela). */
export function updateCardPurchase(id: string, changes: Omit<CardPurchase, 'id'>): void {
  if (
    !changes.cardId ||
    !changes.description.trim() ||
    !Number.isFinite(changes.amount) ||
    changes.amount <= 0 ||
    !Number.isInteger(changes.installments) ||
    changes.installments < 1 ||
    changes.installments > 120 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(changes.date)
  ) {
    throw new Error('Dados da compra inválidos.')
  }

  const purchases = getCardPurchases()
  if (!purchases.some(item => item.id === id)) throw new Error('Compra não encontrada.')

  saveCardPurchases(purchases.map(item => (item.id === id ? { ...changes, id } : item)))
}
