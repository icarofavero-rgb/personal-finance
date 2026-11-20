
import type { Transaction } from './storage'
import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'
import type { CreditCard } from './cardsStorage'
import { getCardInvoiceDueDate } from './cardInvoiceDueDate'

export type FinancialProjectionMonth = {
  key: string
  name: string
  entradas: number
  saidas: number
  faturas: number
  faturasPagas: number
  faturasPendentes: number
  totalDespesas: number
  saldoPrevisto: number
}

type ProjectionInput = {
  transactions: Transaction[]
  invoices: CardInvoice[]
  payments: CardPayment[]
  referenceDate?: Date
  /** quantos meses mostrar (padrão 6) */
  months?: number
  /** com os cartões, cada fatura entra no mês em que VENCE */
  cards?: CreditCard[]
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr',
  'Mai', 'Jun', 'Jul', 'Ago',
  'Set', 'Out', 'Nov', 'Dez',
]

export function calculateFinancialProjection({
  transactions,
  invoices,
  payments,
  referenceDate = new Date(),
  months = 6,
  cards,
}: ProjectionInput): FinancialProjectionMonth[] {
  const linkedTransactionIds = new Set(
    payments
      .map(payment => payment.transactionId)
      .filter((id): id is string => Boolean(id))
  )

  // Mês em que a fatura vence (sem os cartões: o próprio mês da fatura)
  const invoiceDueMonth = (invoice: CardInvoice) => {
    const card = cards?.find(item => item.id === invoice.cardId)
    return card ? getCardInvoiceDueDate(invoice.invoiceMonth, card.dueDay, card.closingDay).slice(0, 7) : invoice.invoiceMonth
  }

  const startYear = referenceDate.getFullYear()
  const startMonth = referenceDate.getMonth()

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(
      startYear,
      startMonth + index,
      1
    )

    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const key = [
      year,
      String(month).padStart(2, '0'),
    ].join('-')

    const monthTransactions = transactions.filter(
      transaction =>
        transaction.date.startsWith(key) &&
        !linkedTransactionIds.has(transaction.id)
    )

    const entradas = monthTransactions
      .filter(transaction => transaction.type === 'income')
      .map(transaction => transaction.amount).reduce((total, value) => total + Math.round(value * 100), 0) / 100

    const saidas = monthTransactions
      .filter(transaction => transaction.type === 'expense')
      .map(transaction => transaction.amount).reduce((total, value) => total + Math.round(value * 100), 0) / 100

   const monthInvoices = invoices.filter(
  invoice => invoiceDueMonth(invoice) === key
)

const faturas = monthInvoices.reduce(
  (sum, invoice) => sum + invoice.total,
  0
)

const invoiceCardIds = new Set(
  monthInvoices.map(invoice => invoice.cardId)
)

const totalPago = payments
  .filter(payment =>
    invoiceCardIds.has(payment.cardId) &&
    monthInvoices.some(invoice => invoice.cardId === payment.cardId && invoice.invoiceMonth === payment.invoiceMonth)
  )
  .map(payment => payment.amount).reduce((total, value) => total + Math.round(value * 100), 0) / 100

const faturasPagas = Math.max(
  0,
  Math.min(
    Math.round(faturas * 100),
    Math.round(totalPago * 100)
  )
) / 100

const faturasPendentes = (
  Math.round(faturas * 100) -
  Math.round(faturasPagas * 100)
) / 100

const totalDespesas = saidas + faturas

    return {
    key,
  name: `${MONTH_NAMES[month - 1]} ${year}`,
  entradas,
  saidas,
  faturas,
  faturasPagas,
  faturasPendentes,
  totalDespesas,
  saldoPrevisto: entradas - totalDespesas,
    }
  })
}
