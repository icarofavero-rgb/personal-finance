import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  collectBackupModules,
  restoreBackupModules,
  validateBackupModules,
} from './backupModules'
import { importBackup } from './backup'
import { checkBackupRestoreSafety } from './backupRestoreSafety'
import { executeBackupRestore } from './backupRestoreExecutor'
import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

vi.mock('./backupRestoreSafety', () => ({
  checkBackupRestoreSafety: vi.fn(),
}))

vi.mock('./backupRestoreExecutor', () => ({
  executeBackupRestore: vi.fn(),
}))

vi.mock('./backupRestoreSafeAudit', () => ({
  safelyAuditBackupRestore: vi.fn(),
}))

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
  },
})

const goals = [
  {
    id: 'goal-1',
    name: 'Viagem',
    targetAmount: 5000,
    deadline: '2027-06-01',
    color: '#36C995',
    createdAt: '2026-11-01T10:00:00.000Z',
    movements: [
      {
        id: 'mov-1',
        amount: 300,
        type: 'deposit',
        date: '2026-11-01T10:00:00.000Z',
      },
    ],
  },
]

const budgets = [
  {
    id: 'budget-1',
    category: 'Alimentação',
    month: '2026-11',
    limitCents: 80000,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
]

const forecasts = [
  {
    id: 'forecast-1',
    description: 'Décimo terceiro',
    amount: 2500,
    type: 'income',
    date: '2026-12-20',
  },
]

function v5File(extra: Record<string, unknown> = {}): File {
  return new File(
    [
      JSON.stringify({
        version: 5,
        transactions: [],
        cards: [],
        purchases: [],
        payments: [],
        debtorsData: { debtors: [], debts: [], payments: [] },
        ...extra,
      }),
    ],
    'backup.json'
  )
}

beforeEach(() => {
  memory.clear()
  vi.clearAllMocks()

  vi.mocked(checkBackupRestoreSafety).mockReturnValue({
    safe: true,
    message: '',
  })

  vi.mocked(safelyAuditBackupRestore).mockReturnValue({
    valid: true,
    errors: [],
  })
})

describe('módulos complementares do backup', () => {
  it('exporta apenas os módulos que possuem dados', () => {
    memory.set('personal-finance-goals', JSON.stringify(goals))
    memory.set('personal-finance-budgets-v1', JSON.stringify(budgets))

    const modules = collectBackupModules()

    expect(Object.keys(modules).sort()).toEqual([
      'personal-finance-budgets-v1',
      'personal-finance-goals',
    ])
  })

  it('restaura metas, orçamentos, previsões e preferências', () => {
    memory.set('personal-finance-goals', JSON.stringify(goals))
    memory.set('personal-finance-budgets-v1', JSON.stringify(budgets))
    memory.set('personal-finance-manual-forecasts', JSON.stringify(forecasts))
    memory.set(
      'personal-finance-user-preferences',
      JSON.stringify({ name: 'Teste' })
    )

    const exported = collectBackupModules()

    memory.clear()

    const validated = validateBackupModules(exported)
    expect(validated).not.toBeNull()

    const restored = restoreBackupModules(validated!)

    expect(restored).toEqual([
      'Metas',
      'Orçamentos',
      'Previsões manuais',
      'Perfil',
    ])

    expect(JSON.parse(memory.get('personal-finance-goals')!)).toEqual(goals)
    expect(
      JSON.parse(memory.get('personal-finance-manual-forecasts')!)
    ).toEqual(forecasts)
  })

  it('aceita backups antigos sem a seção de módulos', () => {
    expect(validateBackupModules(undefined)).toBeNull()
  })

  it('rejeita módulos desconhecidos', () => {
    expect(() =>
      validateBackupModules({ 'chave-estranha': [] })
    ).toThrow(/desconhecido/)
  })

  it('rejeita orçamentos inválidos', () => {
    expect(() =>
      validateBackupModules({
        'personal-finance-budgets-v1': [{ id: 'x', limitCents: -5 }],
      })
    ).toThrow(/Orçamentos/)
  })

  it('não altera nenhum dado quando os módulos são inválidos', async () => {
    memory.set('personal-finance-goals', JSON.stringify(goals))

    await expect(
      importBackup(
        v5File({
          modules: {
            'personal-finance-goals': [{ id: 'quebrada' }],
          },
        })
      )
    ).rejects.toThrow(/Metas/)

    expect(executeBackupRestore).not.toHaveBeenCalled()
    expect(JSON.parse(memory.get('personal-finance-goals')!)).toEqual(goals)
  })

  it('importa o Backup V5 com módulos e mantém módulos ausentes', async () => {
    memory.set('personal-finance-goals', JSON.stringify(goals))

    await importBackup(
      v5File({
        modules: {
          'personal-finance-budgets-v1': budgets,
        },
      })
    )

    expect(executeBackupRestore).toHaveBeenCalledOnce()
    expect(
      JSON.parse(memory.get('personal-finance-budgets-v1')!)
    ).toEqual(budgets)

    // Metas não estavam no arquivo: continuam como estavam.
    expect(JSON.parse(memory.get('personal-finance-goals')!)).toEqual(goals)
  })
})
