
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  readFinancialProfileData,
  writeFinancialProfileData,
} from './financialProfileData'

vi.mock('./financialProfilesStorage', () => ({
  getFinancialProfiles: () => [
    {
      id: 'perfil-a',
      name: 'Perfil A',
    },
    {
      id: 'perfil-b',
      name: 'Perfil B',
    },
  ],
}))

const simulatedStorage = new Map<string, string>()

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

describe('Isolamento dos dados financeiros', () => {
  it('mantém os dados separados entre perfis', () => {
    writeFinancialProfileData(
      'perfil-a',
      'transactions',
      [{ id: 'transacao-a', amount: 100 }]
    )

    writeFinancialProfileData(
      'perfil-b',
      'transactions',
      [{ id: 'transacao-b', amount: 200 }]
    )

    expect(
      readFinancialProfileData('perfil-a', 'transactions')
    ).toEqual([{ id: 'transacao-a', amount: 100 }])

    expect(
      readFinancialProfileData('perfil-b', 'transactions')
    ).toEqual([{ id: 'transacao-b', amount: 200 }])
  })

  it('rejeita gravação em perfil inexistente', () => {
    expect(() =>
      writeFinancialProfileData(
        'perfil-inexistente',
        'transactions',
        []
      )
    ).toThrow('Perfil financeiro não encontrado.')
  })

  it('não modifica a chave antiga das transações', () => {
    simulatedStorage.set(
      'personal-finance-transactions',
      '[{"id":"original"}]'
    )

    writeFinancialProfileData(
      'perfil-a',
      'transactions',
      []
    )

    expect(
      simulatedStorage.get('personal-finance-transactions')
    ).toBe('[{"id":"original"}]')
  })

  it('rejeita dados indefinidos', () => {
    expect(() =>
      writeFinancialProfileData(
        'perfil-a',
        'transactions',
        undefined
      )
    ).toThrow('Não é permitido salvar dados indefinidos.')
  })

  it('não sobrescreve JSON inválido durante a leitura', () => {
    simulatedStorage.set(
      'personal-finance-profile:perfil-a:transactions:v1',
      '{json-invalido'
    )

    expect(() =>
      readFinancialProfileData('perfil-a', 'transactions')
    ).toThrow('Não foi possível ler os dados do perfil.')

    expect(
      simulatedStorage.get(
        'personal-finance-profile:perfil-a:transactions:v1'
      )
    ).toBe('{json-invalido')
  })
})
