/**
 * CONEXÃO CONTÍNUA com um ou VÁRIOS aparelhos pareados.
 *
 * - Pareamento: um aparelho mostra o QR, o outro lê UMA vez. Dá para
 *   parear quantos aparelhos quiser (ex.: celular + dois computadores).
 * - Encontro: pelo serviço de encontro (cifrado), cada par de aparelhos
 *   troca os dados de conexão e abre um canal direto (WebRTC).
 * - Fica conectado enquanto estiverem abertos; se cair, reconecta sozinho.
 * - Quando algo muda, aparece "Sincronizar"; ao tocar, sincroniza com
 *   todos os aparelhos conectados, um de cada vez (o mesmo processo
 *   seguro de sempre), e as telas se atualizam sem recarregar.
 */

import { decodeSignal, encodeSignal } from './signalCodec'
import { localDescriptionSdp, toTextChannel, waitForIceGathering } from './syncPeer'
import { runSyncSession, type TextChannel } from './syncProtocol'
import { applyRemoteSyncPackage, createLocalSyncPackage } from './syncApply'
import { publish, subscribe } from './liveRelay'
import {
  createInvite,
  decryptText,
  encryptText,
  getDeviceId,
  getPairing,
  getPairings,
  importKey,
  markLocalChange,
  parseInvite,
  removePairing,
  savePairing,
  updatePairing,
  type Pairing,
} from './livePairing'

export const LOCAL_CHANGE_EVENT = 'personal-finance-local-change'
export const DATA_SYNCED_EVENT = 'personal-finance-data-synced'
/** Início / fim da sincronização (para a animação de ✓ ou ✗). */
export const LIVE_FEEDBACK_EVENT = 'personal-finance-live-feedback'

export type LiveFeedback = {
  phase: 'start' | 'success' | 'error'
  peerName?: string
  summary?: string[]
  message?: string
}

function feedback(detail: LiveFeedback) {
  window.dispatchEvent(new CustomEvent<LiveFeedback>(LIVE_FEEDBACK_EVENT, { detail }))
}

export type PeerStatus = 'waiting-scan' | 'connecting' | 'connected' | 'syncing'

export type PeerState = {
  topic: string
  peerName: string
  status: PeerStatus
  pending: boolean
  lastSyncAt?: string
  error?: string
}

export type LiveState = {
  /** 'unpaired' quando não há nenhum aparelho pareado */
  status: 'unpaired' | 'paired'
  peers: PeerState[]
  /** há alterações para sincronizar com algum aparelho conectado */
  pending: boolean
  syncing: boolean
  /** QR do convite aberto (esperando outro aparelho ler) */
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

export function deviceName(): string {
  const native = typeof window !== 'undefined' && (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  const wide = typeof window !== 'undefined' && window.innerWidth > 650
  if (native) return wide ? 'Tablet Android' : 'Celular Android'
  return wide ? 'Computador' : 'Navegador do celular'
}

/** Conexão com UM aparelho pareado. */
class PeerLink {
  state: PeerState
  private key: CryptoKey | null = null
  private stopRelay: (() => void) | null = null
  private peer: RTCPeerConnection | null = null
  channel: TextChannel | null = null
  private sessionHandler: ((text: string) => void) | null = null
  private sessionClose: (() => void) | null = null
  private sid = ''
  private lastOfferAt = 0
  private lastHelloAt = 0
  private lastSeen = 0
  private remotePending = false
  private helloTimer: number | undefined
  private pingTimer: number | undefined
  syncing = false

  private pairing: Pairing
  private hub: LiveHub

  constructor(pairing: Pairing, hub: LiveHub, waiting = false) {
    this.pairing = pairing
    this.hub = hub
    this.state = {
      topic: pairing.topic,
      peerName: pairing.peerName,
      status: waiting ? 'waiting-scan' : 'connecting',
      pending: false,
      lastSyncAt: pairing.lastSyncAt,
    }
    this.refreshPending()
  }

  get topic() {
    return this.pairing.topic
  }

  private set(changes: Partial<PeerState>) {
    this.state = { ...this.state, ...changes }
    this.hub.emit()
  }

  refreshPending() {
    const pairing = getPairing(this.pairing.topic) ?? this.pairing
    this.pairing = pairing
    const local = Boolean(pairing.lastLocalChangeAt && (!pairing.lastSyncAt || pairing.lastLocalChangeAt > pairing.lastSyncAt))
    this.state = { ...this.state, pending: local || this.remotePending, lastSyncAt: pairing.lastSyncAt }
    this.hub.emit()
  }

  async start() {
    this.key = await importKey(this.pairing.key)
    this.stopRelay = subscribe(this.pairing.topic, text => void this.onRelay(text), () => void this.sendHello(true))
    window.clearInterval(this.helloTimer)
    this.helloTimer = window.setInterval(() => {
      if (this.state.status === 'connecting' || this.state.status === 'waiting-scan') void this.sendHello(false)
    }, HELLO_EVERY)
  }

  stop() {
    this.stopRelay?.()
    this.stopRelay = null
    this.closePeer()
    window.clearInterval(this.helloTimer)
  }

  wake() {
    if (this.state.status !== 'connected' && this.state.status !== 'syncing') void this.sendHello(true)
  }

  // ---------- serviço de encontro ----------

  async signal(message: Record<string, unknown>) {
    if (!this.key) return
    const text = await encryptText(this.key, JSON.stringify({ ...message, from: this.hub.me, ts: Date.now() }))
    await publish(this.pairing.topic, text)
  }

  private async sendHello(force: boolean) {
    if (!force && Date.now() - this.lastHelloAt < 5_000) return
    this.lastHelloAt = Date.now()
    await this.signal({ type: 'hello', name: deviceName() }).catch(error => this.set({ error: (error as Error).message }))
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

    if (message.from === this.hub.me || Date.now() - message.ts > MAX_AGE) return

    switch (message.type) {
      case 'hello': {
        this.rememberPeer(message.name)
        if (this.state.status === 'connected' || this.state.status === 'syncing') {
          if (Date.now() - this.lastSeen < 4_000) return
          this.closePeer()
          this.set({ status: 'connecting' })
        }
        if (this.hub.me < message.from) await this.makeOffer()
        else await this.sendHello(false)
        return
      }
      case 'offer':
        if (this.hub.me < message.from) return
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
        this.hub.forget(this.pairing.topic)
        return
    }
  }

  private rememberPeer(name: string) {
    if (name && this.pairing.peerName !== name) {
      updatePairing(this.pairing.topic, { peerName: name })
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
    await this.signal({ type: 'offer', sid: this.sid, sdp, name: deviceName() }).catch(error => this.set({ error: (error as Error).message }))
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
        this.set({ status: 'connecting' })
        void this.sendHello(true)
      }
    })

    this.set({ status: 'connected', error: undefined })
    this.hub.clearInvite(this.pairing.topic)

    window.clearInterval(this.pingTimer)
    this.pingTimer = window.setInterval(() => {
      if (this.syncing) return
      if (Date.now() - this.lastSeen > DEAD_AFTER) {
        raw.close()
        return
      }
      void channel.send(JSON.stringify({ c: 'ping' })).catch(() => {})
    }, PING_EVERY)

    if (this.state.pending && !this.remotePending) void channel.send(JSON.stringify({ c: 'dirty' })).catch(() => {})

    // Primeira conexão depois de ler o QR: sincroniza sozinho
    if (this.pairing.needsInitialSync && this.pairing.role === 'guest') {
      window.setTimeout(() => void this.hub.syncWith(this).catch(() => {}), 400)
    }
  }

  private onControl(message: Control) {
    switch (message.c) {
      case 'dirty':
        this.remotePending = true
        this.refreshPending()
        return
      case 'sync':
        if (!this.syncing) void this.hub.runSession(this).catch(() => {})
        return
      case 'bye':
        this.hub.forget(this.pairing.topic)
        return
    }
  }

  notifyDirty() {
    if (this.channel) void this.channel.send(JSON.stringify({ c: 'dirty' })).catch(() => {})
  }

  /** Executa uma sessão de sincronização neste canal. */
  async session(): Promise<{ summary: string[]; changed: boolean }> {
    const channel = this.channel
    if (!channel) throw new Error(`${this.pairing.peerName} não está conectado.`)

    this.syncing = true
    this.set({ status: 'syncing', error: undefined })

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
      updatePairing(this.pairing.topic, { lastSyncAt: now, needsInitialSync: false })
      this.pairing = { ...this.pairing, lastSyncAt: now, needsInitialSync: false }
      this.remotePending = false
      return { summary: result.local.summary, changed: result.local.changed }
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

class LiveHub {
  me = ''
  private links = new Map<string, PeerLink>()
  private listeners = new Set<(state: LiveState) => void>()
  private state: LiveState = { status: 'unpaired', peers: [], pending: false, syncing: false }
  private inviteTopic: string | null = null
  private inviteCode: string | undefined
  /** link em sessão agora (gravações dele não marcam ele mesmo como pendente) */
  private sessionTopic: string | null = null
  private started = false
  private feedbackDepth = 0

  /** Envolve uma sincronização com a animação (só a de fora conta). */
  private async withFeedback<T extends string[]>(peerName: string | undefined, run: () => Promise<T>): Promise<T> {
    const outer = this.feedbackDepth++ === 0
    if (outer) feedback({ phase: 'start', peerName })
    try {
      const result = await run()
      if (outer) feedback({ phase: 'success', peerName, summary: result })
      return result
    } catch (error) {
      if (outer) feedback({ phase: 'error', peerName, message: error instanceof Error ? error.message : 'A sincronização falhou.' })
      throw error
    } finally {
      this.feedbackDepth--
    }
  }

  getState(): LiveState {
    return this.state
  }

  subscribe(listener: (state: LiveState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  emit() {
    const peers = [...this.links.values()].map(link => link.state)
    this.state = {
      status: peers.length > 0 ? 'paired' : 'unpaired',
      peers,
      pending: peers.some(peer => peer.pending && (peer.status === 'connected' || peer.status === 'syncing')),
      syncing: peers.some(peer => peer.status === 'syncing'),
      inviteCode: this.inviteCode,
    }
    this.listeners.forEach(listener => listener(this.state))
  }

  start() {
    if (this.started || typeof window === 'undefined') return
    this.started = true
    this.me = getDeviceId()

    window.addEventListener(LOCAL_CHANGE_EVENT, () => {
      if (this.links.size === 0) return
      // Alteração local: todos os aparelhos precisam receber (menos o que
      // está sincronizando agora, que já está recebendo)
      markLocalChange(this.sessionTopic ?? undefined)
      for (const link of this.links.values()) {
        if (link.topic === this.sessionTopic) continue
        link.refreshPending()
        link.notifyDirty()
      }
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.links.forEach(link => link.wake())
    })

    for (const pairing of getPairings()) this.addLink(pairing, false)
    this.emit()
  }

  private addLink(pairing: Pairing, waiting: boolean) {
    this.links.get(pairing.topic)?.stop()
    const link = new PeerLink(pairing, this, waiting)
    this.links.set(pairing.topic, link)
    void link.start()
    return link
  }

  /** Mostra um QR para parear MAIS um aparelho. */
  async createInvite(): Promise<string> {
    if (!this.started) this.start()
    if (this.inviteTopic) this.forget(this.inviteTopic)

    const invite = createInvite(deviceName())
    const pairing: Pairing = {
      topic: invite.topic,
      key: invite.key,
      peerName: 'Novo aparelho',
      role: 'host',
      createdAt: new Date().toISOString(),
      needsInitialSync: true,
    }

    savePairing(pairing)
    this.inviteTopic = pairing.topic
    this.inviteCode = invite.code
    this.addLink(pairing, true)
    this.emit()
    return invite.code
  }

  /** O convite foi aceito (o outro aparelho conectou). */
  clearInvite(topic: string) {
    if (this.inviteTopic === topic) {
      this.inviteTopic = null
      this.inviteCode = undefined
      this.emit()
    }
  }

  /** Cancela o QR aberto sem parear. */
  cancelInvite() {
    if (this.inviteTopic) this.forget(this.inviteTopic)
  }

  /** Este aparelho leu o QR de outro. */
  async acceptInvite(code: string): Promise<void> {
    if (!this.started) this.start()
    const invite = parseInvite(code)
    if (this.links.has(invite.topic)) return

    const pairing: Pairing = {
      topic: invite.topic,
      key: invite.key,
      peerName: invite.name,
      role: 'guest',
      createdAt: new Date().toISOString(),
      needsInitialSync: true,
    }

    savePairing(pairing)
    const link = this.addLink(pairing, false)
    this.emit()

    // Se não conectar em 1 minuto, avisa (com a animação de erro)
    window.setTimeout(() => {
      if (this.links.get(pairing.topic) === link && link.state.status === 'connecting' && !link.state.lastSyncAt) {
        feedback({ phase: 'error', peerName: link.state.peerName, message: 'Não foi possível conectar. Confira se o outro aparelho está com o app aberto e com internet.' })
      }
    }, 60_000)
  }

  /** Desconecta UM aparelho (nos dois lados). */
  async unpair(topic: string): Promise<void> {
    const link = this.links.get(topic)
    if (link) {
      if (link.channel) await link.channel.send(JSON.stringify({ c: 'bye' })).catch(() => {})
      await link.signal({ type: 'bye' }).catch(() => {})
    }
    this.forget(topic)
  }

  forget(topic: string) {
    this.links.get(topic)?.stop()
    this.links.delete(topic)
    removePairing(topic)
    if (this.inviteTopic === topic) {
      this.inviteTopic = null
      this.inviteCode = undefined
    }
    this.emit()
  }

  async runSession(link: PeerLink): Promise<string[]> {
    return this.withFeedback(link.state.peerName, async () => {
      this.sessionTopic = link.topic
      try {
        const result = await link.session()
        window.dispatchEvent(new CustomEvent(DATA_SYNCED_EVENT, { detail: result }))
        return result.summary
      } finally {
        this.sessionTopic = null
      }
    })
  }

  async syncWith(link: PeerLink): Promise<string[]> {
    if (!link.channel || link.syncing) return []
    await link.channel.send(JSON.stringify({ c: 'sync' }))
    return this.runSession(link)
  }

  /** Botão "Sincronizar": com todos os aparelhos conectados, um de cada vez. */
  async syncNow(): Promise<string[]> {
    return this.withFeedback(undefined, () => this.syncAll())
  }

  private async syncAll(): Promise<string[]> {
    const connected = [...this.links.values()].filter(link => link.channel && !link.syncing)
    if (connected.length === 0) throw new Error('Nenhum aparelho conectado agora.')

    const summary: string[] = []
    for (const link of connected) {
      const lines = await this.syncWith(link)
      summary.push(...(connected.length > 1 ? lines.map(line => `${link.state.peerName}: ${line}`) : lines))
    }
    return summary
  }
}

export const liveLink = new LiveHub()
