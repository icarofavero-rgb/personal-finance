import { describe, expect, it } from 'vitest'

import { decodeSignal, encodeSignal, SIGNAL_PREFIX } from './signalCodec'
import { runSyncSession, type TextChannel } from './syncProtocol'
import type { SyncApplyResult } from './syncApply'

/** Dois canais ligados um ao outro, como um "cabo" simulado. */
function channelPair(): [TextChannel, TextChannel, () => void] {
  const handlers: Array<(text: string) => void> = [() => {}, () => {}]
  const closers: Array<() => void> = [() => {}, () => {}]

  const make = (self: 0 | 1): TextChannel => ({
    async send(text) {
      const other = self === 0 ? 1 : 0
      queueMicrotask(() => handlers[other](text))
    },
    setMessageHandler(handler) {
      handlers[self] = handler
    },
    setCloseHandler(handler) {
      closers[self] = handler
    },
  })

  return [make(0), make(1), () => closers.forEach(close => close())]
}

const ok = (summary: string[] = []): SyncApplyResult => ({
  changed: summary.length > 0,
  stats: {},
  summary,
})

describe('código do QR', () => {
  const sdp = [
    'v=0',
    'o=- 123 2 IN IP4 127.0.0.1',
    's=-',
    'a=candidate:1 1 udp 2122260223 192.168.0.10 54321 typ host',
    'a=candidate:2 1 tcp 1518280447 192.168.0.10 9 typ host tcptype active',
    'a=fingerprint:sha-256 AA:BB:CC',
  ].join('\r\n')

  it('codifica e decodifica o convite', async () => {
    const code = await encodeSignal({ kind: 'o', sdp })

    expect(code.startsWith(SIGNAL_PREFIX)).toBe(true)

    const decoded = await decodeSignal(code)
    expect(decoded.kind).toBe('o')
    expect(decoded.sdp).toContain('192.168.0.10 54321')
    // candidatos TCP são descartados para encurtar o código
    expect(decoded.sdp).not.toContain(' tcp ')
  })

  it('rejeita QR codes de outros apps', async () => {
    await expect(decodeSignal('https://exemplo.com')).rejects.toThrow(/Personal Finance/)
    await expect(decodeSignal('PF1:lixo!!')).rejects.toThrow(/Personal Finance/)
  })
})

describe('protocolo de sincronização', () => {
  it('troca os pacotes e termina quando os dois aplicaram', async () => {
    const [a, b] = channelPair()
    const receivedByA: unknown[] = []
    const receivedByB: unknown[] = []

    // Pacote grande para forçar o envio em vários pedaços.
    const bigPackage = { data: 'x'.repeat(100_000) }

    const [resultA, resultB] = await Promise.all([
      runSyncSession(a, {
        createPackage: () => ({ from: 'A' }),
        applyPackage: pkg => {
          receivedByA.push(pkg)
          return ok(['transações: 1 novo(s)'])
        },
      }),
      runSyncSession(b, {
        createPackage: () => bigPackage,
        applyPackage: pkg => {
          receivedByB.push(pkg)
          return ok(['metas: 2 novo(s)'])
        },
      }),
    ])

    expect(receivedByA).toEqual([bigPackage])
    expect(receivedByB).toEqual([{ from: 'A' }])
    expect(resultA.local.summary).toEqual(['transações: 1 novo(s)'])
    expect(resultA.peerSummary).toEqual(['metas: 2 novo(s)'])
    expect(resultB.peerSummary).toEqual(['transações: 1 novo(s)'])
  })

  it('se um lado falhar ao aplicar, os dois recebem o erro', async () => {
    const [a, b] = channelPair()

    const results = await Promise.allSettled([
      runSyncSession(a, {
        createPackage: () => ({}),
        applyPackage: () => {
          throw new Error('dados inconsistentes')
        },
      }),
      runSyncSession(b, {
        createPackage: () => ({}),
        applyPackage: () => ok(),
      }),
    ])

    expect(results[0].status).toBe('rejected')
    expect(results[1].status).toBe('rejected')
    expect(String((results[1] as PromiseRejectedResult).reason)).toMatch(
      /outro aparelho não conseguiu sincronizar: dados inconsistentes/
    )
  })

  it('se um lado não conseguir montar o pacote, o outro é avisado', async () => {
    const [a, b] = channelPair()

    const results = await Promise.allSettled([
      runSyncSession(a, {
        createPackage: () => {
          throw new Error('restauração pendente')
        },
        applyPackage: () => ok(),
      }),
      runSyncSession(b, {
        createPackage: () => ({}),
        applyPackage: () => ok(),
      }),
    ])

    expect(results[0].status).toBe('rejected')
    expect(String((results[1] as PromiseRejectedResult).reason)).toMatch(
      /restauração pendente/
    )
  })

  it('a queda da conexão encerra a sessão com erro', async () => {
    const [a, , close] = channelPair()

    const session = runSyncSession(a, {
      createPackage: () => ({}),
      applyPackage: () => ok(),
    })

    close()

    await expect(session).rejects.toThrow(/encerrada/)
  })
})
