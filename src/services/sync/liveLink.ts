/**
 * CONEXÃO CONTÍNUA entre dois aparelhos pareados.
 *
 * - Pareamento: um aparelho mostra o QR, o outro lê UMA vez.
 * - Encontro: pelo serviço de encontro (cifrado), os aparelhos trocam os
 *   dados de conexão e abrem um canal direto (WebRTC) pelo Wi-Fi.
 * - Fica conectado enquanto os dois estiverem abertos; se cair, reconecta
 *   sozinho.
 * - Quando algo muda em um aparelho, aparece "Sincronizar" nos dois; ao
 *   tocar, os dois trocam e juntam os dados (o mesmo processo seguro de
 *   sempre) e as telas se atualizam sem precisar recarregar.
 */

import { decodeSignal, encodeSignal } from './signalCodec'
import { localDescriptionSdp, toTextChannel, waitForIceGathering } from './syncPeer'
import { runSyncSession, type TextChannel } from './syncProtocol'
import { applyRemoteSyncPackage, createLocalSyncPackage } from './syncApply'
import { publish, subscribe } from './liveRelay'
import {
  clearPairing,
  createInvite,
  decryptText,
  encryptText,
  getDeviceId,
  getPairing,
  importKey,
  parseInvite,
  savePairing,
  updatePairing,
  type Pairing,
} from './livePairing'

export const LOCAL_CHANGE_EVENT = 'personal-finance-local-change'
export const DATA_SYNCED_EVENT = 'personal-finance-data-synced'

export type LiveStatus = 'unpaired' | 'waiting-scan' | 'connecting' | 'connected' | 'syncing'

export type LiveState = {
  status: LiveStatus
  peerName: string
  /** há alterações para sincronizar (neste aparelho ou no outro) */
  pending: boolean
  lastSyncAt?: string
  lastSummary?: string[]
  error?: string
  /** QR code do convite (enquanto espera o outro aparelho ler) */
  inviteCode?: string
}

type Signal =
  | { from: string; type: 'hello'; name: string; ts: number }
  | { from: string; type: 'offer'; sid: string; sdp: string; name: string; ts: number }
  | { from: string; type: 'answer'; sid: string; sdp: string; ts: number }
  | { from: string; type: 'bye'; ts: number }

type Control = { c: 'ping' } | { c: 'dirty' } | { c: 'sync' } | { c: 'bye' }

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
const HELLO_EVERY = 15_000
const PING_EVERY = 8_000
const DEAD_AFTER = 26_000
const MAX_AGE = 120_000

function deviceName(): string {
  const native = typeof window !== 'undefined' && (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  const wide = typeof window !== 'undefined' && window.innerWidth > 650
  if (native) return wide ? 'Tablet Android' : 'Celular Android'
  return wide ? 'Computador' : 'Navegador do celular'
}

class LiveLink {
  private state: LiveState = { status: 'unpaired', peerName: '', pending: false }
  private listeners = new Set<(state: LiveState) => void>()
  private pairing: Pairing | null = null
  private key: CryptoKey | null = null
  private me = ''
  private stopRelay: (() => void) | null = null
  private peer: RTCPeerConnection | null = null
  private channel: TextChannel | null = null
  private sessionHandler: ((text: string) => void) | null = null
  private sessionClose: (() => void) | null = null
  private sid = ''
  private lastOfferAt = 0
  private lastHelloAt = 0
  private lastSeen = 0
  private remotePending = false
  private helloTimer: number | undefined
  private pingTimer: number | undefined
  private syncing = false
  private started = false

  // ---------- estado para a tela ----------

  getState(): LiveState {
    return this.state
  }

  subscribe(listener: (state: LiveState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private set(changes: Partial<LiveState>) {
    this.state = { ...this.state, ...changes }
    this.listeners.forEach(listener => listener(this.state))
  }

  private refreshPending() {
    const pairing = getPairing()
    const local = Boolean(pairing?.lastLocalChangeAt && (!pairing.lastSyncAt || pairing.lastLocalChangeAt > pairing.lastSyncAt))
    this.set({ pending: local || this.remotePending, lastSyncAt: pairing?.lastSyncAt })
  }

  // ---------- início ----------

  /** Chamado ao abrir o app: se já houver pareamento, conecta sozinho. */
  start() {
    if (this.started || typeof window === 'undefined') return
    this.started = true
    this.me = getDeviceId()

    window.addEventListener(LOCAL_CHANGE_EVENT, () => this.onLocalChange())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.pairing && this.state.status !== 'connected' && this.state.status !== 'syncing') {
        void this.sendHello(true)
      }
    })

    const pairing = getPairing()
    if (pairing) void this.connect(pairing)
  }

  private async connect(pairing: Pairing) {
    this.pairing = pairing
    this.key = await importKey(pairing.key)
    this.set({ status: 'connecting', peerName: pairing.peerName, error: undefined, inviteCode: undefined })
    this.refreshPending()

    this.stopRelay?.()
    this.stopRelay = subscribe(pairing.topic, text => void this.onRelay(text), () => void this.sendHello(true))
    this.scheduleHello()
  }

  // ---------- pareamento ----------

  /** Este aparelho mostra o QR code e espera o outro ler. */
  async createInvite(): Promise<string> {
    if (!this.started) this.start()
    this.disconnect()

    const invite = createInvite(deviceName())
    const pairing: Pairing = {
      topic: invite.topic,
      key: invite.key,
      peerName: 'Outro aparelho',
      role: 'host',
      createdAt: new Date().toISOString(),
      needsInitialSync: true,
    }

    savePairing(pairing)
    await this.connect(pairing)
    this.set({ status: 'waiting-scan', inviteCode: invite.code })
    return invite.code
  }

  /** Este aparelho leu o QR code do outro. */
  async acceptInvite(code: string): Promise<void> {
    if (!this.started) this.start()
    const invite = parseInvite(code)
    this.disconnect()

    const pairing: Pairing = {
      topic: invite.topic,
      key: invite.key,
      peerName: invite.name,
      role: 'guest',
      createdAt: new Date().toISOString(),
      needsInitialSync: true,
    }

    savePairing(pairing)
    await this.connect(pairing)
  }

  /** Desfaz o pareamento nos dois aparelhos. */
  async unpair(): Promise<void> {
    if (this.channel) await this.channel.send(JSON.stringify({ c: 'bye' })).catch(() => {})
    await this.signal({ type: 'bye' }).catch(() => {})
    this.forget()
  }

  private forget() {
    this.disconnect()
    clearPairing()
    this.pairing = null
    this.key = null
    this.remotePending = false
    this.set({ status: 'unpaired', peerName: '', pending: false, inviteCode: undefined, lastSyncAt: undefined })
  }

  private disconnect() {
    this.stopRelay?.()
    this.stopRelay = null
    this.closePeer()
    window.clearInterval(this.helloTimer)
    window.clearInterval(this.pingTimer)
  }

  // ---------- serviço de encontro ----------

  private async signal(message: Record<string, unknown>) {
    if (!this.pairing || !this.key) return
    const text = await encryptText(this.key, JSON.stringify({ ...message, from: this.me, ts: Date.now() }))
    await publish(this.pairing.topic, text)
  }

  private scheduleHello() {
    window.clearInterval(this.helloTimer)
    this.helloTimer = window.setInterval(() => {
      if (this.state.status === 'connecting' || this.state.status === 'waiting-scan') void this.sendHello(false)
    }, HELLO_EVERY)
  }

  private async sendHello(force: boolean) {
    if (!force && Date.now() - this.lastHelloAt < 5_000) return
    this.lastHelloAt = Date.now()
    await this.signal({ type: 'hello', name: deviceName() }).catch(error => this.set({ error: (error as Error).message }))
  }

  private isOfferer(peerId: string) {
    return this.me < peerId
  }

  private async onRelay(text: string) {
    if (!this.key) return
    const plain = await decryptText(this.key, text)
    if (!plain) return

    let message: Signal
    try {
      message = JSON.parse(plain) as Signal
    } catch {
      return
    }

    if (message.from === this.me || Date.now() - message.ts > MAX_AGE) return

    switch (message.type) {
      case 'hello': {
        this.rememberPeer(message.name)
        // O outro aparelho (re)começou: a conexão antiga não vale mais
        if (this.state.status === 'connected' || this.state.status === 'syncing') {
          if (Date.now() - this.lastSeen < 4_000) return
          this.closePeer()
          this.set({ status: 'connecting' })
        }
        if (this.isOfferer(message.from)) await this.makeOffer()
        else await this.sendHello(false)
        return
      }
      case 'offer':
        if (this.isOfferer(message.from)) return
        this.rememberPeer(message.name)
        await this.answer(message.sid, message.sdp)
        return
      case 'answer':
        if (message.sid === this.sid && this.peer && !this.peer.remoteDescription) {
          const signal = await decodeSignal(message.sdp)
          await this.peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp }).catch(() => {})
        }
        return
      case 'bye':
        this.forget()
        return
    }
  }

  private rememberPeer(name: string) {
    if (name && this.pairing && this.pairing.peerName !== name) {
      updatePairing({ peerName: name })
      this.pairing = { ...this.pairing, peerName: name }
      this.set({ peerName: name })
    }
  }

  // ---------- conexão direta (WebRTC) ----------

  private closePeer() {
    window.clearInterval(this.pingTimer)
    this.channel = null
    this.sessionHandler = null
    this.peer?.close()
    this.peer = null
  }

  private async makeOffer() {
    if (Date.now() - this.lastOfferAt < 8_000) return
    this.lastOfferAt = Date.now()
    this.closePeer()

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peer = peer
    this.sid = Math.random().toString(36).slice(2)
    const channel = peer.createDataChannel('pf-live', { ordered: true })
    channel.addEventListener('open', () => this.onOpen(peer, channel), { once: true })

    await peer.setLocalDescription(await peer.createOffer())
    await waitForIceGathering(peer)
    if (this.peer !== peer) return

    const sdp = await encodeSignal({ kind: 'o', sdp: localDescriptionSdp(peer) })
    await this.signal({ type: 'offer', sid: this.sid, sdp, name: deviceName() }).catch(error =>
      this.set({ error: (error as Error).message })
    )
  }

  private async answer(sid: string, code: string) {
    this.closePeer()
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peer = peer
    this.sid = sid

    peer.addEventListener('datachannel', event => {
      const channel = event.channel
      if (channel.readyState === 'open') this.onOpen(peer, channel)
      else channel.addEventListener('open', () => this.onOpen(peer, channel), { once: true })
    })

    const signal = await decodeSignal(code)
    await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
    await peer.setLocalDescription(await peer.createAnswer())
    await waitForIceGathering(peer)
    if (this.peer !== peer) return

    const sdp = await encodeSignal({ kind: 'a', sdp: localDescriptionSdp(peer) })
    await this.signal({ type: 'answer', sid, sdp }).catch(error => this.set({ error: (error as Error).message }))
  }

  private onOpen(peer: RTCPeerConnection, raw: RTCDataChannel) {
    if (this.peer !== peer) return

    const channel = toTextChannel(peer, raw)
    this.channel = channel
    this.lastSeen = Date.now()

    channel.setMessageHandler(text => {
      this.lastSeen = Date.now()
      if (text.startsWith('{"c":')) this.onControl(JSON.parse(text) as Control)
      else this.sessionHandler?.(text)
    })
    channel.setCloseHandler(() => {
      this.sessionClose?.()
      if (this.peer === peer) {
        this.closePeer()
        if (this.pairing) {
          this.set({ status: 'connecting' })
          void this.sendHello(true)
        }
      }
    })

    this.set({ status: 'connected', error: undefined, inviteCode: undefined })

    // Mantém a conexão viva e percebe quando ela cai
    window.clearInterval(this.pingTimer)
    this.pingTimer = window.setInterval(() => {
      if (this.syncing) return
      if (Date.now() - this.lastSeen > DEAD_AFTER) {
        raw.close()
        return
      }
      void channel.send(JSON.stringify({ c: 'ping' })).catch(() => {})
    }, PING_EVERY)

    // Avisa se este aparelho tem alterações pendentes
    if (this.state.pending && !this.remotePending) void channel.send(JSON.stringify({ c: 'dirty' })).catch(() => {})

    // Primeira conexão depois de ler o QR: sincroniza sozinho
    if (this.pairing?.needsInitialSync && this.pairing.role === 'guest') {
      window.setTimeout(() => void this.syncNow().catch(() => {}), 400)
    }
  }

  private onControl(message: Control) {
    switch (message.c) {
      case 'dirty':
        this.remotePending = true
        this.refreshPending()
        return
      case 'sync':
        if (!this.syncing) void this.runSession().catch(() => {})
        return
      case 'bye':
        this.forget()
        return
    }
  }

  // ---------- sincronização ----------

  private onLocalChange() {
    if (this.syncing || !this.pairing) return
    updatePairing({ lastLocalChangeAt: new Date().toISOString() })
    this.refreshPending()
    if (this.channel) void this.channel.send(JSON.stringify({ c: 'dirty' })).catch(() => {})
  }

  /** Botão "Sincronizar": os dois aparelhos trocam e juntam os dados. */
  async syncNow(): Promise<string[]> {
    if (!this.channel) throw new Error('O outro aparelho não está conectado.')
    if (this.syncing) return []
    await this.channel.send(JSON.stringify({ c: 'sync' }))
    return this.runSession()
  }

  private async runSession(): Promise<string[]> {
    const channel = this.channel
    if (!channel) return []

    this.syncing = true
    this.set({ status: 'syncing', error: undefined })

    // Canal só da sessão (as mensagens de controle continuam separadas)
    const sessionChannel: TextChannel = {
      send: text => channel.send(text),
      setMessageHandler: handler => {
        this.sessionHandler = handler
      },
      setCloseHandler: handler => {
        this.sessionClose = handler
      },
    }

    try {
      const result = await runSyncSession(sessionChannel, {
        createPackage: createLocalSyncPackage,
        applyPackage: applyRemoteSyncPackage,
      })

      const now = new Date().toISOString()
      updatePairing({ lastSyncAt: now, needsInitialSync: false })
      if (this.pairing) this.pairing = { ...this.pairing, lastSyncAt: now, needsInitialSync: false }
      this.remotePending = false
      this.set({ lastSummary: result.local.summary })

      window.dispatchEvent(new CustomEvent(DATA_SYNCED_EVENT, { detail: result.local }))
      return result.local.summary
    } catch (error) {
      this.set({ error: (error as Error).message })
      throw error
    } finally {
      this.syncing = false
      this.sessionHandler = null
      this.sessionClose = null
      this.set({ status: this.channel ? 'connected' : 'connecting' })
      this.refreshPending()
    }
  }
}

export const liveLink = new LiveLink()
