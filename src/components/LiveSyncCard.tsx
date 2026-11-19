import { useState } from 'react'
import { Link2, Link2Off, Plus, QrCode, RefreshCw, ScanLine, ShieldCheck, Wifi } from 'lucide-react'

import QrCodeImage from './QrCodeImage'
import QrScanner from './QrScanner'
import ConfirmDialog from './ConfirmDialog'
import { isPeerOnline, PeerIcon, useLiveLink } from './LiveSyncIndicator'
import { liveLink, type PeerState } from '../services/sync/liveLink'
import { LIVE_CODE_PREFIX } from '../services/sync/livePairing'

type Props = {
  onMessage: (type: 'success' | 'error', message: string) => void
}

function timeAgo(iso?: string): string {
  if (!iso) return 'ainda não sincronizou'
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'sincronizado agora'
  if (minutes < 60) return `sincronizado há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `sincronizado há ${hours} h`
  return `sincronizado em ${new Date(iso).toLocaleDateString('pt-BR')}`
}

/**
 * Conexão contínua: um aparelho mostra o QR, o outro lê uma vez e os
 * dois ficam pareados (reconectam sozinhos). Dá para parear vários
 * aparelhos (ex.: celular, tablet e dois computadores).
 */
export default function LiveSyncCard({ onMessage }: Props) {
  const state = useLiveLink()
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [unpairTarget, setUnpairTarget] = useState<PeerState | null>(null)
  const [pasted, setPasted] = useState('')

  const peers = state.peers.filter(peer => peer.status !== 'waiting-scan')
  const anyOnline = peers.some(isPeerOnline)
  const inviting = Boolean(state.inviteCode)

  async function showQr() {
    setBusy(true)
    setScanning(false)
    try {
      await liveLink.createInvite()
    } catch (error) {
      onMessage('error', error instanceof Error ? error.message : 'Não foi possível criar o convite.')
    } finally {
      setBusy(false)
    }
  }

  async function onCode(code: string) {
    setScanning(false)
    setPasted('')
    try {
      await liveLink.acceptInvite(code)
      onMessage('success', 'Código lido! Conectando ao aparelho…')
    } catch (error) {
      onMessage('error', error instanceof Error ? error.message : 'Código inválido.')
    }
  }

  async function syncNow() {
    try {
      // A animação de ✓ / ✗ mostra o resultado
      await liveLink.syncNow()
    } catch {
      // erro já mostrado na animação
    }
  }

  return (
    <section className="panel pf-live-card">
      <div className="pf-live-card-heading">
        <span className="pf-live-card-icon">
          <Link2 size={22} />
        </span>
        <div>
          <h2>Conexão contínua</h2>
          <p>
            Leia o QR code uma única vez: os aparelhos ficam pareados e você sincroniza com um toque. Dá para conectar
            vários aparelhos ao mesmo tempo.
          </p>
        </div>
      </div>

      {peers.length > 0 && (
        <div className="pf-live-card-list">
          {peers.map(peer => {
            const online = isPeerOnline(peer)
            return (
              <div key={peer.topic} className={`pf-live-card-status ${online ? 'is-on' : ''}`}>
                <span className="pf-live-card-peer">
                  <PeerIcon name={peer.peerName} size={26} />
                  <span className="pf-live-dot" aria-hidden="true" />
                </span>
                <div className="pf-live-card-text">
                  <strong>{peer.peerName}</strong>
                  <small>
                    {peer.status === 'syncing'
                      ? 'Sincronizando…'
                      : online
                        ? `Conectado · ${timeAgo(peer.lastSyncAt)}`
                        : 'Procurando… abra o app nesse aparelho (os dois precisam de internet).'}
                  </small>
                  {peer.error && !online && <small className="pf-live-card-error">{peer.error}</small>}
                </div>
                <div className="pf-live-card-buttons">
                  <button type="button" className="pf-ghost-button" onClick={() => setUnpairTarget(peer)}>
                    <Link2Off size={16} /> Desconectar
                  </button>
                </div>
              </div>
            )
          })}

          {anyOnline && (
            <button type="button" className="primary-button pf-live-card-syncall" onClick={() => void syncNow()} disabled={state.syncing}>
              <RefreshCw size={16} className={state.syncing ? 'sync-spin' : ''} />
              {state.syncing
                ? 'Sincronizando…'
                : state.pending
                  ? 'Sincronizar alterações'
                  : peers.filter(isPeerOnline).length > 1
                    ? 'Sincronizar com todos agora'
                    : 'Sincronizar agora'}
            </button>
          )}
        </div>
      )}

      {!scanning && !inviting && (
        <div className="pf-live-card-actions">
          {peers.length > 0 && (
            <p className="pf-live-card-more">
              <Plus size={15} /> Conectar outro aparelho
            </p>
          )}
          <button type="button" className={peers.length > 0 ? 'pf-ghost-button' : 'primary-button'} onClick={() => void showQr()} disabled={busy}>
            <QrCode size={17} /> Mostrar QR code (neste aparelho)
          </button>
          <button type="button" className="pf-ghost-button" onClick={() => setScanning(true)}>
            <ScanLine size={17} /> Ler QR code do outro aparelho
          </button>
        </div>
      )}

      {scanning && (
        <div className="pf-live-card-scan">
          <QrScanner prefix={LIVE_CODE_PREFIX} onCode={code => void onCode(code)} />
          <details className="sync-paste">
            <summary>Sem câmera? Cole o código em texto</summary>
            <textarea
              value={pasted}
              onChange={event => setPasted(event.target.value)}
              placeholder={`${LIVE_CODE_PREFIX}…`}
              aria-label="Código de conexão"
              rows={3}
            />
            <button
              type="button"
              className="backup-feature-button import-button"
              disabled={!pasted.trim().startsWith(LIVE_CODE_PREFIX)}
              onClick={() => void onCode(pasted.trim())}
            >
              Usar este código
            </button>
          </details>
          <button type="button" className="text-button" onClick={() => setScanning(false)}>
            Cancelar
          </button>
        </div>
      )}

      {inviting && state.inviteCode && (
        <div className="pf-live-card-invite">
          <QrCodeImage value={state.inviteCode} label="QR code de conexão" />
          <details className="sync-paste">
            <summary>Mostrar o código em texto</summary>
            <textarea value={state.inviteCode} readOnly rows={3} aria-label="Código de conexão em texto" />
          </details>
          <ol>
            <li>No outro aparelho, abra <b>Sincronização</b>.</li>
            <li>Toque em <b>“Ler QR code do outro aparelho”</b> e aponte para este código.</li>
            <li>Pronto: os dois se conectam e sincronizam sozinhos.</li>
          </ol>
          <button type="button" className="text-button" onClick={() => liveLink.cancelInvite()}>
            Cancelar
          </button>
        </div>
      )}

      <ul className="pf-live-card-notes">
        <li>
          <Wifi size={15} /> Os dados vão direto de um aparelho para o outro pela rede. A internet é usada só para
          os aparelhos se encontrarem.
        </li>
        <li>
          <ShieldCheck size={15} /> O encontro passa por um serviço gratuito, sempre cifrado com a chave do QR code:
          ninguém mais consegue ler.
        </li>
      </ul>

      <ConfirmDialog
        open={unpairTarget !== null}
        title={`Desconectar ${unpairTarget?.peerName ?? 'o aparelho'}?`}
        message="Os dois aparelhos deixam de ficar conectados. Seus dados continuam nos dois. Para conectar de novo, é só ler um QR code novo."
        confirmLabel="Desconectar"
        onConfirm={() => {
          const target = unpairTarget
          setUnpairTarget(null)
          if (target) void liveLink.unpair(target.topic)
        }}
        onCancel={() => setUnpairTarget(null)}
      />
    </section>
  )
}
