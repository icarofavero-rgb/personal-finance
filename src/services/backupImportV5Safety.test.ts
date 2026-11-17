
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  checkSafety: vi.fn(),
  audit: vi.fn(),
  executeRestore: vi.fn(),
}))

vi.mock('./backupRestoreSafety', () => ({
  checkBackupRestoreSafety: mocks.checkSafety,
}))

vi.mock('./backupRestoreSafeAudit', () => ({
  safelyAuditBackupRestore: mocks.audit,
}))

vi.mock('./backupRestoreExecutor', () => ({
  executeBackupRestore: mocks.executeRestore,
}))

import { importBackup } from './backup'

function createFile(data: unknown): File {
  const content = JSON.stringify(data)

  return {
    text: async () => content,
  } as File
}

const validV5 = {
  version: 5,
  createdAt: '2026-11-15T12:00:00.000Z',
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

describe('Segurança da importação V5', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.checkSafety.mockReturnValue({
      safe: true,
      message: '',
    })

    mocks.audit.mockReturnValue({
      valid: true,
      errors: [],
    })
  })


it('reconhece o V5 e encaminha a restauração ao executor', async () => {
  const result = await importBackup(createFile(validV5))

  expect(result).toEqual(validV5.transactions)

  expect(mocks.audit).toHaveBeenCalledOnce()

  expect(mocks.executeRestore).toHaveBeenCalledOnce()

  expect(mocks.executeRestore).toHaveBeenCalledWith(
    expect.objectContaining({
      version: 5,
      debtorsData: validV5.debtorsData,
    })
  )
})


  it('rejeita o V5 quando a auditoria falha', async () => {
    mocks.audit.mockReturnValue({
      valid: false,
      errors: ['Dados financeiros inválidos.'],
    })

    await expect(
      importBackup(createFile(validV5))
    ).rejects.toThrow('Dados financeiros inválidos.')

    expect(mocks.executeRestore).not.toHaveBeenCalled()
  })

  it('bloqueia o V5 quando existe uma pendência de segurança', async () => {
    mocks.checkSafety.mockReturnValue({
      safe: false,
      message: 'Restauração pendente.',
    })

    await expect(
      importBackup(createFile(validV5))
    ).rejects.toThrow('Restauração pendente.')

    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.executeRestore).not.toHaveBeenCalled()
  })

  it('rejeita um arquivo JSON inválido', async () => {
    const file = {
      text: async () => '{json-invalido'
    } as File

    await expect(
      importBackup(file)
    ).rejects.toThrow('O arquivo não contém um JSON válido.')

    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.executeRestore).not.toHaveBeenCalled()
  })
})
