export type CreditCard = {
  id: string
  name: string
  bank: string
  limit: number
  closingDay: number
  dueDay: number

  // Personalização visual
  color?: string
  image?: string
}

export const CARD_COLORS = [
  { name: 'Azul-ciano', value: '#38BDF8' },
  { name: 'Roxo', value: '#A78BFA' },
  { name: 'Verde', value: '#36C995' },
  { name: 'Vermelho', value: '#F87171' },
  { name: 'Amarelo', value: '#FACC15' },
  { name: 'Laranja', value: '#FB923C' },
  { name: 'Rosa', value: '#F472B6' },
  { name: 'Azul', value: '#60A5FA' },
] as const

export const DEFAULT_CARD_COLOR = '#38BDF8'

const STORAGE_KEY = 'personal-finance-credit-cards'

export function getCards(): CreditCard[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed as CreditCard[] : []
  } catch {
    return []
  }
}

export function saveCards(cards: CreditCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

export function updateCardColor(
  cardId: string,
  color: string
): void {
  const isValidColor = /^#[0-9a-fA-F]{6}$/.test(color)

  if (!isValidColor) {
    throw new Error('Cor inválida.')
  }

  const cards = getCards()

  if (!cards.some(card => card.id === cardId)) {
    throw new Error('Cartão não encontrado.')
  }

  const updatedCards = cards.map(card =>
    card.id === cardId
      ? { ...card, color: color.toUpperCase() }
      : card
  )

  saveCards(updatedCards)
}

export function updateCardImage(
  cardId: string,
  image: string | null
): void {
  const cards = getCards()

  if (!cards.some(card => card.id === cardId)) {
    throw new Error('Cartão não encontrado.')
  }

  if (
    image !== null &&
    !/^data:image\/(png|jpeg|webp);base64,/.test(image)
  ) {
    throw new Error('Formato de imagem inválido.')
  }

  const updatedCards = cards.map(card =>
    card.id === cardId
      ? {
          ...card,
          image: image ?? undefined,
        }
      : card
  )

  saveCards(updatedCards)
}