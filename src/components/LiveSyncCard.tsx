import { useState } from 'react'
import { Link2, Link2Off, QrCode, RefreshCw, ScanLine, ShieldCheck, Wifi } from 'lucide-react'

import QrCodeImage from './QrCodeImage'
import QrScanner from './QrScanner'
import ConfirmDialog from './ConfirmDialog'
import { PeerIcon, useLiveLink } from './LiveSyncIndicator'
import { liveLink } from '../services/sync/liveLink'
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
 * dois ficam pareados (reconectam sozinhos).
 */
export default function LiveSyncCard({ onMessage }: Props) {
  const state = useLiveLink()
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmUnpair, setConfirmUnpair] = useState(false)
  const [pasted, setPasted] = useState('')

  async function showQr() {
    setBusy(true)
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
    try {
      await liveLink.acceptInvite(code)
      onMessage('success', 'Código lido! Conectando aos aparelhos…')
    } catch (error) {
      onMessage('error', error instanceof Error ? error.message : 'Código inválido.')
    }
  }

  async function syncNow() {
    try {
      const summary = await liveLink.syncNow()
      onMessage('success', summary.length > 0 ? `Sincronizado! ${summary.join(' · ')}` : 'Tudo sincronizado!')
    } catch (error) {
      onMessage('error', error instanceof Error ? error.message : 'Não foi possível sincronizar.')
    }
  }

  const connected = state.status === 'connected' || state.status === 'syncing'

  return (
    <section className="panel pf-live-card">
      <div className="pf-live-card-heading">
        <span className="pf-live-card-icon">
          <Link2 size={22} />
        </span>
        <div>
          <h2>Conexão contínua</h2>
          <p>Leia o QR code uma única vez: os aparelhos ficam pareados e você sincroniza com um toque.</p>
        </div>
      </div>

      {state.status === 'unpaired' && !scanning && (
        <div className="pf-live-card-actions">
          <button type="button" className="primary-button" onClick={() => void showQr()} disabled={busy}>
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

      {state.status === 'waiting-scan' && state.inviteCode && (
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
          <button type="button" className="text-button" onClick={() => void liveLink.unpair()}>
            Cancelar
          </button>
        </div>
      )}

      {(state.status === 'connecting' || connected) && (
        <div className={`pf-live-card-status ${connected ? 'is-on' : ''}`}>
          <span className="pf-live-card-peer">
            <PeerIcon name={state.peerName} size={26} />
            <span className="pf-live-dot" aria-hidden="true" />
          </span>
          <div className="pf-live-card-text">
            <strong>{state.peerName}</strong>
            <small>
              {state.status === 'syncing'
                ? 'Sincronizando…'
                : connected
                  ? `Conectado · ${timeAgo(state.lastSyncAt)}`
                  : 'Procurando… abra o app no outro aparelho (os dois precisam de internet).'}
            </small>
            {state.error && !connected && <small className="pf-live-card-error">{state.error}</small>}
          </div>

          <div className="pf-live-card-buttons">
            {connected && (
              <button type="button" className="primary-button" onClick={() => void syncNow()} disabled={state.status === 'syncing'}>
                <RefreshCw size={16} className={state.status === 'syncing' ? 'sync-spin' : ''} />
                {state.pending ? 'Sincronizar alterações' : 'Sincronizar agora'}
              </button>
            )}
            <button type="button" className="pf-ghost-button" onClick={() => setConfirmUnpair(true)}>
              <Link2Off size={16} /> Desconectar
            </button>
          </div>
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
        open={confirmUnpair}
        title="Desconectar os aparelhos?"
        message="Os dois aparelhos deixam de ficar conectados. Seus dados continuam nos dois. Para conectar de novo, é só ler um QR code novo."
        confirmLabel="Desconectar"
        onConfirm={() => {
          setConfirmUnpair(false)
          void liveLink.unpair()
        }}
        onCancel={() => setConfirmUnpair(false)}
      />
    </section>
  )
}
