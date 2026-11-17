
import type { CreditCard } from './cardsStorage'
import type { CardPurchase } from './cardPurchasesStorage'

export type CardInstallment = {
  purchaseId: string
  cardId: string
  description: string
  installmentNumber: number
  totalInstallments: number
  amount: number
  invoiceMonth: string
}

function addMonths(
  year: number,
  month: number,
  amount: number
): string {
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
  ].join('-')
}

export function calculateInstallments(
  purchase: CardPurchase,
  card: CreditCard
): CardInstallment[] {
  const [year, month, day] = purchase.date
    .split('-')
    .map(Number)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    !Number.isInteger(card.closingDay) ||
    card.closingDay < 1 ||
    card.closingDay > 31 ||
    !Number.isFinite(purchase.amount) ||
    purchase.amount <= 0 ||
    !Number.isInteger(purchase.installments) ||
    purchase.installments < 1
  ) {
    throw new Error('Dados inválidos para calcular as parcelas.')
  }

  const validDate = new Date(Date.UTC(year, month - 1, day))

  if (
    validDate.getUTCFullYear() !== year ||
    validDate.getUTCMonth() + 1 !== month ||
    validDate.getUTCDate() !== day
  ) {
    throw new Error('Data da compra inválida.')
  }

  const totalCents = Math.round(purchase.amount * 100)

  if (!Number.isSafeInteger(totalCents) || totalCents < 1) {
    throw new Error('Valor da compra inválido.')
  }

  if (purchase.installments > totalCents) {
    throw new Error('O número de parcelas supera o valor em centavos.')
  }

  const baseCents = Math.floor(
    totalCents / purchase.installments
  )

  const remainingCents = totalCents % purchase.installments

  // No dia do fechamento ou depois dele,
  // a primeira parcela vai para o mês seguinte.
  const initialOffset = day >= card.closingDay ? 1 : 0

  return Array.from(
    { length: purchase.installments },
    (_, index): CardInstallment => {
      const cents =
        baseCents + (index < remainingCents ? 1 : 0)

      return {
        purchaseId: purchase.id,
        cardId: purchase.cardId,
        description: purchase.description,
        installmentNumber: index + 1,
        totalInstallments: purchase.installments,
        amount: cents / 100,
        invoiceMonth: addMonths(
          year,
          month,
          initialOffset + index
        ),
      }
    }
  )
}

export function getCardInstallments(
  purchases: CardPurchase[],
  cards: CreditCard[]
): CardInstallment[] {
  return purchases.flatMap(purchase => {
    const card = cards.find(item => item.id === purchase.cardId)

    if (!card) return []

    return calculateInstallments(purchase, card)
  })
}


export type CardInvoice = {
  cardId: string
  invoiceMonth: string
  total: number
  installments: CardInstallment[]
}

export function getCardInvoices(
  purchases: CardPurchase[],
  cards: CreditCard[]
): CardInvoice[] {
  const installments = getCardInstallments(purchases, cards)

  const groups = new Map<string, CardInstallment[]>()

  for (const installment of installments) {
    const key = `${installment.cardId}:${installment.invoiceMonth}`

    const existing = groups.get(key) ?? []
    existing.push(installment)
    groups.set(key, existing)
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const separator = key.lastIndexOf(':')
      const cardId = key.slice(0, separator)
      const invoiceMonth = key.slice(separator + 1)

      const totalCents = items.reduce(
        (sum, item) => sum + Math.round(item.amount * 100),
        0
      )

      return {
        cardId,
        invoiceMonth,
        total: totalCents / 100,
        installments: items,
      }
    })
    .sort((a, b) =>
      a.invoiceMonth.localeCompare(b.invoiceMonth) ||
      a.cardId.localeCompare(b.cardId)
    )
}
