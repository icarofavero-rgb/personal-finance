
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  addBudget,
  deleteBudget,
  getBudgetsStrict,
  updateBudget,
  type Budget,
} from './budgetsStorage'

const simulatedStorage = new Map<string, string>()

const STORAGE_KEY = 'personal-finance-budgets-v1'

const validBudget: Budget = {
  id: 'orcamento-001',
  category: 'Alimentação',
  month: '2026-11',
  limitCents: 60000,
  createdAt: '2026-11-15T12:00:00.000Z',
}

beforeEach(() => {
  simulatedStorage.clear()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      simulatedStorage.get(key) ?? null,

    setItem: (key: string, value: string) => {
      simulatedStorage.set(key, value)
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Segurança do armazenamento de orçamentos', () => {
  it('retorna lista vazia quando não existem orçamentos', () => {
    expect(getBudgetsStrict()).toEqual([])
  })

  it('permite cadastrar um orçamento válido', () => {
    addBudget(validBudget)

    expect(getBudgetsStrict()).toEqual([validBudget])
  })

  it('impede cadastro quando o JSON está corrompido', () => {
    simulatedStorage.set(STORAGE_KEY, '{json-invalido')

    expect(() => addBudget(validBudget)).toThrow(
      'Não foi possível validar os orçamentos armazenados.'
    )

    expect(simulatedStorage.get(STORAGE_KEY)).toBe(
      '{json-invalido'
    )
  })

  it('impede cadastro quando existem registros inválidos', () => {
    const invalidBudget = {
      ...validBudget,
      limitCents: -100,
    }

    const original = JSON.stringify([invalidBudget])

    simulatedStorage.set(STORAGE_KEY, original)

    expect(() => addBudget(validBudget)).toThrow(
      'Não foi possível validar os orçamentos armazenados.'
    )

    expect(simulatedStorage.get(STORAGE_KEY)).toBe(original)
  })

  it('impede orçamentos duplicados na mesma categoria e mês', () => {
    addBudget(validBudget)

    expect(() =>
      addBudget({
        ...validBudget,
        id: 'orcamento-002',
      })
    ).toThrow(
      'Já existe um orçamento para esta categoria neste mês.'
    )
  })

  it('bloqueia leitura quando o armazenamento falha', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Falha simulada')
      },
    })

    expect(() => getBudgetsStrict()).toThrow(
      'Não foi possível validar os orçamentos armazenados.'
    )
  })

it('permite editar o limite de um orçamento', () => {
  addBudget(validBudget)

  updateBudget({
    ...validBudget,
    limitCents: 90000,
  })

  const budgets = getBudgetsStrict()

  expect(budgets).toHaveLength(1)
  expect(budgets[0].limitCents).toBe(90000)
})

it('preserva a identidade e a data de criação', () => {
  addBudget(validBudget)

  updateBudget({
    ...validBudget,
    limitCents: 75000,
    createdAt: '2026-12-01T12:00:00.000Z',
  })

  const updated = getBudgetsStrict()[0]

  expect(updated.id).toBe(validBudget.id)
  expect(updated.createdAt).toBe(validBudget.createdAt)
})

it('preserva os demais orçamentos durante a edição', () => {
  const secondBudget: Budget = {
    ...validBudget,
    id: 'orcamento-002',
    category: 'Transporte',
  }

  addBudget(validBudget)
  addBudget(secondBudget)

  updateBudget({
    ...validBudget,
    limitCents: 85000,
  })

  const budgets = getBudgetsStrict()

  expect(budgets).toHaveLength(2)
  expect(budgets.find(
    item => item.id === secondBudget.id
  )).toEqual(secondBudget)
})

it('impede edição que gere categoria duplicada', () => {
  const secondBudget: Budget = {
    ...validBudget,
    id: 'orcamento-002',
    category: 'Transporte',
  }

  addBudget(validBudget)
  addBudget(secondBudget)

  const original = simulatedStorage.get(STORAGE_KEY)

  expect(() =>
    updateBudget({
      ...secondBudget,
      category: 'Alimentação',
    })
  ).toThrow(
    'Já existe um orçamento para esta categoria neste mês.'
  )

  expect(simulatedStorage.get(STORAGE_KEY)).toBe(original)
})

it('não sobrescreve dados corrompidos durante a edição', () => {
  simulatedStorage.set(STORAGE_KEY, '{json-invalido')

  expect(() =>
    updateBudget({
      ...validBudget,
      limitCents: 90000,
    })
  ).toThrow(
    'Não foi possível validar os orçamentos armazenados.'
  )

  expect(simulatedStorage.get(STORAGE_KEY)).toBe(
    '{json-invalido'
  )
})

it('exclui somente o orçamento selecionado', () => {
  const secondBudget: Budget = {
    ...validBudget,
    id: 'orcamento-002',
    category: 'Transporte',
  }

  addBudget(validBudget)
  addBudget(secondBudget)

  deleteBudget(validBudget.id)

  expect(getBudgetsStrict()).toEqual([secondBudget])
})

it('permite excluir o último orçamento', () => {
  addBudget(validBudget)

  deleteBudget(validBudget.id)

  expect(getBudgetsStrict()).toEqual([])
})

it('impede excluir um orçamento inexistente', () => {
  addBudget(validBudget)

  const original = simulatedStorage.get(STORAGE_KEY)

  expect(() =>
    deleteBudget('orcamento-inexistente')
  ).toThrow(
    'O orçamento que você tentou excluir não foi encontrado.'
  )

  expect(simulatedStorage.get(STORAGE_KEY)).toBe(original)
})

it('impede exclusão com identificador vazio', () => {
  addBudget(validBudget)

  const original = simulatedStorage.get(STORAGE_KEY)

  expect(() => deleteBudget('')).toThrow(
    'Identificador de orçamento inválido.'
  )

  expect(simulatedStorage.get(STORAGE_KEY)).toBe(original)
})

it('não exclui registros quando o armazenamento está corrompido', () => {
  simulatedStorage.set(
    STORAGE_KEY,
    '{json-invalido'
  )

  expect(() =>
    deleteBudget(validBudget.id)
  ).toThrow(
    'Não foi possível validar os orçamentos armazenados.'
  )

  expect(simulatedStorage.get(STORAGE_KEY)).toBe(
    '{json-invalido'
  )
})

it('preserva os dados quando a gravação falha', () => {
  addBudget(validBudget)

  const original = simulatedStorage.get(STORAGE_KEY)

  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      simulatedStorage.get(key) ?? null,

    setItem: () => {
      throw new Error('Falha simulada de gravação')
    },
  })

  expect(() =>
    deleteBudget(validBudget.id)
  ).toThrow('Falha simulada de gravação')

  expect(simulatedStorage.get(STORAGE_KEY)).toBe(original)
})

})
