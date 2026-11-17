
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerCardPayment } from './cardPaymentOperations'

import { getTransactions, saveTransactions } from './storage'
import { getCardPayments, saveCardPayments } from './cardPaymentsStorage'
import { getCards } from './cardsStorage'
import { getCardPurchases } from './cardPurchasesStorage'
import { getCardInvoices } from './cardInvoices'
import { validateCardPayment } from './cardPaymentValidation'
import { checkPaymentSafety } from './cardPaymentSafety'
import { prepareCardPaymentOperation } from './cardPaymentOperationPreparation'
import {
  savePendingPaymentOperation,
  clearPendingPaymentOperation,
} from './cardPaymentRecovery'
import { checkPendingPayment } from './cardPaymentRecoveryCheck'

import type { CardPayment } from './cardPaymentsStorage'
import type { PendingPaymentOperation } from './cardPaymentRecovery'

vi.mock('./storage', () => ({
  getTransactions: vi.fn(),
  saveTransactions: vi.fn(),
}))

vi.mock('./cardPaymentsStorage', () => ({
  getCardPayments: vi.fn(),
  saveCardPayments: vi.fn(),
}))

vi.mock('./cardsStorage', () => ({
  getCards: vi.fn(),
}))

vi.mock('./cardPurchasesStorage', () => ({
  getCardPurchases: vi.fn(),
}))

vi.mock('./cardInvoices', () => ({
  getCardInvoices: vi.fn(),
}))

vi.mock('./cardPaymentValidation', () => ({
  validateCardPayment: vi.fn(),
}))

vi.mock('./cardPaymentSafety', () => ({
  checkPaymentSafety: vi.fn(),
}))

vi.mock('./cardPaymentOperationPreparation', () => ({
  prepareCardPaymentOperation: vi.fn(),
}))

vi.mock('./cardPaymentRecovery', () => ({
  savePendingPaymentOperation: vi.fn(),
  clearPendingPaymentOperation: vi.fn(),
}))

vi.mock('./cardPaymentRecoveryCheck', () => ({
  checkPendingPayment: vi.fn(),
}))

const payment: CardPayment = {
  id: 'pagamento-teste',
  cardId: 'cartao-teste',
  invoiceMonth: '2026-11',
  amount: 50,
  date: '2026-11-08',
}

const operation: PendingPaymentOperation = {
  operationId: 'operacao-teste',
  createdAt: '2026-11-08T12:00:00.000Z',
  payment: {
    ...payment,
    transactionId: 'transacao-teste',
  },
  transaction: {
    id: 'transacao-teste',
    description: 'Pagamento de fatura 2026-11',
    amount: 50,
    type: 'expense',
    category: 'Cartão de crédito',
    date: '2026-11-08',
  },
}

beforeEach(() => {
  vi.resetAllMocks()

  vi.mocked(getTransactions).mockReturnValue([])
  vi.mocked(getCardPayments).mockReturnValue([])
  vi.mocked(getCards).mockReturnValue([])
  vi.mocked(getCardPurchases).mockReturnValue([])
  vi.mocked(getCardInvoices).mockReturnValue([])

  vi.mocked(checkPaymentSafety).mockReturnValue({
    safe: true,
    message: 'Seguro',
  })

  vi.mocked(validateCardPayment).mockReturnValue({
    valid: true,
  })

  vi.mocked(prepareCardPaymentOperation).mockReturnValue(operation)

  vi.mocked(checkPendingPayment).mockReturnValue({
    status: 'complete',
    message: 'Registros confirmados',
  })
})

describe('Registro seguro de pagamentos', () => {
  it('registra a despesa e o pagamento', () => {
    const result = registerCardPayment(payment)

    expect(saveTransactions).toHaveBeenCalledWith([
      operation.transaction,
    ])

    expect(saveCardPayments).toHaveBeenCalledWith([
      operation.payment,
    ])

    expect(result).toEqual(operation.transaction)
  })

  it('salva a pendência antes dos registros', () => {
    registerCardPayment(payment)

    const pendingOrder =
      vi.mocked(savePendingPaymentOperation)
        .mock.invocationCallOrder[0]

    const transactionOrder =
      vi.mocked(saveTransactions)
        .mock.invocationCallOrder[0]

    expect(pendingOrder).toBeLessThan(transactionOrder)
  })

  it('remove a pendência após confirmação', () => {
    registerCardPayment(payment)

    expect(clearPendingPaymentOperation).toHaveBeenCalledOnce()
  })

  it('bloqueia pagamentos quando não é seguro', () => {
    vi.mocked(checkPaymentSafety).mockReturnValue({
      safe: false,
      message: 'Operação pendente',
    })

    expect(() => registerCardPayment(payment)).toThrow(
      'Operação pendente'
    )

    expect(saveTransactions).not.toHaveBeenCalled()
  })

  it('bloqueia pagamentos inválidos', () => {
    vi.mocked(validateCardPayment).mockReturnValue({
      valid: false,
      error: 'Pagamento inválido',
    })

    expect(() => registerCardPayment(payment)).toThrow(
      'Pagamento inválido'
    )

    expect(saveCardPayments).not.toHaveBeenCalled()
  })

  it('preserva pendência quando falha a gravação', () => {
    vi.mocked(saveCardPayments).mockImplementation(() => {
      throw new Error('Falha simulada')
    })

    expect(() => registerCardPayment(payment)).toThrow()

    expect(clearPendingPaymentOperation).not.toHaveBeenCalled()
  })

  it('não remove pendência quando a conferência falha', () => {
    vi.mocked(checkPendingPayment).mockReturnValue({
      status: 'missing-payment',
      message: 'Pagamento ausente',
    })

    expect(() => registerCardPayment(payment)).toThrow()

    expect(clearPendingPaymentOperation).not.toHaveBeenCalled()
  })

  it('retorna erro se não conseguir remover a pendência', () => {
    vi.mocked(clearPendingPaymentOperation)
      .mockImplementation(() => {
        throw new Error('Falha simulada')
      })

    expect(() => registerCardPayment(payment)).toThrow()
  })
})
