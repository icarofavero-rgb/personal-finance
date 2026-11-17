
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveCardPurchases } from '../cardPurchasesStorage'
import {
  addDebtor,
  addDebtorDebt,
  addDebtorPayment,
  getDebtorsData,
  updateDebtor,
  updateDebtorDebt,
  updateDebtorPayment,
} from './debtorsStorage'

import type {
  Debtor,
  DebtorDebt,
  DebtorPayment,
} from './debtorsTypes'

const memory = new Map<string, string>()

const debtor: Debtor = {
  id: 'person-1',
  name: 'Mariana',
  createdAt: '2026-11-08T10:00:00',
}

const debt: DebtorDebt = {
  id: 'debt-1',
  debtorId: 'person-1',
  description: 'Notebook',
  amountCents: 120000,
  installments: 6,
  date: '2026-11-08',
  createdAt: '2026-11-08T10:00:00',
}

function payment(
  id: string,
  amountCents: number
): DebtorPayment {
  return {
    id,
    debtId: 'debt-1',
    amountCents,
    date: '2026-11-08',
    createdAt: '2026-11-08T11:00:00',
  }
}

beforeEach(() => {
  memory.clear()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
  })
})

describe('Armazenamento de devedores', () => {
  it('inicia vazio', () => {
    expect(getDebtorsData()).toEqual({
      debtors: [],
      debts: [],
      payments: [],
    })
  })

  it('cadastra um devedor', () => {
    addDebtor(debtor)

    expect(getDebtorsData().debtors).toHaveLength(1)
  })

  it('impede devedor duplicado', () => {
    addDebtor(debtor)

    expect(() => addDebtor(debtor)).toThrow()
  })

  it('cadastra uma dívida', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    expect(getDebtorsData().debts).toHaveLength(1)
  })

  it('registra pagamento parcial', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 3783))

    expect(getDebtorsData().payments[0].amountCents)
      .toBe(3783)
  })

  it('impede pagamento maior que o saldo', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    expect(() =>
      addDebtorPayment(payment('p1', 130000))
    ).toThrow()

    expect(getDebtorsData().payments).toHaveLength(0)
  })

 
it('impede vínculo duplicado de compra', () => {
  saveCardPurchases([
    {
      id: 'purchase-1',
      cardId: 'card-1',
      description: 'Notebook',
      amount: 1200,
      category: 'Eletrônicos',
      date: '2026-11-08',
      installments: 6,
    },
  ])

  addDebtor(debtor)

  addDebtorDebt({
    ...debt,
    cardPurchaseId: 'purchase-1',
  })

  expect(() =>
    addDebtorDebt({
      ...debt,
      id: 'debt-2',
      cardPurchaseId: 'purchase-1',
    })
  ).toThrow('Esta compra já está vinculada a uma dívida.')

  expect(getDebtorsData().debts).toHaveLength(1)
})

  it('preserva dados quando o armazenamento está inválido', () => {
    memory.set('personal-finance-debtors-v1', '{invalid')

    expect(() => getDebtorsData()).toThrow()

    expect(memory.get('personal-finance-debtors-v1'))
      .toBe('{invalid')
  })

  it('atualiza o nome do devedor', () => {
    addDebtor(debtor)

    updateDebtor('person-1', {
      name: 'Mariana Silva',
    })

    expect(getDebtorsData().debtors[0].name)
      .toBe('Mariana Silva')
  })

  it('atualiza as observações', () => {
    addDebtor(debtor)

    updateDebtor('person-1', {
      name: 'Mariana',
      notes: 'Amiga de trabalho',
    })

    expect(getDebtorsData().debtors[0].notes)
      .toBe('Amiga de trabalho')
  })

  it('preserva o identificador e a data de criação', () => {
    addDebtor(debtor)

    updateDebtor('person-1', {
      name: 'Mariana Silva',
    })

    const updated = getDebtorsData().debtors[0]

    expect(updated.id).toBe('person-1')
    expect(updated.createdAt).toBe(debtor.createdAt)
  })

  it('preserva as dívidas associadas', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    updateDebtor('person-1', {
      name: 'Mariana Silva',
    })

    expect(getDebtorsData().debts).toEqual([debt])
  })

  it('preserva os pagamentos existentes', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 10000))

    const originalPayments = getDebtorsData().payments

    updateDebtor('person-1', {
      name: 'Mariana Silva',
    })

    expect(getDebtorsData().payments)
      .toEqual(originalPayments)
  })

  it('impede atualizar um devedor inexistente', () => {
    expect(() =>
      updateDebtor('person-inexistente', {
        name: 'Novo nome',
      })
    ).toThrow('Devedor não encontrado.')
  })

  it('rejeita nomes vazios', () => {
    addDebtor(debtor)

    expect(() =>
      updateDebtor('person-1', {
        name: '   ',
      })
    ).toThrow('Informe um nome válido.')

    expect(getDebtorsData().debtors[0].name)
      .toBe('Mariana')
  })

  it('não modifica outros devedores', () => {
    const anotherDebtor: Debtor = {
      id: 'person-2',
      name: 'Carlos',
      createdAt: '2026-11-09T10:00:00',
    }

    addDebtor(debtor)
    addDebtor(anotherDebtor)

    updateDebtor('person-1', {
      name: 'Mariana Silva',
    })

    const result = getDebtorsData().debtors

    expect(result[0].name).toBe('Mariana Silva')
    expect(result[1]).toEqual(anotherDebtor)
  })

  it('atualiza os dados de uma dívida', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    updateDebtorDebt('debt-1', {
      description: 'Notebook atualizado',
      amountCents: 150000,
      installments: 10,
      date: '2026-11-10',
      dueDate: '2026-12-10',
    })

    const updated = getDebtorsData().debts[0]

    expect(updated.description).toBe('Notebook atualizado')
    expect(updated.amountCents).toBe(150000)
    expect(updated.installments).toBe(10)
    expect(updated.date).toBe('2026-11-10')
    expect(updated.dueDate).toBe('2026-12-10')
  })

  it('preserva o identificador e a data de criação', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    updateDebtorDebt('debt-1', {
      description: 'Notebook atualizado',
      amountCents: 150000,
      installments: 10,
      date: debt.date,
    })

    const updated = getDebtorsData().debts[0]

    expect(updated.id).toBe(debt.id)
    expect(updated.createdAt).toBe(debt.createdAt)
    expect(updated.debtorId).toBe(debt.debtorId)
  })

  it('preserva os pagamentos existentes', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))

    const originalPayments = getDebtorsData().payments

    updateDebtorDebt('debt-1', {
      description: 'Notebook atualizado',
      amountCents: 150000,
      installments: 10,
      date: debt.date,
    })

    expect(getDebtorsData().payments).toEqual(originalPayments)
  })

  it('impede reduzir a dívida abaixo do valor recebido', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 100000))

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: 'Notebook',
        amountCents: 90000,
        installments: 6,
        date: debt.date,
      })
    ).toThrow()

    expect(getDebtorsData().debts[0].amountCents)
      .toBe(120000)
  })

  it('rejeita parcelamento inválido', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: 'Notebook',
        amountCents: 120000,
        installments: 0,
        date: debt.date,
      })
    ).toThrow()

    expect(getDebtorsData().debts[0]).toEqual(debt)
  })

  it('impede atualizar uma dívida inexistente', () => {
    expect(() =>
      updateDebtorDebt('debt-inexistente', {
        description: 'Teste',
        amountCents: 10000,
        installments: 1,
        date: debt.date,
      })
    ).toThrow('Dívida não encontrada.')
  })

  it('rejeita descrição vazia', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: '   ',
        amountCents: 120000,
        installments: 6,
        date: debt.date,
      })
    ).toThrow('Informe uma descrição válida.')
  })

  it('rejeita uma data de registro inválida', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: 'Notebook',
        amountCents: 120000,
        installments: 6,
        date: '2026-02-30',
      })
    ).toThrow('Informe uma data de registro válida.')
  })

  it('rejeita vencimento anterior à dívida', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: 'Notebook',
        amountCents: 120000,
        installments: 6,
        date: '2026-11-10',
        dueDate: '2026-11-09',
      })
    ).toThrow(
      'O vencimento não pode ser anterior à data da dívida.'
    )
  })

  it('preserva o vínculo com a compra do cartão', () => {
    saveCardPurchases([
      {
        id: 'purchase-1',
        cardId: 'card-1',
        description: 'Notebook',
        amount: 1200,
        category: 'Eletrônicos',
        date: '2026-11-08',
        installments: 6,
      },
    ])

    addDebtor(debtor)

    addDebtorDebt({
      ...debt,
      cardPurchaseId: 'purchase-1',
    })

    updateDebtorDebt('debt-1', {
      description: 'Notebook atualizado',
      amountCents: 120000,
      installments: 6,
      date: debt.date,
    })

    expect(getDebtorsData().debts[0].cardPurchaseId)
      .toBe('purchase-1')
  })

  it('impede alterar o valor de uma dívida vinculada', () => {
    saveCardPurchases([
      {
        id: 'purchase-1',
        cardId: 'card-1',
        description: 'Notebook',
        amount: 1200,
        category: 'Eletrônicos',
        date: '2026-11-08',
        installments: 6,
      },
    ])

    addDebtor(debtor)

    addDebtorDebt({
      ...debt,
      cardPurchaseId: 'purchase-1',
    })

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: 'Notebook',
        amountCents: 130000,
        installments: 6,
        date: debt.date,
      })
    ).toThrow(
      'O valor da dívida deve corresponder ao valor da compra.'
    )
  })

  it('impede alterar as parcelas de uma dívida vinculada', () => {
    saveCardPurchases([
      {
        id: 'purchase-1',
        cardId: 'card-1',
        description: 'Notebook',
        amount: 1200,
        category: 'Eletrônicos',
        date: '2026-11-08',
        installments: 6,
      },
    ])

    addDebtor(debtor)

    addDebtorDebt({
      ...debt,
      cardPurchaseId: 'purchase-1',
    })

    expect(() =>
      updateDebtorDebt('debt-1', {
        description: 'Notebook',
        amountCents: 120000,
        installments: 10,
        date: debt.date,
      })
    ).toThrow(
      'As parcelas da dívida devem corresponder às da compra.'
    )
  })

  it('atualiza um recebimento existente', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))

    updateDebtorPayment('p1', {
      amountCents: 40000,
      date: '2026-11-10',
      notes: 'Pagamento atualizado',
    })

    const updated = getDebtorsData().payments[0]

    expect(updated.amountCents).toBe(40000)
    expect(updated.date).toBe('2026-11-10')
    expect(updated.notes).toBe('Pagamento atualizado')
  })

  it('preserva identificador, dívida e data de criação', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))

    updateDebtorPayment('p1', {
      amountCents: 40000,
      date: '2026-11-10',
    })

    const updated = getDebtorsData().payments[0]

    expect(updated.id).toBe('p1')
    expect(updated.debtId).toBe('debt-1')
    expect(updated.createdAt).toBe('2026-11-08T11:00:00')
  })

  it('preserva os outros recebimentos', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))
    addDebtorPayment(payment('p2', 20000))

    updateDebtorPayment('p1', {
      amountCents: 40000,
      date: '2026-11-10',
    })

    const payments = getDebtorsData().payments

    expect(payments).toHaveLength(2)
    expect(payments.find(item => item.id === 'p2'))
      .toEqual(payment('p2', 20000))
  })

  it('impede recebimento superior ao saldo disponível', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))
    addDebtorPayment(payment('p2', 20000))

    expect(() =>
      updateDebtorPayment('p1', {
        amountCents: 110000,
        date: '2026-11-10',
      })
    ).toThrow()

    expect(
      getDebtorsData().payments.find(item => item.id === 'p1')
        ?.amountCents
    ).toBe(30000)
  })

  it('rejeita valores inválidos', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))

    expect(() =>
      updateDebtorPayment('p1', {
        amountCents: 0,
        date: '2026-11-10',
      })
    ).toThrow()

    expect(getDebtorsData().payments[0].amountCents)
      .toBe(30000)
  })

  it('rejeita datas inválidas', () => {
    addDebtor(debtor)
    addDebtorDebt(debt)
    addDebtorPayment(payment('p1', 30000))

    expect(() =>
      updateDebtorPayment('p1', {
        amountCents: 40000,
        date: '2026-02-30',
      })
    ).toThrow('Informe uma data de recebimento válida.')
  })

  it('impede atualizar recebimento inexistente', () => {
    expect(() =>
      updateDebtorPayment('payment-inexistente', {
        amountCents: 10000,
        date: '2026-11-10',
      })
    ).toThrow('Recebimento não encontrado.')
  })

})
