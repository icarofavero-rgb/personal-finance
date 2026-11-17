
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validateDebtCardLink } from './debtorsCardLink'
import type { DebtorDebt } from './debtorsTypes'
import { getCardPurchases } from '../cardPurchasesStorage'

vi.mock('../cardPurchasesStorage', () => ({
  getCardPurchases: vi.fn(),
}))

const mockedGetPurchases = vi.mocked(getCardPurchases)

const debt: DebtorDebt = {
  id: 'debt-1',
  debtorId: 'person-1',
  description: 'Notebook',
  amountCents: 120000,
  cardPurchaseId: 'purchase-1',
  installments: 6,
  date: '2026-11-08',
  createdAt: '2026-11-08T10:00:00',
}

const purchase = {
  id: 'purchase-1',
  cardId: 'card-1',
  description: 'Notebook',
  amount: 1200,
  category: 'Eletrônicos',
  date: '2026-11-08',
  installments: 6,
}

beforeEach(() => {
  vi.resetAllMocks()
  mockedGetPurchases.mockReturnValue([purchase])
})

describe('Vínculo de dívidas com cartões', () => {
  it('aceita compra válida', () => {
    expect(() => validateDebtCardLink(debt))
      .not.toThrow()
  })

  it('impede compra inexistente', () => {
    mockedGetPurchases.mockReturnValue([])

    expect(() => validateDebtCardLink(debt))
      .toThrow('Compra do cartão não encontrada.')
  })

  it('impede valor diferente', () => {
    expect(() =>
      validateDebtCardLink({
        ...debt,
        amountCents: 100000,
      })
    ).toThrow(
      'O valor da dívida deve corresponder ao valor da compra.'
    )
  })

  it('impede parcelamento diferente', () => {
    expect(() =>
      validateDebtCardLink({
        ...debt,
        installments: 3,
      })
    ).toThrow(
      'As parcelas da dívida devem corresponder às da compra.'
    )
  })

  it('aceita dívida sem cartão', () => {
    expect(() =>
      validateDebtCardLink({
        ...debt,
        cardPurchaseId: undefined,
      })
    ).not.toThrow()
  })
})
