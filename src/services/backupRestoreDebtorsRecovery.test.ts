
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createBackupRestoreSnapshotJournal,
  getBackupRestoreSnapshotJournal,
  recoverBackupRestoreSnapshot,
  finishBackupRestoreSnapshot,
} from './backupRestoreSnapshotJournal'

const memory = new Map<string, string>()

const DEBTORS_KEY = 'personal-finance-debtors-v1'
const JOURNAL_KEY =
  'personal-finance-pending-backup-snapshot'

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

describe('Recuperação dos Devedores', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('recupera os dados originais dos Devedores', () => {
    const original = JSON.stringify({
      debtors: [{ id: 'debtor-1', name: 'Mariana' }],
      debts: [],
      payments: [],
    })

    memory.set(DEBTORS_KEY, original)

    createBackupRestoreSnapshotJournal('restore-1')

    // Simula uma alteração durante a restauração.
    memory.set(DEBTORS_KEY, '{"debtors":[]}')

    recoverBackupRestoreSnapshot()

    expect(memory.get(DEBTORS_KEY)).toBe(original)
    expect(memory.has(JOURNAL_KEY)).toBe(false)
  })

  it('remove dados criados quando originalmente não existiam', () => {
    createBackupRestoreSnapshotJournal('restore-2')

    memory.set(DEBTORS_KEY, '{"debtors":[]}')

    recoverBackupRestoreSnapshot()

    expect(memory.has(DEBTORS_KEY)).toBe(false)
    expect(memory.has(JOURNAL_KEY)).toBe(false)
  })

  it('preserva os Devedores ao recuperar um snapshot antigo', () => {
    const original = '{"debtors":[{"id":"debtor-2"}]}'

    memory.set(DEBTORS_KEY, original)

    // Simula um registro antigo sem a propriedade debtors.
    const oldJournal = {
      operationId: 'restore-old',
      createdAt: new Date().toISOString(),
      snapshot: {
        transactions: null,
        cards: null,
        purchases: null,
        payments: null,
      },
    }

    memory.set(JOURNAL_KEY, JSON.stringify(oldJournal))

    recoverBackupRestoreSnapshot()

    expect(memory.get(DEBTORS_KEY)).toBe(original)
    expect(memory.has(JOURNAL_KEY)).toBe(false)
  })

  it('rejeita um registro de Devedores com formato inválido', () => {
    const invalidJournal = {
      operationId: 'restore-invalid',
      createdAt: new Date().toISOString(),
      snapshot: {
        transactions: null,
        cards: null,
        purchases: null,
        payments: null,
        debtors: 123,
      },
    }

    memory.set(JOURNAL_KEY, JSON.stringify(invalidJournal))

    expect(() => getBackupRestoreSnapshotJournal()).toThrow()

    // O registro inválido permanece para investigação.
    expect(memory.has(JOURNAL_KEY)).toBe(true)
  })

  it('preserva os dados originais quando uma gravação falha', () => {
    const original = '{"debtors":[{"id":"debtor-3"}]}'

    memory.set(DEBTORS_KEY, original)

    createBackupRestoreSnapshotJournal('restore-failure')

    // Simula uma alteração que precisa ser revertida.
    memory.set(DEBTORS_KEY, '{"debtors":[]}')

    const workingStorage = globalThis.localStorage

    let shouldFail = true

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: workingStorage.getItem.bind(workingStorage),
        removeItem: workingStorage.removeItem.bind(workingStorage),
        setItem(key: string, value: string): void {
          if (key === DEBTORS_KEY && shouldFail) {
            shouldFail = false
            throw new Error('Falha simulada de gravação')
          }

          workingStorage.setItem(key, value)
        },
      },
    })

    try {
      expect(() => recoverBackupRestoreSnapshot()).toThrow(
        'Falha simulada de gravação'
      )

      expect(memory.has(JOURNAL_KEY)).toBe(true)

      // Uma nova tentativa deve conseguir recuperar os dados.
      recoverBackupRestoreSnapshot()

      expect(memory.get(DEBTORS_KEY)).toBe(original)
      expect(memory.has(JOURNAL_KEY)).toBe(false)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: workingStorage,
      })
    }
  })

it('confirma a integridade dos dados recuperados', () => {
  const originalTransactions =
    '[{"id":"transaction-original"}]'

  const originalDebtors =
    '{"debtors":[{"id":"debtor-original"}]}'

  memory.set(
    'personal-finance-transactions',
    originalTransactions
  )

  memory.set(DEBTORS_KEY, originalDebtors)

  createBackupRestoreSnapshotJournal('restore-integrity')

  memory.set(
    'personal-finance-transactions',
    '[]'
  )

  memory.set(DEBTORS_KEY, '{"debtors":[]}')

  recoverBackupRestoreSnapshot()

  expect(
    memory.get('personal-finance-transactions')
  ).toBe(originalTransactions)

  expect(
    memory.get(DEBTORS_KEY)
  ).toBe(originalDebtors)

  expect(memory.has(JOURNAL_KEY)).toBe(false)
})

it('mantém o snapshot quando a verificação detecta divergência', () => {
  const original = '{"debtors":[{"id":"debtor-safe"}]}'

  memory.set(DEBTORS_KEY, original)

  createBackupRestoreSnapshotJournal('restore-mismatch')

  memory.set(DEBTORS_KEY, '{"debtors":[]}')

  const workingStorage = globalThis.localStorage

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: workingStorage.getItem.bind(workingStorage),
      removeItem: workingStorage.removeItem.bind(workingStorage),

      setItem(key: string, value: string): void {
        if (key === DEBTORS_KEY) {
          // Simula uma gravação que não persiste.
          return
        }

        workingStorage.setItem(key, value)
      },
    },
  })

  try {
    expect(() => recoverBackupRestoreSnapshot()).toThrow()

    expect(memory.has(JOURNAL_KEY)).toBe(true)

    expect(memory.get(DEBTORS_KEY))
      .not.toBe(original)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: workingStorage,
    })
  }
})

it('finaliza corretamente um snapshot válido', () => {
  createBackupRestoreSnapshotJournal('finish-valid')

  expect(memory.has(JOURNAL_KEY)).toBe(true)

  finishBackupRestoreSnapshot()

  expect(memory.has(JOURNAL_KEY)).toBe(false)
})

it('rejeita finalização sem snapshot pendente', () => {
  expect(() => finishBackupRestoreSnapshot()).toThrow(
    'Não existe uma restauração pendente para finalizar.'
  )

  expect(memory.has(JOURNAL_KEY)).toBe(false)
})

it('preserva um snapshot corrompido durante a finalização', () => {
  const corrupted = '{json-invalido'

  memory.set(JOURNAL_KEY, corrupted)

  expect(() => finishBackupRestoreSnapshot()).toThrow()

  expect(memory.get(JOURNAL_KEY)).toBe(corrupted)
})

it('detecta falha silenciosa ao remover o snapshot', () => {
  createBackupRestoreSnapshotJournal('finish-failure')

  const originalJournal = memory.get(JOURNAL_KEY)
  const workingStorage = globalThis.localStorage

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: workingStorage.getItem.bind(workingStorage),
      setItem: workingStorage.setItem.bind(workingStorage),

      removeItem(key: string): void {
        if (key === JOURNAL_KEY) {
          // Simula uma remoção que não persiste.
          return
        }

        workingStorage.removeItem(key)
      },
    },
  })

  try {
    expect(() => finishBackupRestoreSnapshot()).toThrow(
      'Não foi possível confirmar a finalização da restauração.'
    )

    expect(memory.get(JOURNAL_KEY)).toBe(originalJournal)
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: workingStorage,
    })
  }
})

})
