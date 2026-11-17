/**
 * Conexão direta entre dois aparelhos na mesma rede Wi-Fi (WebRTC).
 *
 * Não usa nenhum servidor nem internet: os dados de conexão são trocados
 * pelos QR codes (convite e resposta) e os aparelhos conversam diretamente.
 */

import { decodeSignal, encodeSignal } from './signalCodec'
import type { TextChannel } from './syncProtocol'

const ICE_GATHERING_TIMEOUT_MS = 4_000
/** Depois que os dois códigos foram lidos, a conexão deve abrir em segundos. */
const CONNECTION_TIMEOUT_MS = 30_000
/** Tempo para a pessoa pegar o outro aparelho e ler o QR de resposta. */
const WAITING_FOR_SCAN_TIMEOUT_MS = 5 * 60_000
const BUFFER_HIGH = 1_000_000
const BUFFER_LOW = 256_000

const CONNECTION_FAILED_MESSAGE =
  'Não foi possível conectar os aparelhos. Confira se os dois estão ' +
  'no MESMO Wi-Fi (redes de visitantes costumam bloquear a conexão) ' +
  'e tente novamente.'

export function isPeerConnectionSupported(): boolean {
  return typeof RTCPeerConnection !== 'undefined'
}

function createPeer(): RTCPeerConnection {
  // Sem servidores STUN/TURN: só endereços da rede local.
  return new RTCPeerConnection({ iceServers: [] })
}

function waitForIceGathering(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === 'complete') return Promise.resolve()

  return new Promise(resolve => {
    const timer = setTimeout(done, ICE_GATHERING_TIMEOUT_MS)

    function done() {
      clearTimeout(timer)
      peer.removeEventListener('icegatheringstatechange', check)
      resolve()
    }

    function check() {
      if (peer.iceGatheringState === 'complete') done()
    }

    peer.addEventListener('icegatheringstatechange', check)
  })
}

function localDescriptionSdp(peer: RTCPeerConnection): string {
  const sdp = peer.localDescription?.sdp

  if (!sdp || !sdp.includes('a=candidate:')) {
    throw new Error(
      'Este aparelho não encontrou um endereço de rede. ' +
      'Confira se o Wi-Fi está ligado.'
    )
  }

  return sdp
}

/** Adapta o canal WebRTC para o formato usado pelo protocolo. */
function toTextChannel(peer: RTCPeerConnection, channel: RTCDataChannel): TextChannel {
  channel.bufferedAmountLowThreshold = BUFFER_LOW

  let onMessage: (text: string) => void = () => {}
  let onClose: () => void = () => {}

  channel.onmessage = event => {
    if (typeof event.data === 'string') onMessage(event.data)
  }

  channel.onclose = () => onClose()

  peer.addEventListener('connectionstatechange', () => {
    if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
      onClose()
    }
  })

  return {
    async send(text) {
      if (channel.readyState !== 'open') {
        throw new Error('A conexão com o outro aparelho foi encerrada.')
      }

      // Controle de fluxo: espera o buffer esvaziar antes de enviar mais.
      if (channel.bufferedAmount > BUFFER_HIGH) {
        await new Promise<void>(resolve => {
          channel.addEventListener('bufferedamountlow', () => resolve(), { once: true })
        })
      }

      channel.send(text)
    },
    setMessageHandler(handler) {
      onMessage = handler
    },
    setCloseHandler(handler) {
      onClose = handler
    },
  }
}

function waitForOpen(
  peer: RTCPeerConnection,
  channelPromise: Promise<RTCDataChannel>,
  timeoutMs: number
): Promise<TextChannel> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(CONNECTION_FAILED_MESSAGE)),
      timeoutMs
    )

    peer.addEventListener('connectionstatechange', () => {
      if (peer.connectionState === 'failed') {
        clearTimeout(timer)
        reject(new Error(CONNECTION_FAILED_MESSAGE))
      }
    })

    channelPromise.then(channel => {
      const opened = () => {
        clearTimeout(timer)
        resolve(toTextChannel(peer, channel))
      }

      if (channel.readyState === 'open') opened()
      else channel.addEventListener('open', opened, { once: true })
    }, reject)
  })
}

export type HostConnection = {
  /** Código do convite (vai no QR) */
  offerCode: string
  /** Recebe o código de resposta do outro aparelho e aguarda a conexão abrir */
  acceptAnswer(code: string): Promise<TextChannel>
  close(): void
}

/** Aparelho que INICIA: gera o convite. */
export async function createHostConnection(): Promise<HostConnection> {
  const peer = createPeer()
  const channel = peer.createDataChannel('personal-finance-sync', { ordered: true })

  await peer.setLocalDescription(await peer.createOffer())
  await waitForIceGathering(peer)

  const offerCode = await encodeSignal({ kind: 'o', sdp: localDescriptionSdp(peer) })

  return {
    offerCode,
    async acceptAnswer(code) {
      const signal = await decodeSignal(code)

      if (signal.kind !== 'a') {
        throw new Error(
          'Este é um código de CONVITE. Leia o código de RESPOSTA ' +
          'que apareceu no outro aparelho.'
        )
      }

      // O prazo só começa agora, depois que os dois códigos foram lidos.
      const connected = waitForOpen(peer, Promise.resolve(channel), CONNECTION_TIMEOUT_MS)
      await peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
      return connected
    },
    close: () => peer.close(),
  }
}

export type GuestConnection = {
  /** Código de resposta (vai no QR mostrado de volta) */
  answerCode: string
  connected: Promise<TextChannel>
  close(): void
}

/** Aparelho que RESPONDE: lê o convite e gera a resposta. */
export async function createGuestConnection(offerCode: string): Promise<GuestConnection> {
  const signal = await decodeSignal(offerCode)

  if (signal.kind !== 'o') {
    throw new Error(
      'Este é um código de RESPOSTA. Neste aparelho, leia o código ' +
      'de CONVITE mostrado pelo outro aparelho.'
    )
  }

  const peer = createPeer()

  const channelPromise = new Promise<RTCDataChannel>(resolve => {
    peer.addEventListener('datachannel', event => resolve(event.channel), { once: true })
  })

  // Aguarda a pessoa levar este QR de resposta até o outro aparelho.
  const connected = waitForOpen(peer, channelPromise, WAITING_FOR_SCAN_TIMEOUT_MS)
  // Evita aviso de promessa rejeitada sem tratamento antes de alguém aguardar.
  connected.catch(() => {})

  await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
  await peer.setLocalDescription(await peer.createAnswer())
  await waitForIceGathering(peer)

  const answerCode = await encodeSignal({ kind: 'a', sdp: localDescriptionSdp(peer) })

  return {
    answerCode,
    connected,
    close: () => peer.close(),
  }
}

/**
 * Pede acesso à câmera e libera em seguida.
 *
 * Além de ser necessário para ler os QR codes, o navegador só revela o
 * endereço real do aparelho na rede local depois dessa permissão
 * (antes disso usa um nome "mascarado" que outros aparelhos às vezes
 * não conseguem encontrar). Falhar aqui não impede de continuar.
 */
export async function warmUpCameraPermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch {
    return false
  }
}
