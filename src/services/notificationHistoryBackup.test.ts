
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  exportNotificationHistory,
} from './notificationHistoryBackup'

import {
  NOTIFICATION_HISTORY_STORAGE_KEY,
  NOTIFICATION_HISTORY_VERSION,
} from './notificationHistoryConfig'

import type {
  NotificationHistoryEntry,
} from './notificationHistoryTypes'

describe('Exportação do histórico de notificações', () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function createValidEntry(): NotificationHistoryEntry {
    return {
      id: 'aviso-teste',
      notification: {
        id: 'aviso-teste',
        type: 'card-invoice',
        title: 'Fatura pendente',
        message: 'Existe uma fatura aguardando pagamento.',
        priority: 'warning',
        createdAt: '2026-11-15T10:00:00.000Z',
        read: false,
      },
      status: 'active',
      firstSeenAt: '2026-11-15T10:00:00.000Z',
      lastSeenAt: '2026-11-15T10:00:00.000Z',
    }
  }

  it('exporta um histórico vazio', () => {
    const result = exportNotificationHistory()

    expect(result).toEqual({
      success: true,
      data: {
        version: NOTIFICATION_HISTORY_VERSION,
        entries: [],
      },
    })

    expect(
      memory.has(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(false)
  })

  it('exporta registros válidos sem alterar o armazenamento', () => {
    const entry = createValidEntry()

    const original = JSON.stringify({
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = exportNotificationHistory()

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.entries).toEqual([entry])
    }

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })

  it('rejeita exportação de histórico corrompido', () => {
    const original = '{json-invalido'

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = exportNotificationHistory()

    expect(result.success).toBe(false)

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })

  it('retorna uma cópia independente dos registros', () => {
    const entry = createValidEntry()

    const original = JSON.stringify({
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const firstExport = exportNotificationHistory()

    expect(firstExport.success).toBe(true)

    if (!firstExport.success) {
      return
    }

    firstExport.data.entries[0].notification.title =
      'Título modificado no teste'

    const secondExport = exportNotificationHistory()

    expect(secondExport.success).toBe(true)

    if (secondExport.success) {
      expect(
        secondExport.data.entries[0].notification.title
      ).toBe('Fatura pendente')
    }

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })
})
