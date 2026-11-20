/**
 * Editar QUALQUER transação pela tela de Transações, mantendo os vínculos:
 *
 * - Pagamento de fatura: valor e data mudam também no pagamento da fatura.
 * - Pagamento de "Eu devo" (Devedores): valor e data mudam também no
 *   pagamento registrado em Devedores.
 * - Transação comum: salva como sempre.
 *
 * (Compras no cartão são editadas com updateCardPurchase.)
 */

import { getTransactions, saveTransactions, type Transaction } from './storage'
import { getCardPayments, saveCardPayments } from './cardPaymentsStorage'
import { deleteDebtorPayment, getDebtorsData, updateDebtorPayment } from './debtors/debtorsStorage'
import { DEBT_PAYMENT_PREFIX, isDebtPaymentTransaction, syncDebtPaymentTransactions } from './debtors/debtPaymentTransactions'
import { deleteCardPurchase, getCardPurchases } from './cardPurchasesStorage'

export type LinkedKind = 'invoice-payment' | 'debt-payment' | 'plain'

export function getLinkedKind(transactionId: string): LinkedKind {
  if (isDebtPaymentTransaction(transactionId)) return 'debt-payment'
  if (getCardPayments().some(payment => payment.transactionId === transactionId)) return 'invoice-payment'
  return 'plain'
}

/** Mensagem curta para o formulário explicar o que muda junto. */
export function linkedEditHint(kind: LinkedKind): string | null {
  if (kind === 'invoice-payment') return 'Pagamento de fatura: mudar o valor ou a data muda também o pagamento registrado na fatura.'
  if (kind === 'debt-payment') return 'Pagamento de dívida (Eu devo): mudar o valor ou a data muda também o pagamento em Devedores.'
  return null
}

function replaceTransaction(updated: Transaction) {
  const list = getTransactions()
  if (!list.some(item => item.id === updated.id)) throw new Error('Transação não encontrada.')
  saveTransactions(list.map(item => (item.id === updated.id ? updated : item)))
}

/** Salva a transação editada, levando valor e data para o registro ligado. */
export function saveEditedTransaction(updated: Transaction): void {
  const kind = getLinkedKind(updated.id)

  if (kind === 'invoice-payment') {
    if (updated.type !== 'expense') throw new Error('O pagamento de fatura precisa continuar como saída.')
    const payments = getCardPayments()
    const next = payments.map(payment =>
      payment.transactionId === updated.id ? { ...payment, amount: Math.round(updated.amount * 100) / 100, date: updated.date } : payment
    )
    saveCardPayments(next)
    try {
      replaceTransaction(updated)
    } catch (error) {
      saveCardPayments(payments) // desfaz se a transação não puder ser salva
      throw error
    }
    return
  }

  if (kind === 'debt-payment') {
    if (updated.type !== 'expense') throw new Error('O pagamento de dívida precisa continuar como saída.')
    const paymentId = updated.id.slice(DEBT_PAYMENT_PREFIX.length)
    const payment = getDebtorsData().payments.find(item => item.id === paymentId)
    if (!payment) throw new Error('Pagamento não encontrado em Devedores.')
    // valida (não pode passar do que falta da dívida) e salva em Devedores
    updateDebtorPayment(paymentId, { amountCents: Math.round(updated.amount * 100), date: updated.date, notes: payment.notes })
    replaceTransaction(updated)
    syncDebtPaymentTransactions(getDebtorsData())
    return
  }

  replaceTransaction(updated)
}

/** A compra no cartão está ligada a uma dívida de Devedores? */
export function purchaseDebtLink(purchaseId: string): { description: string } | null {
  try {
    const debt = getDebtorsData().debts.find(item => item.cardPurchaseId === purchaseId)
    return debt ? { description: debt.description } : null
  } catch {
    return null
  }
}

export function getPurchase(purchaseId: string) {
  return getCardPurchases().find(item => item.id === purchaseId) ?? null
}

export type DeleteTarget = {
  /** id da linha em Transações */
  id: string
  /** compra no cartão (linhas "card-…") */
  purchaseId?: string
}

/** Texto do aviso de confirmação, conforme o tipo. */
export function describeDelete(target: DeleteTarget): { title: string; message: string } {
  if (target.purchaseId) {
    return {
      title: 'Excluir compra no cartão?',
      message: 'A compra inteira (todas as parcelas) sai das faturas do cartão e o limite é liberado. Isso não pode ser desfeito.',
    }
  }
  const kind = getLinkedKind(target.id)
  if (kind === 'invoice-payment') {
    return {
      title: 'Excluir pagamento de fatura?',
      message: 'O pagamento registrado na fatura também é desfeito: a fatura volta a ficar em aberto (ou com o valor que faltar). Isso não pode ser desfeito.',
    }
  }
  if (kind === 'debt-payment') {
    return {
      title: 'Excluir pagamento de dívida?',
      message: 'O pagamento também sai de Devedores → Eu devo, e o valor volta a constar como a pagar. Isso não pode ser desfeito.',
    }
  }
  return { title: 'Excluir transação?', message: 'Deseja realmente excluir esta transação? Essa ação não poderá ser desfeita.' }
}

/** Exclui qualquer linha de Transações, junto com o registro ligado a ela. */
export function deleteAnyTransaction(target: DeleteTarget): void {
  if (target.purchaseId) {
    const debt = purchaseDebtLink(target.purchaseId)
    if (debt) {
      throw new Error(`Esta compra está ligada à dívida “${debt.description}” em Devedores. Exclua a dívida por lá: a compra sai junto.`)
    }
    deleteCardPurchase(target.purchaseId)
    return
  }

  const kind = getLinkedKind(target.id)

  if (kind === 'invoice-payment') {
    // primeiro desfaz o pagamento da fatura; depois a transação deixa de ser protegida
    const payments = getCardPayments()
    saveCardPayments(payments.filter(payment => payment.transactionId !== target.id))
    try {
      saveTransactions(getTransactions().filter(item => item.id !== target.id))
    } catch (error) {
      saveCardPayments(payments)
      throw error
    }
    return
  }

  if (kind === 'debt-payment') {
    deleteDebtorPayment(target.id.slice(DEBT_PAYMENT_PREFIX.length))
    syncDebtPaymentTransactions(getDebtorsData())
    return
  }

  saveTransactions(getTransactions().filter(item => item.id !== target.id))
}
