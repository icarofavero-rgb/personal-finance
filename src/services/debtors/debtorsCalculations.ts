
import type {
  DebtorDebt,
  DebtorPayment,
} from './debtorsTypes'

export type DebtSummary = {
  totalCents: number
  receivedCents: number
  remainingCents: number
  paidInstallments: number
  installments: number
  progressPercent: number
  status: 'pending' | 'partial' | 'paid'
}

export function calculateDebtSummary(
  debt: DebtorDebt,
  payments: DebtorPayment[]
): DebtSummary {
  const totalCents = debt.amountCents

  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents <= 0 ||
    !Number.isInteger(debt.installments) ||
    debt.installments < 1 ||
    debt.installments > 120
  ) {
    throw new Error('Dados da dívida inválidos.')
  }

  const relatedPayments = payments.filter(
    payment => payment.debtId === debt.id
  )

  let receivedCents = 0

  for (const payment of relatedPayments) {
    if (
      !Number.isSafeInteger(payment.amountCents) ||
      payment.amountCents <= 0
    ) {
      throw new Error('Valor de pagamento inválido.')
    }

    receivedCents += payment.amountCents

    if (!Number.isSafeInteger(receivedCents)) {
      throw new Error('Total de pagamentos inválido.')
    }
  }

  if (receivedCents > totalCents) {
    throw new Error('Pagamentos excedem o valor da dívida.')
  }

  const remainingCents = totalCents - receivedCents

  // Distribui centavos restantes entre as parcelas.
  const base = Math.floor(totalCents / debt.installments)
  const remainder = totalCents % debt.installments

  let coveredCents = 0
  let paidInstallments = 0

  for (let index = 0; index < debt.installments; index++) {
    const installmentCents =
      base + (index < remainder ? 1 : 0)

    if (coveredCents + installmentCents > receivedCents) {
      break
    }

    coveredCents += installmentCents
    paidInstallments++
  }

  const progressPercent =
    (receivedCents / totalCents) * 100

  const status =
    remainingCents === 0
      ? 'paid'
      : receivedCents > 0
        ? 'partial'
        : 'pending'

  return {
    totalCents,
    receivedCents,
    remainingCents,
    paidInstallments,
    installments: debt.installments,
    progressPercent,
    status,
  }
}

export function validateDebtorPayment(
  debt: DebtorDebt,
  existingPayments: DebtorPayment[],
  newAmountCents: number
): void {
  if (
    !Number.isSafeInteger(newAmountCents) ||
    newAmountCents <= 0
  ) {
    throw new Error('Informe um valor válido.')
  }

  const summary = calculateDebtSummary(
    debt,
    existingPayments
  )

  if (newAmountCents > summary.remainingCents) {
    throw new Error(
      'O pagamento não pode ultrapassar o saldo restante.'
    )
  }
}
