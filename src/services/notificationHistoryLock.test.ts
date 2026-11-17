
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  withNotificationHistoryLock,
} from './notificationHistoryLock'

describe('Bloqueio do histórico de notificações', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('executa operação com bloqueio disponível', async () => {
    const request = vi.fn(
      async (
        _name: string,
        _options: unknown,
        callback: () => Promise<string>
      ) => callback()
    )

    vi.stubGlobal('navigator', {
      locks: { request },
    })

    const result = await withNotificationHistoryLock(
      () => 'operacao-concluida'
    )

    expect(result).toEqual({
      success: true,
      value: 'operacao-concluida',
    })

    expect(request).toHaveBeenCalledWith(
      'personal-finance-notification-history-v1-lock',
      { mode: 'exclusive' },
      expect.any(Function)
    )
  })

  it('rejeita operação sem API de bloqueio', async () => {
    vi.stubGlobal('navigator', {})

    const operation = vi.fn(() => 'nao-executar')

    const result = await withNotificationHistoryLock(
      operation
    )

    expect(result.success).toBe(false)
    expect(operation).not.toHaveBeenCalled()
  })

  it('trata erro durante operação protegida', async () => {
    vi.stubGlobal('navigator', {
      locks: {
        request: async (
          _name: string,
          _options: unknown,
          callback: () => Promise<unknown>
        ) => callback(),
      },
    })

    const result = await withNotificationHistoryLock(
      () => {
        throw new Error('Falha simulada')
      }
    )

    expect(result).toEqual({
      success: false,
      error: 'Falha simulada',
    })
  })

  it('executa operações concorrentes em sequência', async () => {
    const executionOrder: string[] = []

    let queue: Promise<unknown> = Promise.resolve()

    const request = vi.fn(
      (
        _name: string,
        _options: unknown,
        callback: () => Promise<unknown>
      ) => {
        const execution = queue.then(callback)

        queue = execution.then(
          () => undefined,
          () => undefined
        )

        return execution
      }
    )

    vi.stubGlobal('navigator', {
      locks: { request },
    })

    const first = withNotificationHistoryLock(
      async () => {
        executionOrder.push('inicio-1')
        await Promise.resolve()
        executionOrder.push('fim-1')
        return 1
      }
    )

    const second = withNotificationHistoryLock(
      async () => {
        executionOrder.push('inicio-2')
        executionOrder.push('fim-2')
        return 2
      }
    )

    const results = await Promise.all([
      first,
      second,
    ])

    expect(results).toEqual([
      { success: true, value: 1 },
      { success: true, value: 2 },
    ])

    expect(executionOrder).toEqual([
      'inicio-1',
      'fim-1',
      'inicio-2',
      'fim-2',
    ])
  })
})
