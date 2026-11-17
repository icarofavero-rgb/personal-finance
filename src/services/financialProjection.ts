
import type { Transaction } from './storage'
import type { CardInvoice } from './cardInvoices'
import type { CardPayment } from './cardPaymentsStorage'

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
}: ProjectionInput): FinancialProjectionMonth[] {
  const linkedTransactionIds = new Set(
    payments
      .map(payment => payment.transactionId)
      .filter((id): id is string => Boolean(id))
  )

  const startYear = referenceDate.getFullYear()
  const startMonth = referenceDate.getMonth()

  return Array.from({ length: 6 }, (_, index) => {
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
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const saidas = monthTransactions
      .filter(transaction => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

   const monthInvoices = invoices.filter(
  invoice => invoice.invoiceMonth === key
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
    payment.invoiceMonth === key &&
    invoiceCardIds.has(payment.cardId)
  )
  .reduce((sum, payment) => sum + payment.amount, 0)

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
