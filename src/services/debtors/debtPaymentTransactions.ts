/**
 * Devedores → "Eu devo": cada pagamento que você faz para alguém vira uma
 * SAÍDA em Transações (categoria Finanças / Dívidas com pessoas). Assim ele
 * entra no Dashboard, nos gráficos, no histórico e nos relatórios.
 *
 * As saídas têm o id "debt-payment-<id do pagamento>" e são mantidas
 * sempre iguais aos pagamentos: editar ou excluir o pagamento (ou a dívida)
 * muda ou remove a saída junto.
 */

import { getTransactions, saveTransactions, TRANSACTIONS_CHANGED_EVENT, type Transaction } from '../storage'
import { DEBT_PAYMENT_CATEGORY } from '../categories'
import type { DebtorsData } from './debtorsStorage'

export const DEBT_PAYMENT_PREFIX = 'debt-payment-'

export function isDebtPaymentTransaction(id: string): boolean {
  return id.startsWith(DEBT_PAYMENT_PREFIX)
}

/** As saídas que deveriam existir, a partir dos dados de Devedores. */
export function buildDebtPaymentTransactions(data: DebtorsData): Transaction[] {
  const iOwe = new Map(data.debtors.filter(debtor => debtor.kind === 'i-owe').map(debtor => [debtor.id, debtor]))
  const result: Transaction[] = []

  for (const payment of data.payments) {
    const debt = data.debts.find(item => item.id === payment.debtId)
    const debtor = debt ? iOwe.get(debt.debtorId) : undefined
    if (!debt || !debtor) continue

    result.push({
      id: `${DEBT_PAYMENT_PREFIX}${payment.id}`,
      description: `Pagamento a ${debtor.name}: ${debt.description}`,
      amount: payment.amountCents / 100,
      type: 'expense',
      category: DEBT_PAYMENT_CATEGORY,
      date: payment.date,
    })
  }

  return result
}

/**
 * Deixa as transações iguais aos pagamentos (cria, atualiza e remove).
 * Devolve true se algo mudou.
 */
export function syncDebtPaymentTransactions(data: DebtorsData): boolean {
  const wanted = buildDebtPaymentTransactions(data)
  const wantedById = new Map(wanted.map(item => [item.id, item]))
  const current = getTransactions()

  let changed = false
  const next: Transaction[] = []

  for (const transaction of current) {
    if (!isDebtPaymentTransaction(transaction.id)) {
      next.push(transaction)
      continue
    }
    const target = wantedById.get(transaction.id)
    if (!target) {
      changed = true // pagamento (ou dívida) excluído
      continue
    }
    wantedById.delete(transaction.id)
    const same =
      transaction.description === target.description &&
      transaction.amount === target.amount &&
      transaction.date === target.date &&
      transaction.category === target.category &&
      transaction.type === target.type
    if (!same) changed = true
    next.push(same ? transaction : { ...transaction, ...target })
  }

  for (const missing of wantedById.values()) {
    next.push(missing)
    changed = true
  }

  if (changed) {
    saveTransactions(next)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT))
  }

  return changed
}
