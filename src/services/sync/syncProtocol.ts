/**
 * Conversa entre dois aparelhos durante a sincronização.
 *
 * Os dois lados fazem a mesma coisa, ao mesmo tempo:
 *  1. enviam "olá" com a versão do protocolo;
 *  2. enviam o próprio pacote, em pedaços;
 *  3. ao receber o pacote do outro, juntam e gravam;
 *  4. avisam o outro se deu certo ("aplicado").
 * A sessão termina quando os dois lados confirmaram.
 *
 * Como a junção é determinística, os dois terminam com os mesmos dados,
 * não importa quem aplica primeiro.
 */

import type { SyncApplyResult } from './syncApply'

export const PROTOCOL_VERSION = 1
const CHUNK_SIZE = 16_000
const INACTIVITY_TIMEOUT_MS = 60_000

/** Canal de mensagens de texto (o canal WebRTC real, ou um simulado nos testes). */
export type TextChannel = {
  send(text: string): Promise<void>
  setMessageHandler(handler: (text: string) => void): void
  setCloseHandler(handler: () => void): void
}

export type SyncStage =
  | 'connected'
  | 'sending'
  | 'receiving'
  | 'applying'
  | 'waiting-peer'

type Message =
  | { t: 'hello'; v: number }
  | { t: 'begin'; chunks: number }
  | { t: 'chunk'; i: number; d: string }
  | { t: 'end' }
  | { t: 'applied'; ok: true; summary: string[] }
  | { t: 'applied'; ok: false; error: string }

export type SyncSessionDeps = {
  createPackage: () => unknown
  applyPackage: (received: unknown) => SyncApplyResult
  onStage?: (stage: SyncStage) => void
}

export type SyncSessionResult = {
  local: SyncApplyResult
  peerSummary: string[]
}

export function runSyncSession(
  channel: TextChannel,
  deps: SyncSessionDeps
): Promise<SyncSessionResult> {
  return new Promise((resolve, reject) => {
    let finished = false
    let localResult: SyncApplyResult | null = null
    let peerSummary: string[] | null = null

    let expectedChunks = -1
    const chunks: string[] = []
    let received = 0

    let timer: ReturnType<typeof setTimeout> | undefined

    function resetTimer() {
      clearTimeout(timer)
      timer = setTimeout(
        () => fail(new Error('A conexão ficou sem resposta. Tente novamente.')),
        INACTIVITY_TIMEOUT_MS
      )
    }

    function finish() {
      if (finished || !localResult || !peerSummary) return
      finished = true
      clearTimeout(timer)
      resolve({ local: localResult, peerSummary })
    }

    function fail(error: Error) {
      if (finished) return
      finished = true
      clearTimeout(timer)
      reject(error)
    }

    function send(message: Message) {
      return channel.send(JSON.stringify(message))
    }

    function applyReceived(text: string) {
      deps.onStage?.('applying')

      try {
        localResult = deps.applyPackage(JSON.parse(text))
        void send({ t: 'applied', ok: true, summary: localResult.summary })
        deps.onStage?.('waiting-peer')
        finish()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Falha ao aplicar os dados.'
        void send({ t: 'applied', ok: false, error: message })
        fail(new Error(message))
      }
    }

    function handle(text: string) {
      if (finished) return
      resetTimer()

      let message: Message

      try {
        message = JSON.parse(text) as Message
      } catch {
        fail(new Error('O outro aparelho enviou dados ilegíveis.'))
        return
      }

      switch (message.t) {
        case 'hello':
          if (message.v !== PROTOCOL_VERSION) {
            fail(
              new Error(
                'Os aparelhos estão com versões diferentes do app. ' +
                'Atualize os dois e tente novamente.'
              )
            )
          }
          return

        case 'begin':
          deps.onStage?.('receiving')
          expectedChunks = message.chunks
          chunks.length = 0
          received = 0
          return

        case 'chunk':
          if (message.i < 0 || message.i >= expectedChunks || chunks[message.i] !== undefined) {
            fail(new Error('Os dados chegaram fora de ordem.'))
            return
          }
          chunks[message.i] = message.d
          received++
          return

        case 'end':
          if (expectedChunks < 0 || received !== expectedChunks) {
            fail(new Error('Os dados chegaram incompletos. Tente novamente.'))
            return
          }
          applyReceived(chunks.join(''))
          return

        case 'applied':
          if (!message.ok) {
            fail(new Error(`O outro aparelho não conseguiu sincronizar: ${message.error}`))
            return
          }
          peerSummary = message.summary
          finish()
          return

        default:
          fail(new Error('O outro aparelho enviou uma mensagem desconhecida.'))
      }
    }

    channel.setMessageHandler(handle)
    channel.setCloseHandler(() => {
      if (!finished) fail(new Error('A conexão com o outro aparelho foi encerrada.'))
    })

    resetTimer()
    deps.onStage?.('connected')

    void (async () => {
      try {
        await send({ t: 'hello', v: PROTOCOL_VERSION })

        deps.onStage?.('sending')
        const text = JSON.stringify(deps.createPackage())
        const total = Math.max(1, Math.ceil(text.length / CHUNK_SIZE))

        await send({ t: 'begin', chunks: total })
        for (let index = 0; index < total; index++) {
          await send({
            t: 'chunk',
            i: index,
            d: text.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
          })
        }
        await send({ t: 'end' })
      } catch (error) {
        const failure =
          error instanceof Error ? error : new Error('Falha ao enviar os dados.')

        // Avisa o outro lado para ele não ficar esperando.
        void send({ t: 'applied', ok: false, error: failure.message }).catch(() => {})
        fail(failure)
      }
    })()
  })
}
