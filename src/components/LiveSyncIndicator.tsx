import { useEffect, useState } from 'react'
import { Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react'

import { liveLink, type LiveState, type PeerState } from '../services/sync/liveLink'

export function useLiveLink(): LiveState {
  const [state, setState] = useState(() => liveLink.getState())
  useEffect(() => liveLink.subscribe(setState), [])
  return state
}

export function PeerIcon({ name, size = 18 }: { name: string; size?: number }) {
  if (/computador/i.test(name)) return <Monitor size={size} />
  if (/tablet/i.test(name)) return <Tablet size={size} />
  return <Smartphone size={size} />
}

export function isPeerOnline(peer: PeerState): boolean {
  return peer.status === 'connected' || peer.status === 'syncing'
}

type Props = {
  onOpenSync: () => void
  onMessage: (type: 'success' | 'error', message: string) => void
}

/**
 * No topo da tela: um ícone para cada aparelho pareado (verde =
 * conectado) e, quando há alterações, o botão "Sincronizar".
 */
export default function LiveSyncIndicator({ onOpenSync, onMessage }: Props) {
  const state = useLiveLink()
  const peers = state.peers.filter(peer => peer.status !== 'waiting-scan')

  if (peers.length === 0) return null

  const online = peers.filter(isPeerOnline)
  const label =
    online.length === 0
      ? 'Nenhum aparelho conectado agora'
      : online.length === 1
        ? `${online[0].peerName} conectado`
        : `${online.length} aparelhos conectados`
  const title = peers.map(peer => `${peer.peerName}: ${isPeerOnline(peer) ? 'conectado' : 'desconectado'}`).join(' · ')

  async function sync() {
    try {
      const summary = await liveLink.syncNow()
      onMessage('success', summary.length > 0 ? `Sincronizado! ${summary.join(' · ')}` : 'Tudo sincronizado!')
    } catch (error) {
      onMessage('error', error instanceof Error ? error.message : 'Não foi possível sincronizar.')
    }
  }

  return (
    <div className="pf-live">
      {online.length > 0 && (state.pending || state.syncing) && (
        <button
          type="button"
          className={`pf-live-sync ${state.syncing ? 'is-busy' : ''}`}
          onClick={() => void sync()}
          disabled={state.syncing}
          title="Enviar e receber as alterações"
        >
          <RefreshCw size={16} />
          <span>{state.syncing ? 'Sincronizando' : 'Sincronizar'}</span>
        </button>
      )}

      <button
        type="button"
        className={`pf-live-device ${online.length > 0 ? 'is-on' : 'is-off'}`}
        onClick={onOpenSync}
        title={title}
        aria-label={label}
      >
        <span className="pf-live-icons">
          {peers.map(peer => (
            <span key={peer.topic} className={`pf-live-icon ${isPeerOnline(peer) ? 'is-on' : 'is-off'}`}>
              <PeerIcon name={peer.peerName} size={17} />
            </span>
          ))}
        </span>
        <span className="pf-live-dot" aria-hidden="true" />
        <span className="pf-live-label">
          {online.length === 0 ? 'Desconectado' : peers.length > 1 ? `${online.length}/${peers.length} conectados` : 'Conectado'}
        </span>
      </button>
    </div>
  )
}
