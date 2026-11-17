import { beforeEach, describe, expect, it } from 'vitest'

import { captureChanges } from './changeTracker'
import { stableStringify } from './stableHash'
import {
  applyRemoteSyncPackage,
  createLocalSyncPackage,
  parseSyncSnapshot,
} from './syncApply'

/** Cada "aparelho" tem seu próprio armazenamento; `activate()` troca o ativo. */
function createDevice() {
  const memory = new Map<string, string>()

  return {
    memory,
    storage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, String(value))
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => memory.clear(),
      key: (index: number) => [...memory.keys()][index] ?? null,
      get length() {
        return memory.size
      },
    },
    set(key: string, value: unknown) {
      memory.set(key, JSON.stringify(value))
    },
    get(key: string): unknown {
      const raw = memory.get(key)
      return raw === undefined ? undefined : JSON.parse(raw)
    },
  }
}

type Device = ReturnType<typeof createDevice>

let active: Device

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get: () => active.storage,
})

function activate(device: Device) {
  active = device
}

const card = {
  id: 'card-1',
  name: 'Nubank',
  bank: 'Nu',
  limit: 2000,
  closingDay: 5,
  dueDay: 12,
}

const purchase = {
  id: 'purchase-1',
  cardId: 'card-1',
  description: 'Fone',
  amount: 300,
  category: 'Outros',
  date: '2026-11-10',
  installments: 3,
}

function tx(id: string, description: string, amount = 50) {
  return {
    id,
    description,
    amount,
    type: 'expense',
    category: 'Outros',
    date: '2026-11-15',
  }
}

const budget = {
  id: 'budget-1',
  category: 'Alimentação',
  month: '2026-11',
  limitCents: 90000,
  createdAt: '2026-11-01T10:00:00.000Z',
}

/** Troca de pacotes como fará a conexão real: cada um aplica o do outro. */
function syncPair(a: Device, b: Device) {
  activate(a)
  const packageA = JSON.parse(JSON.stringify(createLocalSyncPackage()))
  activate(b)
  const packageB = JSON.parse(JSON.stringify(createLocalSyncPackage()))

  activate(a)
  const resultA = applyRemoteSyncPackage(packageB)
  activate(b)
  const resultB = applyRemoteSyncPackage(packageA)

  return { resultA, resultB }
}

const DATA_KEYS = [
  'personal-finance-transactions',
  'personal-finance-credit-cards',
  'personal-finance-card-purchases',
  'personal-finance-card-payments',
  'personal-finance-debtors-v1',
  'personal-finance-budgets-v1',
  'personal-finance-goals',
]

let pc: Device
let phone: Device

beforeEach(() => {
  pc = createDevice()
  phone = createDevice()
})

describe('aplicação da sincronização', () => {
  it('junta os dados dos dois aparelhos e ambos terminam iguais', () => {
    pc.set('personal-finance-transactions', [tx('t-pc', 'Aluguel', 1500)])
    pc.set('personal-finance-credit-cards', [card])
    pc.set('personal-finance-card-purchases', [purchase])
    activate(pc)
    captureChanges()

    phone.set('personal-finance-transactions', [tx('t-phone', 'Café', 8)])
    phone.set('personal-finance-budgets-v1', [budget])
    activate(phone)
    captureChanges()

    const { resultA, resultB } = syncPair(pc, phone)

    expect(resultA.summary).toContain('transações: 1 novo(s)')
    expect(resultA.summary).toContain('orçamentos: 1 novo(s)')
    expect(resultB.summary).toContain('cartões: 1 novo(s)')

    // Mesmo conteúdo (a ordem pode variar: cada aparelho mantém os seus primeiro).
    const normalized = (value: unknown) =>
      Array.isArray(value)
        ? value.map(item => stableStringify(item)).sort()
        : stableStringify(value ?? null)

    for (const key of DATA_KEYS) {
      expect(normalized(pc.get(key))).toEqual(normalized(phone.get(key)))
    }

    const ids = (phone.get('personal-finance-transactions') as { id: string }[])
      .map(item => item.id)
      .sort()

    expect(ids).toEqual(['t-pc', 't-phone'])

    // Nenhuma pendência de recuperação ficou para trás.
    expect(pc.memory.has('personal-finance-pending-backup-snapshot')).toBe(false)
    expect(phone.memory.has('personal-finance-pending-backup-snapshot')).toBe(false)
  })

  it('sincronizar de novo não muda nada', () => {
    pc.set('personal-finance-transactions', [tx('t1', 'Luz')])
    activate(pc)
    captureChanges()
    activate(phone)
    captureChanges()

    syncPair(pc, phone)
    const { resultA, resultB } = syncPair(pc, phone)

    expect(resultA.changed).toBe(false)
    expect(resultB.changed).toBe(false)
    expect(resultA.summary).toEqual([])
  })

  it('aplicar os dados recebidos não os transforma em "edições" deste aparelho', () => {
    pc.set('personal-finance-transactions', [tx('t1', 'Luz')])
    activate(pc)
    captureChanges()
    activate(phone)
    captureChanges()

    syncPair(pc, phone)

    activate(phone)
    const before = phone.memory.get('personal-finance-sync-meta-v1')
    captureChanges()

    expect(phone.memory.get('personal-finance-sync-meta-v1')).toBe(before)
  })

  it('recusa uma junção inconsistente sem alterar nada', () => {
    // O PC tem um pagamento de fatura de um cartão que não existe.
    pc.set('personal-finance-card-payments', [
      {
        id: 'pay-1',
        cardId: 'cartao-inexistente',
        invoiceMonth: '2026-11',
        amount: 100,
        date: '2026-11-12',
      },
    ])
    activate(pc)
    captureChanges()

    phone.set('personal-finance-transactions', [tx('t-phone', 'Café', 8)])
    activate(phone)
    captureChanges()

    activate(pc)
    const pcPackage = JSON.parse(JSON.stringify(createLocalSyncPackage()))

    activate(phone)
    const before = new Map(phone.memory)

    expect(() => applyRemoteSyncPackage(pcPackage)).toThrow(/inconsistentes/)
    expect(new Map(phone.memory)).toEqual(before)
  })

  it('recusa pacote do próprio aparelho', () => {
    activate(pc)
    captureChanges()
    const own = JSON.parse(JSON.stringify(createLocalSyncPackage()))

    expect(() => applyRemoteSyncPackage(own)).toThrow(/mesmo aparelho/)
  })

  it('recusa pacotes malformados', () => {
    expect(() => parseSyncSnapshot({ format: 'outro' })).toThrow()
    expect(() =>
      parseSyncSnapshot({
        format: 'personal-finance-sync',
        version: 1,
        deviceId: 'x',
        clock: 1,
        collections: {
          transactions: {
            records: { a: {} },
            meta: {}, // registro sem diário
          },
        },
      })
    ).toThrow()
  })
})
