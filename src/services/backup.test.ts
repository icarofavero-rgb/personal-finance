
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { importBackup } from './backup'

import { checkBackupRestoreSafety } from './backupRestoreSafety'
import { executeBackupRestore } from './backupRestoreExecutor'
import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

import type { BackupRestorePlan } from './backupRestorePlan'

vi.mock('./backupRestoreSafety', () => ({
  checkBackupRestoreSafety: vi.fn(),
}))

vi.mock('./backupRestoreExecutor', () => ({
  executeBackupRestore: vi.fn(),
}))

vi.mock('./backupRestoreSafeAudit', () => ({
  safelyAuditBackupRestore: vi.fn(),
}))

function makePlan(): Extract<
  BackupRestorePlan,
  { version: 5 }
> {
  return {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [
        {
          id: 'person-1',
          name: 'Mariana',
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      debts: [
        {
          id: 'debt-1',
          debtorId: 'person-1',
          description: 'Empréstimo',
          amountCents: 50000,
          installments: 5,
          date: '2026-11-08',
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      payments: [],
    },
  }
}

function makeFile(data: unknown): File {
  return new File(
    [JSON.stringify(data)],
    'backup-v5.json',
    { type: 'application/json' }
  )
}

describe('Importação do Backup V5', () => {
  beforeEach(() => {
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

  it('importa um Backup V5 válido pelo executor', async () => {
    const plan = makePlan()

    const result = await importBackup(makeFile(plan))

    expect(result).toEqual(plan.transactions)

    expect(executeBackupRestore).toHaveBeenCalledOnce()

    expect(executeBackupRestore).toHaveBeenCalledWith(plan)
  })

  it('rejeita um arquivo JSON inválido', async () => {
    const file = new File(
      ['conteúdo inválido'],
      'backup.json'
    )

    await expect(importBackup(file)).rejects.toThrow(
      /JSON válido/
    )

    expect(executeBackupRestore).not.toHaveBeenCalled()
  })

  it('rejeita uma estrutura V5 incompleta', async () => {
    const plan = makePlan()

    const incomplete = {
      ...plan,
      debtorsData: undefined,
    }

    await expect(
      importBackup(makeFile(incomplete))
    ).rejects.toThrow()

    expect(executeBackupRestore).not.toHaveBeenCalled()
  })

  it('rejeita um backup reprovado pela auditoria', async () => {
    const plan = makePlan()

    vi.mocked(safelyAuditBackupRestore).mockReturnValue({
      valid: false,
      errors: ['Dados financeiros inválidos.'],
    })

    await expect(
      importBackup(makeFile(plan))
    ).rejects.toThrow(/Dados financeiros inválidos/)

    expect(executeBackupRestore).not.toHaveBeenCalled()
  })

  it('bloqueia importação quando existe pendência de recuperação', async () => {
    vi.mocked(checkBackupRestoreSafety).mockReturnValue({
      safe: false,
      message: 'Existe um snapshot pendente.',
    })

    await expect(
      importBackup(makeFile(makePlan()))
    ).rejects.toThrow(/snapshot pendente/)

    expect(executeBackupRestore).not.toHaveBeenCalled()
  })

  it('não modifica o plano original durante a importação', async () => {
    const plan = makePlan()
    const original = JSON.stringify(plan)

    await importBackup(makeFile(plan))

    expect(JSON.stringify(plan)).toBe(original)
  })
})
