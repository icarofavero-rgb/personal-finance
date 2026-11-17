
export type CardPurchase = {
  id: string
  cardId: string
  description: string
  amount: number
  category: string
  date: string
  installments: number
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

  saveCardPurchases([...purchases, purchase])
}

export function deleteCardPurchase(id: string): void {
  const purchases = getCardPurchases()

  saveCardPurchases(
    purchases.filter(purchase => purchase.id !== id)
  )
}
