import { useEffect, useState } from 'react'
import { Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react'

import { liveLink, type LiveState } from '../services/sync/liveLink'

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

type Props = {
  onOpenSync: () => void
  onMessage: (type: 'success' | 'error', message: string) => void
}

/**
 * No topo da tela: o aparelho pareado (verde = conectado) e, quando há
 * alterações, o botão "Sincronizar".
 */
export default function LiveSyncIndicator({ onOpenSync, onMessage }: Props) {
  const state = useLiveLink()

  if (state.status === 'unpaired') return null

  const connected = state.status === 'connected' || state.status === 'syncing'
  const label =
    state.status === 'syncing'
      ? 'Sincronizando…'
      : connected
        ? `${state.peerName} conectado`
        : state.status === 'waiting-scan'
          ? 'Aguardando leitura do QR'
          : `Procurando ${state.peerName.toLowerCase()}…`

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
      {connected && (state.pending || state.status === 'syncing') && (
        <button
          type="button"
          className={`pf-live-sync ${state.status === 'syncing' ? 'is-busy' : ''}`}
          onClick={() => void sync()}
          disabled={state.status === 'syncing'}
          title="Enviar e receber as alterações"
        >
          <RefreshCw size={16} />
          <span>{state.status === 'syncing' ? 'Sincronizando' : 'Sincronizar'}</span>
        </button>
      )}

      <button
        type="button"
        className={`pf-live-device ${connected ? 'is-on' : 'is-off'}`}
        onClick={onOpenSync}
        title={label}
        aria-label={label}
      >
        <PeerIcon name={state.peerName} size={18} />
        <span className="pf-live-dot" aria-hidden="true" />
        <span className="pf-live-label">{connected ? 'Conectado' : 'Desconectado'}</span>
      </button>
    </div>
  )
}
