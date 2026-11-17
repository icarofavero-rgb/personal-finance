import { describe, expect, it } from 'vitest'

import { captureChanges, readSyncMeta, type StorageLike } from './changeTracker'
import { hashRecord, stableStringify } from './stableHash'
import { mergeSnapshots } from './syncMerge'
import { buildLocalSnapshot, snapshotToStorageValues } from './syncSnapshot'

const TX = 'personal-finance-transactions'
const DEBTORS = 'personal-finance-debtors-v1'
const APPEARANCE = 'personal-finance-appearance'

/** Simula o armazenamento de um aparelho. */
function device(initial: Record<string, unknown> = {}) {
  const memory = new Map<string, string>()

  for (const [key, value] of Object.entries(initial)) {
    memory.set(key, JSON.stringify(value))
  }

  const storage: StorageLike & { read: (key: string) => unknown } = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value)
    },
    read: key => {
      const raw = memory.get(key)
      return raw === undefined ? undefined : JSON.parse(raw)
    },
  }

  return storage
}

function tx(id: string, description: string, amount = 10) {
  return {
    id,
    description,
    amount,
    type: 'expense',
    category: 'Outros',
    date: '2026-11-17',
  }
}

/** Sincroniza `a` com `b` nos dois sentidos, como fará a troca real. */
function syncDevices(a: StorageLike, b: StorageLike, now: number) {
  const snapA = buildLocalSnapshot({ storage: a, now })
  const snapB = buildLocalSnapshot({ storage: b, now })

  const resultA = mergeSnapshots(snapA, snapB)
  const resultB = mergeSnapshots(snapB, snapA)

  for (const [storage, result] of [
    [a, resultA],
    [b, resultB],
  ] as const) {
    const { values, meta } = snapshotToStorageValues(result.snapshot, { storage })
    storage.setItem('personal-finance-sync-meta-v1', JSON.stringify(meta))
    for (const [key, value] of values) storage.setItem(key, value)
  }

  return { resultA, resultB }
}

describe('impressão digital estável', () => {
  it('ignora a ordem das propriedades', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableStringify({ a: { c: 3, d: 2 }, b: 1 })
    )
    expect(hashRecord({ b: 1, a: 2 })).toBe(hashRecord({ a: 2, b: 1 }))
  })

  it('detecta qualquer diferença de conteúdo', () => {
    expect(hashRecord(tx('1', 'Mercado', 10))).not.toBe(
      hashRecord(tx('1', 'Mercado', 10.01))
    )
  })
})

describe('rastreador de alterações', () => {
  it('na primeira execução marca os dados existentes como antigos (momento 0)', () => {
    const storage = device({ [TX]: [tx('1', 'Mercado')] })

    const meta = captureChanges({ storage, now: 5000 })

    expect(meta.collections.transactions['1'].t).toBe(0)
    expect(meta.deviceId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('registra criação, edição e exclusão com horário', () => {
    const storage = device({ [TX]: [tx('1', 'Mercado')] })
    captureChanges({ storage, now: 1000 })

    storage.setItem(TX, JSON.stringify([tx('1', 'Mercado'), tx('2', 'Farmácia')]))
    captureChanges({ storage, now: 2000 })
    expect(readSyncMeta(storage)!.collections.transactions['2'].t).toBe(2000)

    storage.setItem(TX, JSON.stringify([tx('1', 'Supermercado'), tx('2', 'Farmácia')]))
    captureChanges({ storage, now: 3000 })
    expect(readSyncMeta(storage)!.collections.transactions['1'].t).toBe(3000)

    storage.setItem(TX, JSON.stringify([tx('1', 'Supermercado')]))
    captureChanges({ storage, now: 4000 })
    const removed = readSyncMeta(storage)!.collections.transactions['2']
    expect(removed.x).toBe(true)
    expect(removed.t).toBe(4000)
  })

  it('não altera o diário quando nada mudou', () => {
    const storage = device({ [TX]: [tx('1', 'Mercado')] })
    captureChanges({ storage, now: 1000 })
    const before = storage.getItem('personal-finance-sync-meta-v1')

    captureChanges({ storage, now: 9000 })

    expect(storage.getItem('personal-finance-sync-meta-v1')).toBe(before)
  })

  it('o relógio nunca anda para trás', () => {
    const storage = device({ [TX]: [] })
    captureChanges({ storage, now: 10_000 })

    storage.setItem(TX, JSON.stringify([tx('1', 'A')]))
    captureChanges({ storage, now: 20_000 })

    // Relógio do aparelho "voltou" no tempo:
    storage.setItem(TX, JSON.stringify([tx('1', 'B')]))
    captureChanges({ storage, now: 5_000 })

    expect(readSyncMeta(storage)!.collections.transactions['1'].t).toBe(20_001)
  })

  it('dados ilegíveis nunca são tratados como "tudo excluído"', () => {
    const storage = device({ [TX]: [tx('1', 'Mercado')] })
    captureChanges({ storage, now: 1000 })

    storage.setItem(TX, '{corrompido')
    captureChanges({ storage, now: 2000 })

    expect(readSyncMeta(storage)!.collections.transactions['1'].x).toBeUndefined()
  })

  it('acompanha as listas dentro de Devedores', () => {
    const storage = device({
      [DEBTORS]: { debtors: [{ id: 'p1', name: 'Ana' }], debts: [], payments: [] },
    })

    const meta = captureChanges({ storage, now: 1000 })

    expect(Object.keys(meta.collections.debtors)).toEqual(['p1'])
  })
})

describe('sincronização entre dois aparelhos', () => {
  it('cada aparelho recebe o que o outro criou', () => {
    const phone = device({ [TX]: [] })
    const pc = device({ [TX]: [] })
    captureChanges({ storage: phone, now: 1 })
    captureChanges({ storage: pc, now: 1 })

    phone.setItem(TX, JSON.stringify([tx('a', 'Café')]))
    pc.setItem(TX, JSON.stringify([tx('b', 'Ônibus')]))

    const { resultA } = syncDevices(phone, pc, 1000)

    expect(resultA.stats.transactions.added).toBe(1)
    expect((phone.read(TX) as { id: string }[]).map(t => t.id).sort()).toEqual(['a', 'b'])
    expect((pc.read(TX) as { id: string }[]).map(t => t.id).sort()).toEqual(['a', 'b'])
  })

  it('na edição dos dois lados, vence a mais recente', () => {
    const phone = device({ [TX]: [tx('1', 'Mercado')] })
    const pc = device({ [TX]: [tx('1', 'Mercado')] })
    captureChanges({ storage: phone, now: 1 })
    captureChanges({ storage: pc, now: 1 })

    phone.setItem(TX, JSON.stringify([tx('1', 'Mercado (celular)')]))
    captureChanges({ storage: phone, now: 2000 })

    pc.setItem(TX, JSON.stringify([tx('1', 'Mercado (PC)')]))
    captureChanges({ storage: pc, now: 3000 })

    syncDevices(phone, pc, 4000)

    expect(phone.read(TX)).toEqual([tx('1', 'Mercado (PC)')])
    expect(pc.read(TX)).toEqual([tx('1', 'Mercado (PC)')])
  })

  it('exclusões também são sincronizadas', () => {
    const phone = device({ [TX]: [tx('1', 'Mercado'), tx('2', 'Cinema')] })
    const pc = device({ [TX]: [] })
    captureChanges({ storage: phone, now: 1 })
    captureChanges({ storage: pc, now: 1 })

    syncDevices(phone, pc, 100)
    expect(pc.read(TX)).toHaveLength(2)

    pc.setItem(TX, JSON.stringify([tx('1', 'Mercado')]))
    captureChanges({ storage: pc, now: 500 })

    const { resultA } = syncDevices(phone, pc, 1000)

    expect(resultA.stats.transactions.deleted).toBe(1)
    expect(phone.read(TX)).toEqual([tx('1', 'Mercado')])
  })

  it('os dois aparelhos terminam idênticos e uma nova sincronização não muda nada', () => {
    const phone = device({
      [TX]: [tx('1', 'A')],
      [DEBTORS]: { debtors: [{ id: 'p1', name: 'Ana' }], debts: [], payments: [] },
      [APPEARANCE]: { theme: 'dark' },
    })
    const pc = device({ [TX]: [tx('2', 'B')] })
    captureChanges({ storage: phone, now: 1 })
    captureChanges({ storage: pc, now: 1 })

    syncDevices(phone, pc, 1000)

    for (const key of [TX, DEBTORS, APPEARANCE]) {
      expect(stableStringify(phone.read(key))).toBe(stableStringify(pc.read(key)))
    }

    const again = syncDevices(phone, pc, 2000)
    expect(again.resultA.changed).toBe(false)
    expect(again.resultB.changed).toBe(false)

    // Aplicar dados vindos do outro aparelho não gera "novas edições".
    const metaBefore = phone.getItem('personal-finance-sync-meta-v1')
    captureChanges({ storage: phone, now: 3000 })
    expect(phone.getItem('personal-finance-sync-meta-v1')).toBe(metaBefore)
  })

  it('não cria áreas vazias que o aparelho nunca usou', () => {
    const phone = device({ [TX]: [tx('1', 'A')] })
    const pc = device({})
    captureChanges({ storage: phone, now: 1 })
    captureChanges({ storage: pc, now: 1 })

    syncDevices(phone, pc, 1000)

    expect(pc.getItem(DEBTORS)).toBeNull()
    expect(pc.getItem('personal-finance-goals')).toBeNull()
  })
})
