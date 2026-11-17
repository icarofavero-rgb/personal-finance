
import { describe, expect, it } from 'vitest'

import { validateBackupDebtors } from './backupDebtorsValidation'
import type { DebtorsData } from './debtors/debtorsStorage'
import type { CardPurchase } from './cardPurchasesStorage'

function makeData(): DebtorsData {
  return {
    debtors: [
      {
        id: 'person-1',
        name: 'Mariana',
        createdAt: '2026-11-08T10:00:00.000Z',
      },
    ],
    debts: [
      {
        id: 'debt-1',
        debtorId: 'person-1',
        description: 'Empréstimo',
        amountCents: 50000,
        installments: 5,
        date: '2026-11-08',
        createdAt: '2026-11-08T10:00:00.000Z',
      },
    ],
    payments: [],
  }
}

function makePurchase(): CardPurchase {
  return {
    id: 'purchase-1',
    cardId: 'card-1',
    description: 'Compra de teste',
    amount: 500,
    category: 'Outros',
    date: '2026-11-08',
    installments: 5,
  }
}

describe('Validação de Devedores no Backup V5', () => {
  it('aceita dados válidos', () => {
    expect(() =>
      validateBackupDebtors(makeData(), [])
    ).not.toThrow()
  })

  it('rejeita estrutura inválida', () => {
    expect(() =>
      validateBackupDebtors({ debtors: [] }, [])
    ).toThrow()
  })

  it('rejeita identificadores duplicados', () => {
    const data = makeData()

    data.debtors.push({ ...data.debtors[0] })

    expect(() =>
      validateBackupDebtors(data, [])
    ).toThrow()
  })

  it('rejeita dívida sem devedor existente', () => {
    const data = makeData()

    data.debts[0].debtorId = 'person-inexistente'

    expect(() =>
      validateBackupDebtors(data, [])
    ).toThrow()
  })

  it('rejeita recebimento acima do valor da dívida', () => {
    const data = makeData()

    data.payments.push({
      id: 'payment-1',
      debtId: 'debt-1',
      amountCents: 55000,
      date: '2026-11-08',
      createdAt: '2026-11-08T10:00:00.000Z',
    })

    expect(() =>
      validateBackupDebtors(data, [])
    ).toThrow()
  })

  it('aceita recebimento parcial', () => {
    const data = makeData()

    data.payments.push({
      id: 'payment-1',
      debtId: 'debt-1',
      amountCents: 3783,
      date: '2026-11-08',
      createdAt: '2026-11-08T10:00:00.000Z',
    })

    expect(() =>
      validateBackupDebtors(data, [])
    ).not.toThrow()
  })

  it('rejeita compra de cartão inexistente', () => {
    const data = makeData()

    data.debts[0].cardPurchaseId = 'purchase-inexistente'

    expect(() =>
      validateBackupDebtors(data, [])
    ).toThrow()
  })

  it('aceita dívida vinculada a uma compra válida', () => {
    const data = makeData()

    data.debts[0].cardPurchaseId = 'purchase-1'

    expect(() =>
      validateBackupDebtors(data, [makePurchase()])
    ).not.toThrow()
  })

  it('rejeita valor diferente da compra vinculada', () => {
    const data = makeData()
    const purchase = makePurchase()

    data.debts[0].cardPurchaseId = purchase.id
    purchase.amount = 600

    expect(() =>
      validateBackupDebtors(data, [purchase])
    ).toThrow()
  })

  it('rejeita quantidade de parcelas diferente', () => {
    const data = makeData()
    const purchase = makePurchase()

    data.debts[0].cardPurchaseId = purchase.id
    purchase.installments = 10

    expect(() =>
      validateBackupDebtors(data, [purchase])
    ).toThrow()
  })

  it('rejeita recebimento sem dívida existente', () => {
    const data = makeData()

    data.payments.push({
      id: 'payment-1',
      debtId: 'debt-inexistente',
      amountCents: 1000,
      date: '2026-11-08',
      createdAt: '2026-11-08T10:00:00.000Z',
    })

    expect(() =>
      validateBackupDebtors(data, [])
    ).toThrow()
  })

  it('rejeita uma compra vinculada a duas dívidas', () => {
    const data = makeData()

    data.debts[0].cardPurchaseId = 'purchase-1'

    data.debts.push({
      ...data.debts[0],
      id: 'debt-2',
    })

    expect(() =>
      validateBackupDebtors(data, [makePurchase()])
    ).toThrow()
  })
})
