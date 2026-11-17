
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createBackupRestoreSnapshotJournal,
  recoverBackupRestoreSnapshot,
} from './backupRestoreSnapshotJournal'

describe('Recuperação do snapshot V5', () => {
  const memory = new Map<string, string>()

  const debtorsKey = 'personal-finance-debtors-v1'
  const journalKey = 'personal-finance-pending-backup-snapshot'

  beforeEach(() => {
    memory.clear()
    vi.unstubAllGlobals()

    vi.stubGlobal('localStorage', {
      getItem(key: string): string | null {
        return memory.get(key) ?? null
      },

      setItem(key: string, value: string): void {
        memory.set(key, value)
      },

      removeItem(key: string): void {
        memory.delete(key)
      },
    })
  })

  it('recupera os devedores anteriores após uma alteração', () => {
    const original = JSON.stringify({
      debtors: [
        {
          id: 'devedor-original',
          name: 'Pessoa original',
        },
      ],
      debts: [],
      payments: [],
    })

    memory.set(debtorsKey, original)

    createBackupRestoreSnapshotJournal('teste-recuperacao-v5')

    expect(memory.has(journalKey)).toBe(true)

    memory.set(
      debtorsKey,
      JSON.stringify({
        debtors: [],
        debts: [],
        payments: [],
      })
    )

    recoverBackupRestoreSnapshot()

    expect(memory.get(debtorsKey)).toBe(original)
    expect(memory.has(journalKey)).toBe(false)
  })

  it('remove a chave de devedores quando ela não existia', () => {
    expect(memory.has(debtorsKey)).toBe(false)

    createBackupRestoreSnapshotJournal('teste-chave-ausente')

    memory.set(
      debtorsKey,
      JSON.stringify({
        debtors: [],
        debts: [],
        payments: [],
      })
    )

    recoverBackupRestoreSnapshot()

    expect(memory.has(debtorsKey)).toBe(false)
    expect(memory.has(journalKey)).toBe(false)
  })

it('preserva o registro quando a recuperação dos devedores falha', () => {
  const original = JSON.stringify({
    debtors: [
      {
        id: 'devedor-original',
        name: 'Pessoa original',
      },
    ],
    debts: [],
    payments: [],
  })

  memory.set(debtorsKey, original)

  createBackupRestoreSnapshotJournal(
    'teste-falha-recuperacao-v5'
  )

  const savedJournal = memory.get(journalKey)

  // Simula dados modificados por uma restauração.
  memory.set(
    debtorsKey,
    JSON.stringify({
      debtors: [],
      debts: [],
      payments: [],
    })
  )

  // Simula uma falha ao tentar recuperar os devedores.
  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },

    setItem(key: string, value: string): void {
      if (key === debtorsKey) {
        throw new Error('Falha simulada de gravação')
      }

      memory.set(key, value)
    },

    removeItem(key: string): void {
      memory.delete(key)
    },
  })

  expect(() => recoverBackupRestoreSnapshot()).toThrow()

  // O registro precisa continuar disponível.
  expect(memory.get(journalKey)).toBe(savedJournal)
  expect(memory.has(journalKey)).toBe(true)
})

})
