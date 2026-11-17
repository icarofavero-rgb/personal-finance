
export type Debtor = {
  id: string
  name: string
  notes?: string
  createdAt: string
}

export type DebtorDebt = {
  id: string
  debtorId: string

  description: string

  // Valores monetários armazenados em centavos
  amountCents: number

  // Compra vinculada, quando existir
  cardPurchaseId?: string

  // Para empréstimos sem cartão
  installments: number

  date: string
  dueDate?: string

  createdAt: string
}

export type DebtorPayment = {
  id: string
  debtId: string

  amountCents: number
  date: string

  notes?: string
  createdAt: string

  // Futuramente poderá vincular uma transação
  transactionId?: string
}
