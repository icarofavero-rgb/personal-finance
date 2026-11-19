import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { publish, relayBusyUntil, RelayBusyError } from './liveRelay'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
})

function mockFetch(status: number, account?: unknown) {
  const fn = vi.fn(async (url: string) => {
    if (String(url).endsWith('/v1/account')) return new Response(JSON.stringify(account ?? {}), { status: 200 })
    return new Response('', { status })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('serviço de encontro: economia de mensagens', () => {
  beforeEach(() => memory.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('envia normalmente e anota o envio', async () => {
    const fetch = mockFetch(200)
    await publish('pf-a', 'oi')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(relayBusyUntil()).toBe(0)
  })

  it('depois de um 429, espera até a cota voltar e não insiste', async () => {
    const resetAt = Math.floor(Date.now() / 1000) + 3600
    const fetch = mockFetch(429, { stats: { messages_remaining: 0, reset_at: resetAt } })

    await expect(publish('pf-a', 'oi')).rejects.toBeInstanceOf(RelayBusyError)
    expect(relayBusyUntil()).toBe(resetAt * 1000)

    // Enquanto espera, nem tenta (não gasta mais nada)
    const calls = fetch.mock.calls.length
    await expect(publish('pf-a', 'oi', { essential: true })).rejects.toBeInstanceOf(RelayBusyError)
    expect(fetch.mock.calls.length).toBe(calls)
  })

  it('sem a informação do serviço, espera 15 minutos', async () => {
    mockFetch(429, {})
    const before = Date.now()
    await expect(publish('pf-a', 'oi')).rejects.toBeInstanceOf(RelayBusyError)
    const wait = relayBusyUntil() - before
    expect(wait).toBeGreaterThanOrEqual(15 * 60_000 - 50)
    expect(wait).toBeLessThan(16 * 60_000)
  })

  it('respeita a cota própria de "oi" por dia, mas deixa passar a conexão em si', async () => {
    memory.set('personal-finance-relay-log-v1', JSON.stringify(Array.from({ length: 120 }, () => Date.now())))
    const fetch = mockFetch(200)

    await expect(publish('pf-a', 'oi')).rejects.toBeInstanceOf(RelayBusyError)
    expect(fetch).not.toHaveBeenCalled()

    await publish('pf-a', 'oferta', { essential: true })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
