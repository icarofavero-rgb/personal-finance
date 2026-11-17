
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PendingPaymentOperation } from './cardPaymentRecovery'

import { checkPendingPayment } from './cardPaymentRecoveryCheck'
import { checkPaymentSafety } from './cardPaymentSafety'

import { getPendingPaymentOperation } from './cardPaymentRecovery'
import { getCardPayments } from './cardPaymentsStorage'
import { getTransactions } from './storage'

vi.mock('./cardPaymentRecovery', () => ({
  getPendingPaymentOperation: vi.fn(),
}))

vi.mock('./cardPaymentsStorage', () => ({
  getCardPayments: vi.fn(),
}))

vi.mock('./storage', () => ({
  getTransactions: vi.fn(),
}))

const pending: PendingPaymentOperation = {
  operationId: 'operacao-teste',
  createdAt: '2026-11-08T12:00:00.000Z',
  payment: {
    id: 'pagamento-teste',
    cardId: 'cartao-teste',
    invoiceMonth: '2026-11',
    amount: 50,
    date: '2026-11-08',
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

const mockedPending = vi.mocked(getPendingPaymentOperation)
const mockedPayments = vi.mocked(getCardPayments)
const mockedTransactions = vi.mocked(getTransactions)

beforeEach(() => {
  vi.resetAllMocks()

  mockedPending.mockReturnValue(pending)
  mockedPayments.mockReturnValue([])
  mockedTransactions.mockReturnValue([])
})

describe('Recuperação de pagamentos', () => {
  it('identifica quando ambos os registros estão ausentes', () => {
    expect(checkPendingPayment().status).toBe('missing-both')
  })

  it('identifica pagamento sem transação', () => {
    mockedPayments.mockReturnValue([pending.payment])

    expect(checkPendingPayment().status).toBe(
      'missing-transaction'
    )
  })

  it('identifica transação sem pagamento', () => {
    mockedTransactions.mockReturnValue([pending.transaction])

    expect(checkPendingPayment().status).toBe(
      'missing-payment'
    )
  })

  it('confirma quando ambos os registros existem', () => {
    mockedPayments.mockReturnValue([pending.payment])
    mockedTransactions.mockReturnValue([pending.transaction])

    expect(checkPendingPayment().status).toBe('complete')
  })

  it('detecta divergência no valor do pagamento', () => {
    mockedPayments.mockReturnValue([
      { ...pending.payment, amount: 60 },
    ])
    mockedTransactions.mockReturnValue([pending.transaction])

    expect(checkPendingPayment().status).toBe('conflict')
  })

  it('bloqueia novos pagamentos quando existe pendência', () => {
    expect(checkPaymentSafety().safe).toBe(false)
  })

  it('libera pagamentos quando não existe pendência', () => {
    mockedPending.mockReturnValue(null)

    expect(checkPaymentSafety().safe).toBe(true)
  })

  it('bloqueia pagamentos se a recuperação falhar', () => {
    mockedPending.mockImplementation(() => {
      throw new Error('Registro corrompido')
    })

    expect(checkPaymentSafety().safe).toBe(false)
  })
})
