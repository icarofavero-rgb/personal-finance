
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { executeBackupRestore } from './backupRestoreExecutor'
import type { BackupRestorePlan } from './backupRestorePlan'

const KEYS = {
  transactions: 'personal-finance-transactions',
  cards: 'personal-finance-credit-cards',
  purchases: 'personal-finance-card-purchases',
  payments: 'personal-finance-card-payments',
  debtors: 'personal-finance-debtors-v1',
  journal: 'personal-finance-pending-backup-snapshot',
}

const FINANCIAL_KEYS = [
  KEYS.transactions,
  KEYS.cards,
  KEYS.purchases,
  KEYS.payments,
  KEYS.debtors,
]

const memory = new Map<string, string>()

const originalValues = new Map<string, string>()

let failDebtorsWrite = false
let failVerificationRead = false
let failRecoveryWrite = false

const planV5: Extract<
  BackupRestorePlan,
  { version: 5 }
> = {
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

const storageMock = {
  getItem(key: string): string | null {
    if (
      failVerificationRead &&
      key === KEYS.transactions &&
      memory.get(key) === '[]'
    ) {
      failVerificationRead = false
      throw new Error('Falha simulada na verificação.')
    }

    return memory.get(key) ?? null
  },

  setItem(key: string, value: string): void {
    if (failDebtorsWrite && key === KEYS.debtors) {
      failDebtorsWrite = false
      throw new Error('Falha simulada na gravação dos devedores.')
    }

    if (
      failRecoveryWrite &&
      key === KEYS.transactions &&
      value === originalValues.get(key)
    ) {
      failRecoveryWrite = false
      throw new Error('Falha simulada na recuperação.')
    }

    memory.set(key, value)
  },

  removeItem(key: string): void {
    memory.delete(key)
  },
}

function seedOriginalData(): void {
  const original: Record<string, string> = {
    [KEYS.transactions]:
      '[{"id":"transacao-original"}]',

    [KEYS.cards]:
      '[{"id":"cartao-original"}]',

    [KEYS.purchases]:
      '[{"id":"compra-original"}]',

    [KEYS.payments]:
      '[{"id":"pagamento-original"}]',

    [KEYS.debtors]: JSON.stringify({
      debtors: [
        {
          id: 'devedor-original',
          name: 'Pessoa original',
          createdAt: '2026-11-10T10:00:00.000Z',
        },
      ],
      debts: [],
      payments: [],
    }),
  }

  for (const [key, value] of Object.entries(original)) {
    memory.set(key, value)
    originalValues.set(key, value)
  }
}

function expectOriginalDataRestored(): void {
  for (const key of FINANCIAL_KEYS) {
    expect(memory.get(key)).toBe(
      originalValues.get(key)
    )
  }
}

describe('Integração real da restauração Backup V5', () => {
  beforeEach(() => {
    memory.clear()
    originalValues.clear()

    failDebtorsWrite = false
    failVerificationRead = false
    failRecoveryWrite = false

    seedOriginalData()

    vi.stubGlobal('localStorage', storageMock)

    vi.stubGlobal('crypto', {
      randomUUID: () => 'integration-test-operation',
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restaura corretamente os cinco conjuntos financeiros', () => {
    executeBackupRestore(planV5)

    expect(memory.get(KEYS.transactions)).toBe('[]')
    expect(memory.get(KEYS.cards)).toBe('[]')
    expect(memory.get(KEYS.purchases)).toBe('[]')
    expect(memory.get(KEYS.payments)).toBe('[]')

    expect(memory.get(KEYS.debtors)).toBe(
      JSON.stringify(planV5.debtorsData)
    )

    expect(memory.has(KEYS.journal)).toBe(false)
  })

  it('recupera os cinco conjuntos após falha na gravação', () => {
    failDebtorsWrite = true

    expect(() => executeBackupRestore(planV5)).toThrow(
      /dados anteriores foram recuperados/
    )

    expectOriginalDataRestored()

    expect(memory.has(KEYS.journal)).toBe(false)
  })

  it('recupera os cinco conjuntos após falha na verificação', () => {
    failVerificationRead = true

    expect(() => executeBackupRestore(planV5)).toThrow(
      /dados anteriores foram recuperados/
    )

    expectOriginalDataRestored()

    expect(memory.has(KEYS.journal)).toBe(false)
  })

  it('preserva o snapshot quando a recuperação também falha', () => {
    failDebtorsWrite = true
    failRecoveryWrite = true

    expect(() => executeBackupRestore(planV5)).toThrow(
      /recuperação automática não foi concluída/
    )

    expect(memory.has(KEYS.journal)).toBe(true)

    // A recuperação não foi concluída.
    // O registro precisa continuar disponível.
    expect(memory.get(KEYS.transactions)).toBe('[]')
  })

  it('bloqueia nova restauração enquanto existe snapshot pendente', () => {
    failDebtorsWrite = true
    failRecoveryWrite = true

    expect(() => executeBackupRestore(planV5)).toThrow()

    expect(memory.has(KEYS.journal)).toBe(true)

    expect(() => executeBackupRestore(planV5)).toThrow(
      /snapshot de recuperação pendente/
    )

    expect(memory.has(KEYS.journal)).toBe(true)
  })
})
