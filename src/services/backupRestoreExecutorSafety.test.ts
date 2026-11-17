
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { executeBackupRestore } from './backupRestoreExecutor'
import type { BackupRestorePlan } from './backupRestorePlan'

const memory = new Map<string, string>()

const KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  journal: 'personal-finance-pending-backup-snapshot',
  legacy: 'personal-finance-pending-backup-restore',
  debtors: 'personal-finance-debtors-v1',
}

const plan: BackupRestorePlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

let failVerificationRead = false
let failJournalRemoval = false

const storageMock = {
  getItem(key: string): string | null {
    if (
      failVerificationRead &&
      key === KEYS.transactions &&
      memory.get(KEYS.transactions) === '[]'
    ) {
      failVerificationRead = false
      throw new Error('Falha simulada de leitura')
    }

    return memory.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    memory.set(key, value)
  },

  removeItem(key: string): void {
    if (failJournalRemoval && key === KEYS.journal) {
      return
    }

    memory.delete(key)
  },
}

describe('Segurança do executor de restauração', () => {
  beforeEach(() => {
    memory.clear()
    failVerificationRead = false
    failJournalRemoval = false

    vi.stubGlobal('localStorage', storageMock)

    memory.set(
      KEYS.transactions,
      '[{"id":"transacao-original"}]'
    )
    memory.set(KEYS.cards, '[]')
    memory.set(KEYS.purchases, '[]')
    memory.set(KEYS.payments, '[]')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restaura normalmente e finaliza o snapshot', () => {
    executeBackupRestore(plan)

    expect(memory.get(KEYS.transactions)).toBe('[]')
    expect(memory.has(KEYS.journal)).toBe(false)
  })

  it('recupera dados após exceção na verificação', () => {
    failVerificationRead = true

    expect(() => executeBackupRestore(plan)).toThrow()

    expect(memory.get(KEYS.transactions)).toBe(
      '[{"id":"transacao-original"}]'
    )

    expect(memory.has(KEYS.journal)).toBe(false)
  })

  it('preserva o snapshot se a finalização falhar', () => {
    failJournalRemoval = true

    expect(() => executeBackupRestore(plan)).toThrow()

    expect(memory.get(KEYS.transactions)).toBe('[]')
    expect(memory.has(KEYS.journal)).toBe(true)
  })

  it('bloqueia nova restauração com snapshot pendente', () => {
    failJournalRemoval = true

    expect(() => executeBackupRestore(plan)).toThrow()

    failJournalRemoval = false

    expect(() => executeBackupRestore(plan)).toThrow(
      /snapshot de recuperação pendente/
    )

    expect(memory.has(KEYS.journal)).toBe(true)
  })

it('preserva o snapshot quando a recuperação falha', () => {
  const originalStorage = globalThis.localStorage

  let failVerification = true
  let failRecovery = true

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      if (
        failVerification &&
        key === KEYS.transactions &&
        memory.get(key) === '[]'
      ) {
        failVerification = false
        throw new Error('Falha simulada na verificação')
      }

      return memory.get(key) ?? null
    },

    setItem(key: string, value: string): void {
      if (
        failRecovery &&
        key === KEYS.transactions &&
        value === '[{"id":"transacao-original"}]'
      ) {
        failRecovery = false
        throw new Error('Falha simulada na recuperação')
      }

      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)
    },
  })

  expect(() => executeBackupRestore(plan)).toThrow(
    /recuperação automática não foi concluída/
  )

  expect(memory.has(KEYS.journal)).toBe(true)

  expect(memory.get(KEYS.transactions)).toBe('[]')
})

it('preserva o snapshot quando a recuperação é parcial', () => {
  const originalStorage = globalThis.localStorage

  let failVerification = true

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      if (
        failVerification &&
        key === KEYS.transactions &&
        memory.get(key) === '[]'
      ) {
        failVerification = false

        throw new Error(
          'Falha simulada durante a verificação'
        )
      }

      return originalStorage.getItem(key)
    },

    setItem(key: string, value: string): void {
      if (
        key === KEYS.transactions &&
        value === '[{"id":"transacao-original"}]'
      ) {
        // Simula uma gravação que não persiste.
        return
      }

      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)
    },
  })

  expect(() => executeBackupRestore(plan)).toThrow(
    /recuperação automática não foi concluída/
  )

  expect(memory.get(KEYS.transactions)).toBe('[]')

  expect(memory.has(KEYS.journal)).toBe(true)
})

it('recupera os cinco conjuntos após falha na gravação V5', () => {
  const planV5: BackupRestorePlan = {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [],
      debts: [],
      payments: [],
    },
  }

  const originalDebtors = JSON.stringify({
    debtors: [],
    debts: [],
    payments: [],
  })

  memory.set(KEYS.debtors, originalDebtors)

  const originalValues = new Map(memory)

  const originalStorage = globalThis.localStorage
  let failed = false

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      return originalStorage.getItem(key)
    },

    setItem(key: string, value: string): void {
      if (key === KEYS.debtors && !failed) {
        failed = true
        throw new Error('Falha simulada ao gravar devedores')
      }

      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)
    },
  })

  expect(() => executeBackupRestore(planV5)).toThrow()

  expect(failed).toBe(true)

  for (const [key, value] of originalValues) {
    expect(memory.get(key)).toBe(value)
  }

  expect(memory.has(KEYS.journal)).toBe(false)
})

it('recupera os dados quando a gravação V5 falha silenciosamente', () => {
  const planV5: BackupRestorePlan = {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [],
      debts: [],
      payments: [],
    },
  }

  const originalDebtors = JSON.stringify({
    debtors: [
      {
        id: 'devedor-original',
        name: 'Pessoa original',
      },
    ],
    debts: [],
    payments: [],
  })

  memory.set(KEYS.debtors, originalDebtors)

  const originalValues = new Map(memory)
  const originalStorage = globalThis.localStorage

  let ignoredWrite = false

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      return originalStorage.getItem(key)
    },

    setItem(key: string, value: string): void {
      if (
        key === KEYS.debtors &&
        value === JSON.stringify(planV5.debtorsData)
      ) {
        ignoredWrite = true

        // Simula uma gravação que não persiste.
        return
      }

      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)
    },
  })

  expect(() => executeBackupRestore(planV5)).toThrow(
    /Não foi possível confirmar a restauração/
  )

  expect(ignoredWrite).toBe(true)

  // Todos os valores anteriores devem ser recuperados.
  for (const [key, value] of originalValues) {
    expect(memory.get(key)).toBe(value)
  }

  // O snapshot só pode ser removido após recuperação.
  expect(memory.has(KEYS.journal)).toBe(false)
})

it('restaura V5 com segurança quando a chave de devedores não existia', () => {
  const planV5: BackupRestorePlan = {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [],
      debts: [],
      payments: [],
    },
  }

  // Simula um usuário que nunca cadastrou devedores.
  memory.delete(KEYS.debtors)

  expect(memory.has(KEYS.debtors)).toBe(false)

  executeBackupRestore(planV5)

  // A restauração deve gravar os dados V5 corretamente.
  expect(memory.get(KEYS.debtors)).toBe(
    JSON.stringify(planV5.debtorsData)
  )

  // O registro temporário deve ser finalizado.
  expect(memory.has(KEYS.journal)).toBe(false)
})

it('não altera dados V5 quando a criação do snapshot falha', () => {
  const planV5: BackupRestorePlan = {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [],
      debts: [],
      payments: [],
    },
  }

  const originalDebtors = JSON.stringify({
    debtors: [],
    debts: [],
    payments: [],
  })

  memory.set(KEYS.debtors, originalDebtors)

  const originalValues = new Map(memory)
  const originalStorage = globalThis.localStorage

  let snapshotWriteAttempted = false

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      return originalStorage.getItem(key)
    },

    setItem(key: string, value: string): void {
      if (key === KEYS.journal) {
        snapshotWriteAttempted = true
        throw new Error('Falha simulada ao criar snapshot')
      }

      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)
    },
  })

  expect(() => executeBackupRestore(planV5)).toThrow(
    /Falha simulada ao criar snapshot/
  )

  expect(snapshotWriteAttempted).toBe(true)

  // Nenhum conjunto financeiro pode ser alterado.
  expect([...memory.entries()]).toEqual(
    [...originalValues.entries()]
  )

  // Nenhum registro incompleto deve permanecer.
  expect(memory.has(KEYS.journal)).toBe(false)
})

it('não executa recuperação após erro na confirmação da finalização', () => {
  const originalStorage = globalThis.localStorage

  let journalRemoved = false
  let confirmationReadFailed = false

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      if (key === KEYS.journal && journalRemoved) {
        confirmationReadFailed = true

        throw new Error(
          'Falha simulada ao confirmar finalização'
        )
      }

      return originalStorage.getItem(key)
    },

    setItem(key: string, value: string): void {
      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)

      if (key === KEYS.journal) {
        journalRemoved = true
      }
    },
  })

  expect(() => executeBackupRestore(plan)).toThrow(
    /Falha simulada ao confirmar finalização/
  )

  expect(journalRemoved).toBe(true)
  expect(confirmationReadFailed).toBe(true)

  // Os dados restaurados e verificados não devem
  // ser revertidos por uma falha na finalização.
  expect(memory.get(KEYS.transactions)).toBe('[]')

  // O registro foi removido antes da falha de leitura.
  expect(memory.has(KEYS.journal)).toBe(false)
})

it('bloqueia V5 quando o snapshot não inclui Devedores', () => {
  const planV5: BackupRestorePlan = {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [],
      debts: [],
      payments: [],
    },
  }

  const originalValues = new Map(memory)
  const originalStorage = globalThis.localStorage

  let journalModified = false

  vi.stubGlobal('localStorage', {
    getItem(key: string): string | null {
      return originalStorage.getItem(key)
    },

    setItem(key: string, value: string): void {
      if (key === KEYS.journal) {
        const journal = JSON.parse(value) as {
          operationId: string
          createdAt: string
          snapshot: Record<string, unknown>
        }

        // Simula um snapshot antigo sem Devedores.
        delete journal.snapshot.debtors

        journalModified = true

        originalStorage.setItem(
          key,
          JSON.stringify(journal)
        )

        return
      }

      originalStorage.setItem(key, value)
    },

    removeItem(key: string): void {
      originalStorage.removeItem(key)
    },
  })

  expect(() => executeBackupRestore(planV5)).toThrow()

  expect(journalModified).toBe(true)

  // Nenhum dado financeiro deve ser alterado.
  for (const key of [
    KEYS.transactions,
    KEYS.cards,
    KEYS.purchases,
    KEYS.payments,
    KEYS.debtors,
  ]) {
    expect(memory.get(key)).toBe(originalValues.get(key))
  }

  // O registro deve permanecer para análise.
  expect(memory.has(KEYS.journal)).toBe(true)
})

})
