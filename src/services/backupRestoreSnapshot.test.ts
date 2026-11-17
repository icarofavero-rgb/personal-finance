
import { beforeEach, describe, expect, it } from 'vitest'

import {
  captureBackupStorageSnapshot,
} from './backupRestoreSnapshot'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      memory.set(key, value)
    },
    removeItem(key: string): void {
      memory.delete(key)
    },
  },
})

const DEBTORS_KEY = 'personal-finance-debtors-v1'

describe('Backup Restore Snapshot', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('preserva chaves ausentes como null', () => {
    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.transactions).toBeNull()
    expect(snapshot.cards).toBeNull()
    expect(snapshot.purchases).toBeNull()
    expect(snapshot.payments).toBeNull()
    expect(snapshot.debtors).toBeNull()
  })

  it('preserva listas vazias exatamente', () => {
    memory.set('personal-finance-transactions', '[]')
    memory.set('personal-finance-credit-cards', '[]')

    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.transactions).toBe('[]')
    expect(snapshot.cards).toBe('[]')
  })

  it('preserva o JSON original sem alterações', () => {
    const transactionsJson =
      '[{"id":"transaction-1","amount":150}]'

    memory.set(
      'personal-finance-transactions',
      transactionsJson
    )

    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.transactions).toBe(transactionsJson)
  })

  it('preserva conteúdo corrompido sem interpretar', () => {
    memory.set(
      'personal-finance-card-payments',
      '{invalid-json'
    )

    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.payments).toBe('{invalid-json')
  })

  it('não modifica os dados existentes', () => {
    memory.set('personal-finance-transactions', '[]')
    memory.set(DEBTORS_KEY, '{"debtors":[]}')

    const before = [...memory.entries()]

    captureBackupStorageSnapshot()

    expect([...memory.entries()]).toEqual(before)
  })

  it('captura os dados dos devedores', () => {
    const debtorsJson = JSON.stringify({
      debtors: [
        {
          id: 'debtor-1',
          name: 'Mariana',
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      debts: [],
      payments: [],
    })

    memory.set(DEBTORS_KEY, debtorsJson)

    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.debtors).toBe(debtorsJson)
  })

  it('preserva dados corrompidos dos devedores', () => {
    memory.set(DEBTORS_KEY, '{invalid-json')

    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.debtors).toBe('{invalid-json')
  })

  it('preserva a ausência de dados dos devedores', () => {
    const snapshot = captureBackupStorageSnapshot()

    expect(snapshot.debtors).toBeNull()
  })
})
