

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest'


import {
  readNotificationHistory,
  saveNotificationHistory,
  saveNotificationHistorySafely,
} from './notificationHistoryStorage'

import {
  NOTIFICATION_HISTORY_STORAGE_KEY,
  NOTIFICATION_HISTORY_VERSION,
  NOTIFICATION_HISTORY_MAX_ENTRIES,
} from './notificationHistoryConfig'

import type {
  NotificationHistoryEntry,
} from './notificationHistoryTypes'

describe('Segurança do histórico de notificações', () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()

afterEach(() => {
  vi.unstubAllGlobals()
})

    vi.stubGlobal('localStorage', {
      getItem: (key: string) =>
        memory.get(key) ?? null,

      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },

      removeItem: (key: string) => {
        memory.delete(key)
      },
    })
  })
  
function createValidHistoryEntry(): NotificationHistoryEntry {
    return {
      id: 'aviso-valido',
      notification: {
        id: 'aviso-valido',
        type: 'card-invoice',
        title: 'Fatura próxima do vencimento',
        message: 'Existe uma fatura pendente.',
        priority: 'warning',
        createdAt: '2026-11-15T10:00:00.000Z',
        read: false,
      },
      status: 'active',
      firstSeenAt: '2026-11-15T10:00:00.000Z',
      lastSeenAt: '2026-11-15T10:00:00.000Z',
    }
  }

  function expectInvalidHistory(entries: unknown[]) {
    const original = JSON.stringify({
      version: NOTIFICATION_HISTORY_VERSION,
      entries,
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = readNotificationHistory()

    expect(result.success).toBe(false)

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  }

  it('retorna histórico vazio quando não existe', () => {
    const result = readNotificationHistory()

    expect(result).toEqual({
      success: true,
      data: {
        version: NOTIFICATION_HISTORY_VERSION,
        entries: [],
      },
    })

    expect(memory.size).toBe(0)
  })

  it('aceita um histórico vazio válido', () => {
    const original = JSON.stringify({
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [],
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = readNotificationHistory()

    expect(result.success).toBe(true)
    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })

  it('rejeita JSON corrompido sem sobrescrever', () => {
    const original = '{json-invalido'

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = readNotificationHistory()

    expect(result.success).toBe(false)

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })

  it('rejeita versão incompatível', () => {
    const original = JSON.stringify({
      version: 999,
      entries: [],
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = readNotificationHistory()

    expect(result.success).toBe(false)

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })

  it('rejeita histórico acima do limite', () => {
    const original = JSON.stringify({
      version: NOTIFICATION_HISTORY_VERSION,
      entries: Array.from({
        length: NOTIFICATION_HISTORY_MAX_ENTRIES + 1,
      }, () => null),
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = readNotificationHistory()

    expect(result.success).toBe(false)

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })

  it('rejeita identificadores duplicados', () => {
    const entry = {
      id: 'aviso-1',
      notification: {
      id: 'aviso-1',
      type: 'card-invoice',
      title: 'Aviso de teste',
      message: 'Mensagem de teste',
      priority: 'warning',
      createdAt: '2026-11-15T12:00:00.000Z',
      read: false,
     },
      status: 'active',
      firstSeenAt: '2026-11-15T12:00:00.000Z',
      lastSeenAt: '2026-11-15T12:00:00.000Z',
    }

    const original = JSON.stringify({
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry, { ...entry }],
    })

    memory.set(
      NOTIFICATION_HISTORY_STORAGE_KEY,
      original
    )

    const result = readNotificationHistory()

    expect(result.success).toBe(false)

    expect(
      memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
    ).toBe(original)
  })
  
it('rejeita notificações sem campos obrigatórios', () => {
  const entry = createValidHistoryEntry()

  const invalidEntry = {
    ...entry,
    notification: {
      id: entry.id,
      title: 'Aviso incompleto',
      message: 'Faltam campos obrigatórios',
    },
  }

  expectInvalidHistory([invalidEntry])
})

it('rejeita prioridades desconhecidas', () => {
  const entry = createValidHistoryEntry()

  expectInvalidHistory([
    {
      ...entry,
      notification: {
        ...entry.notification,
        priority: 'critical',
      },
    },
  ])
})

it('rejeita tipos de notificação desconhecidos', () => {
  const entry = createValidHistoryEntry()

  expectInvalidHistory([
    {
      ...entry,
      notification: {
        ...entry.notification,
        type: 'unknown',
      },
    },
  ])
})

it('rejeita datas cronologicamente inconsistentes', () => {
  const entry = createValidHistoryEntry()

  expectInvalidHistory([
    {
      ...entry,
      firstSeenAt: '2026-11-16T12:00:00.000Z',
      lastSeenAt: '2026-11-15T12:00:00.000Z',
    },
  ])
})

it('rejeita notificações resolvidas sem data de resolução', () => {
  const entry = createValidHistoryEntry()

  expectInvalidHistory([
    {
      ...entry,
      status: 'resolved',
    },
  ])
  
})

it('salva um histórico válido', () => {
  const entry = createValidHistoryEntry()

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    },
    null
  )

  expect(result.success).toBe(true)

  const stored = readNotificationHistory()

  expect(stored.success).toBe(true)

  if (stored.success) {
    expect(stored.data.entries).toHaveLength(1)
    expect(stored.data.entries[0].id).toBe(entry.id)
  }
})

it('bloqueia gravação sobre histórico corrompido', () => {
  const corrupted = '{historico-corrompido'

  memory.set(
    NOTIFICATION_HISTORY_STORAGE_KEY,
    corrupted
  )

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [createValidHistoryEntry()],
    },
    corrupted
  )

  expect(result.success).toBe(false)

  expect(
    memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(corrupted)
})

it('rejeita gravação com identificadores duplicados', () => {
  const entry = createValidHistoryEntry()

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry, { ...entry }],
    },
    null
  )

  expect(result.success).toBe(false)
  expect(memory.has(NOTIFICATION_HISTORY_STORAGE_KEY)).toBe(false)
})

it('bloqueia gravação quando o histórico mudou', () => {
  const existing = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [],
  })

  memory.set(
    NOTIFICATION_HISTORY_STORAGE_KEY,
    existing
  )

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [createValidHistoryEntry()],
    },
    null
  )

  expect(result.success).toBe(false)

  expect(
    memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(existing)
})

it('preserva o histórico quando a gravação falha', () => {
  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [],
  })

  memory.set(
    NOTIFICATION_HISTORY_STORAGE_KEY,
    original
  )

  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      memory.get(key) ?? null,

    setItem: () => {
      throw new Error('Armazenamento indisponível')
    },
  })

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [createValidHistoryEntry()],
    },
    original
  )

  expect(result.success).toBe(false)

  expect(
    memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(original)
})

it('impede a exclusão de registros existentes', () => {
  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [],
    },
    original
  )

  expect(result.success).toBe(false)
  expect(memory.get(NOTIFICATION_HISTORY_STORAGE_KEY))
    .toBe(original)
})

it('preserva a data da primeira ocorrência', () => {
  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [{
        ...entry,
        firstSeenAt: '2026-11-14T10:00:00.000Z',
      }],
    },
    original
  )

  expect(result.success).toBe(false)
  expect(memory.get(NOTIFICATION_HISTORY_STORAGE_KEY))
    .toBe(original)
})

it('impede que a última ocorrência retroceda', () => {
  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [{
        ...entry,
        lastSeenAt: '2026-11-14T10:00:00.000Z',
      }],
    },
    original
  )

  expect(result.success).toBe(false)
  expect(memory.get(NOTIFICATION_HISTORY_STORAGE_KEY))
    .toBe(original)
})

it('impede reativar uma notificação resolvida', () => {
  const entry = createValidHistoryEntry()

  const resolved = {
    ...entry,
    status: 'resolved' as const,
    resolvedAt: '2026-11-15T11:00:00.000Z',
  }

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [resolved],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    },
    original
  )

  expect(result.success).toBe(false)
  expect(memory.get(NOTIFICATION_HISTORY_STORAGE_KEY))
    .toBe(original)
})

it('impede alterar a data de resolução', () => {
  const entry = createValidHistoryEntry()

  const resolved = {
    ...entry,
    status: 'resolved' as const,
    resolvedAt: '2026-11-15T11:00:00.000Z',
  }

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [resolved],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [{
        ...resolved,
        resolvedAt: '2026-11-15T12:00:00.000Z',
      }],
    },
    original
  )

  expect(result.success).toBe(false)
  expect(memory.get(NOTIFICATION_HISTORY_STORAGE_KEY))
    .toBe(original)
})

it('adiciona nova notificação preservando as anteriores', () => {
  const existing = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [existing],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const newEntry = {
    ...createValidHistoryEntry(),
    id: 'aviso-novo',
    notification: {
      ...createValidHistoryEntry().notification,
      id: 'aviso-novo',
    },
  }

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [existing, newEntry],
    },
    original
  )

  expect(result.success).toBe(true)

  const stored = readNotificationHistory()

  expect(stored.success).toBe(true)

  if (stored.success) {
    expect(stored.data.entries).toHaveLength(2)
    expect(stored.data.entries[0]).toEqual(existing)
    expect(stored.data.entries[1]).toEqual(newEntry)
  }
})

it('permite atualizar a última ocorrência', () => {
  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const updated = {
    ...entry,
    lastSeenAt: '2026-11-15T12:00:00.000Z',
  }

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [updated],
    },
    original
  )

  expect(result.success).toBe(true)

  const stored = readNotificationHistory()

  expect(stored.success).toBe(true)

  if (stored.success) {
    expect(stored.data.entries[0].firstSeenAt)
      .toBe(entry.firstSeenAt)

    expect(stored.data.entries[0].lastSeenAt)
      .toBe(updated.lastSeenAt)
  }
})

it('permite resolver uma notificação ativa', () => {
  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const resolved = {
    ...entry,
    status: 'resolved' as const,
    resolvedAt: '2026-11-15T12:00:00.000Z',
  }

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [resolved],
    },
    original
  )

  expect(result.success).toBe(true)

  const stored = readNotificationHistory()

  expect(stored.success).toBe(true)

  if (stored.success) {
    expect(stored.data.entries[0].status)
      .toBe('resolved')

    expect(stored.data.entries[0].resolvedAt)
      .toBe(resolved.resolvedAt)
  }
})

it('salva o histórico utilizando bloqueio exclusivo', async () => {
  const request = vi.fn(
    async (
      _name: string,
      _options: unknown,
      callback: () => unknown
    ) => callback()
  )

  vi.stubGlobal('navigator', {
    locks: { request },
  })

  const entry = createValidHistoryEntry()

  const result = await saveNotificationHistorySafely(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    },
    null
  )

  expect(result.success).toBe(true)

  expect(request).toHaveBeenCalledWith(
    'personal-finance-notification-history-v1-lock',
    { mode: 'exclusive' },
    expect.any(Function)
  )

  const stored = readNotificationHistory()

  expect(stored.success).toBe(true)

  if (stored.success) {
    expect(stored.data.entries).toEqual([entry])
  }
})

it('não grava quando a API de bloqueio está indisponível', async () => {
  vi.stubGlobal('navigator', {})

  const result = await saveNotificationHistorySafely(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [createValidHistoryEntry()],
    },
    null
  )

  expect(result.success).toBe(false)

  expect(
    memory.has(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(false)
})

it('rejeita uma versão desatualizada do histórico', async () => {
  vi.stubGlobal('navigator', {
    locks: {
      request: async (
        _name: string,
        _options: unknown,
        callback: () => unknown
      ) => callback(),
    },
  })

  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const result = await saveNotificationHistorySafely(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    },
    null
  )

  expect(result.success).toBe(false)

  expect(
    memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(original)
})

it('preserva os dados quando o armazenamento falha', async () => {
  vi.stubGlobal('navigator', {
    locks: {
      request: async (
        _name: string,
        _options: unknown,
        callback: () => unknown
      ) => callback(),
    },
  })

  const entry = createValidHistoryEntry()

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries: [entry],
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: () => {
      throw new Error('Falha simulada de armazenamento')
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
  })

  const result = await saveNotificationHistorySafely(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [entry],
    },
    original
  )

  expect(result.success).toBe(false)

  expect(
    memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(original)
})

it('aceita um histórico com exatamente 500 registros', () => {
  const entries = Array.from(
    { length: NOTIFICATION_HISTORY_MAX_ENTRIES },
    (_, index) => {
      const id = `aviso-${index}`

      return {
        ...createValidHistoryEntry(),
        id,
        notification: {
          ...createValidHistoryEntry().notification,
          id,
        },
      }
    }
  )

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries,
    },
    null
  )

  expect(result.success).toBe(true)

  const stored = readNotificationHistory()

  expect(stored.success).toBe(true)

  if (stored.success) {
    expect(stored.data.entries).toHaveLength(500)
  }
})

it('bloqueia o registro 501 sem alterar os dados', () => {
  const entries = Array.from(
    { length: NOTIFICATION_HISTORY_MAX_ENTRIES },
    (_, index) => {
      const id = `aviso-${index}`

      return {
        ...createValidHistoryEntry(),
        id,
        notification: {
          ...createValidHistoryEntry().notification,
          id,
        },
      }
    }
  )

  const original = JSON.stringify({
    version: NOTIFICATION_HISTORY_VERSION,
    entries,
  })

  memory.set(NOTIFICATION_HISTORY_STORAGE_KEY, original)

  const extraEntry = {
    ...createValidHistoryEntry(),
    id: 'aviso-extra',
    notification: {
      ...createValidHistoryEntry().notification,
      id: 'aviso-extra',
    },
  }

  const result = saveNotificationHistory(
    {
      version: NOTIFICATION_HISTORY_VERSION,
      entries: [...entries, extraEntry],
    },
    original
  )

  expect(result.success).toBe(false)

  expect(
    memory.get(NOTIFICATION_HISTORY_STORAGE_KEY)
  ).toBe(original)
})

})
