import { useCallback, useEffect, useRef, useState } from 'react'
import ProcessOverlay, { type ProcessState } from '../components/ProcessOverlay'
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Wifi,
} from 'lucide-react'

import QrCodeImage from '../components/QrCodeImage'
import QrScanner from '../components/QrScanner'
import { localDateStamp, saveTextFile } from '../services/fileExport'
import { SIGNAL_PREFIX } from '../services/sync/signalCodec'
import { reloadApp } from '../services/profileSwitch'
import {
  applyRemoteSyncPackage,
  createLocalSyncPackage,
  type SyncApplyResult,
} from '../services/sync/syncApply'
import {
  createGuestConnection,
  createHostConnection,
  isPeerConnectionSupported,
  warmUpCameraPermission,
  type GuestConnection,
  type HostConnection,
} from '../services/sync/syncPeer'
import {
  runSyncSession,
  type SyncStage,
  type TextChannel,
} from '../services/sync/syncProtocol'
import LiveSyncCard from '../components/LiveSyncCard'
import Toast, { type ToastMessage } from '../components/Toast'
import '../styles/sync.css'

type Step =
  | { name: 'menu' }
  | { name: 'preparing'; message: string }
  | { name: 'host-offer'; offerCode: string }
  | { name: 'host-scan'; offerCode: string }
  | { name: 'guest-scan' }
  | { name: 'guest-answer'; answerCode: string }
  | { name: 'syncing'; stage: SyncStage }
  | { name: 'done'; local: string[]; peer: string[] | null; changed: boolean }
  | { name: 'error'; message: string }

const STAGE_LABELS: Record<SyncStage, string> = {
  connected: 'Aparelhos conectados!',
  sending: 'Enviando seus dados…',
  receiving: 'Recebendo dados do outro aparelho…',
  applying: 'Juntando e salvando os dados com segurança…',
  'waiting-peer': 'Aguardando o outro aparelho terminar…',
}

/** Aviso mostrado embaixo dos QR codes. */
function WifiWarning() {
  return (
    <p className="pf-wifi-warning" role="note">
      <AlertTriangle size={18} />
      <span>
        <strong>Atenção:</strong> o backup somente funcionará quando ambos os dispositivos
        estiverem conectados à mesma rede Wi-Fi.
      </span>
    </p>
  )
}

/** Deixa o símbolo girar ao menos um instante (operações muito rápidas). */
function minimumSpin(started: number, minimum = 900): Promise<void> {
  const remaining = minimum - (Date.now() - started)
  return remaining > 0 ? new Promise(resolve => setTimeout(resolve, remaining)) : Promise.resolve()
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

/** Campo para colar um código manualmente (quando não há câmera). */
function PasteCode({ onSubmit, label }: { onSubmit: (code: string) => void; label: string }) {
  const [value, setValue] = useState('')

  return (
    <details className="sync-paste">
      <summary>Sem câmera? Cole o código em texto</summary>
      <textarea
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={`${SIGNAL_PREFIX}…`}
        aria-label={label}
        rows={4}
      />
      <button
        type="button"
        className="backup-feature-button import-button"
        disabled={!value.trim().startsWith(SIGNAL_PREFIX)}
        onClick={() => onSubmit(value.trim())}
      >
        Usar este código
      </button>
    </details>
  )
}

/** Mostra o código em texto com botão de copiar (para enviar por mensagem). */
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // Sem acesso à área de transferência: seleciona o texto para copiar à mão.
      areaRef.current?.select()
    }
  }

  return (
    <details className="sync-paste">
      <summary>Mostrar o código em texto</summary>
      <textarea ref={areaRef} value={code} readOnly rows={4} aria-label="Código em texto" />
      <button type="button" className="backup-feature-button export-button" onClick={copy}>
        <Copy size={16} />
        {copied ? 'Copiado!' : 'Copiar código'}
      </button>
    </details>
  )
}

export default function Sync() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const closeToast = useCallback(() => setToast(null), [])
  const [step, setStep] = useState<Step>({ name: 'menu' })
  const hostRef = useRef<HostConnection | null>(null)
  const guestRef = useRef<GuestConnection | null>(null)
  const peerSupported = isPeerConnectionSupported()

  const closeConnections = useCallback(() => {
    hostRef.current?.close()
    guestRef.current?.close()
    hostRef.current = null
    guestRef.current = null
  }, [])

  // Fecha a conexão ao sair da tela.
  useEffect(() => closeConnections, [closeConnections])

  // Tela de processamento (símbolo girando → check verde ou X vermelho)
  const [process, setProcess] = useState<{ state: ProcessState; detail?: string }>({ state: 'idle' })
  const closeProcess = useCallback(() => setProcess({ state: 'idle' }), [])

  const startSession = useCallback(
    async (channel: TextChannel) => {
      setStep({ name: 'syncing', stage: 'connected' })
      setProcess({ state: 'working' })
      const started = Date.now()

      try {
        const result = await runSyncSession(channel, {
          createPackage: createLocalSyncPackage,
          applyPackage: applyRemoteSyncPackage,
          onStage: stage => setStep({ name: 'syncing', stage }),
        })

        await minimumSpin(started)
        setStep({
          name: 'done',
          local: result.local.summary,
          peer: result.peerSummary,
          changed: result.local.changed,
        })
        setProcess({ state: 'success' })
      } catch (error) {
        await minimumSpin(started)
        const message = errorMessage(error, 'A sincronização falhou.')
        setStep({ name: 'error', message })
        setProcess({ state: 'error', detail: message })
      } finally {
        // Dá tempo da última mensagem chegar ao outro lado antes de fechar.
        setTimeout(closeConnections, 1500)
      }
    },
    [closeConnections]
  )

  // --- Aparelho que INICIA ---

  async function startAsHost() {
    closeConnections()
    setStep({ name: 'preparing', message: 'Preparando a conexão…' })

    try {
      await warmUpCameraPermission()
      const host = await createHostConnection()
      hostRef.current = host
      setStep({ name: 'host-offer', offerCode: host.offerCode })
    } catch (error) {
      setStep({ name: 'error', message: errorMessage(error, 'Não foi possível preparar a conexão.') })
    }
  }

  async function receiveAnswer(code: string) {
    const host = hostRef.current
    if (!host) return

    setStep({ name: 'preparing', message: 'Conectando ao outro aparelho…' })
    setProcess({ state: 'working' })

    try {
      await startSession(await host.acceptAnswer(code))
    } catch (error) {
      const message = errorMessage(error, 'Não foi possível conectar.')
      setStep({ name: 'error', message })
      setProcess({ state: 'error', detail: message })
    }
  }

  // --- Aparelho que RESPONDE ---

  async function receiveOffer(code: string) {
    closeConnections()
    setStep({ name: 'preparing', message: 'Preparando a resposta…' })

    try {
      const guest = await createGuestConnection(code)
      guestRef.current = guest
      setStep({ name: 'guest-answer', answerCode: guest.answerCode })

      await startSession(await guest.connected)
    } catch (error) {
      const message = errorMessage(error, 'Não foi possível conectar.')
      setStep({ name: 'error', message })
      setProcess({ state: 'error', detail: message })
    }
  }

  // --- Por arquivo ---

  const [fileResult, setFileResult] = useState<SyncApplyResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  async function exportSyncFile() {
    setFileError(null)

    try {
      const content = JSON.stringify(createLocalSyncPackage())
      await saveTextFile(`personal-finance-sincronizacao-${localDateStamp()}.json`, content, {
        title: 'Sincronização Personal Finance',
        text: 'Arquivo de sincronização do Personal Finance',
        dialogTitle: 'Enviar arquivo de sincronização',
      })
    } catch (error) {
      setFileError(errorMessage(error, 'Não foi possível gerar o arquivo.'))
    }
  }

  async function importSyncFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFileError(null)
    setFileResult(null)
    setProcess({ state: 'working' })
    const started = Date.now()

    try {
      let parsed: unknown

      try {
        parsed = JSON.parse(await file.text())
      } catch {
        throw new Error('O arquivo escolhido não é um arquivo de sincronização.')
      }

      const result = applyRemoteSyncPackage(parsed)
      await minimumSpin(started)
      setFileResult(result)
      setProcess({ state: 'success' })
    } catch (error) {
      await minimumSpin(started)
      const message = errorMessage(error, 'Não foi possível sincronizar com o arquivo.')
      setFileError(message)
      setProcess({ state: 'error', detail: message })
    }
  }

  // --- Telas ---

  function renderFlow() {
    switch (step.name) {
      case 'menu':
        return (
          <div className="backup-card-grid">
            <div className="backup-feature-card">
              <div className="backup-feature-icon export-icon">
                <QrCode size={24} />
              </div>
              <h3>Começar neste aparelho</h3>
              <p>Mostra um QR code para o outro aparelho ler.</p>
              <button
                type="button"
                className="backup-feature-button export-button"
                onClick={startAsHost}
              >
                <QrCode size={17} />
                Mostrar QR code
              </button>
            </div>

            <div className="backup-feature-card">
              <div className="backup-feature-icon import-icon">
                <ScanLine size={24} />
              </div>
              <h3>Ler o QR de outro aparelho</h3>
              <p>Use quando o outro aparelho já estiver mostrando o QR code.</p>
              <button
                type="button"
                className="backup-feature-button import-button"
                onClick={() => setStep({ name: 'guest-scan' })}
              >
                <ScanLine size={17} />
                Ler QR code
              </button>
            </div>
          </div>
        )

      case 'preparing':
        return (
          <div className="sync-status">
            <RefreshCw size={22} className="sync-spin" />
            <span>{step.message}</span>
          </div>
        )

      case 'host-offer':
        return (
          <div className="sync-step">
            <span className="sync-step-number">Passo 1 de 2</span>
            <h3>No outro aparelho, toque em “Ler QR code” e aponte para este código</h3>
            <QrCodeImage value={step.offerCode} label="QR code de convite" />
            <WifiWarning />
            <CopyCode code={step.offerCode} />
            <button
              type="button"
              className="primary-button"
              onClick={() => setStep({ name: 'host-scan', offerCode: step.offerCode })}
            >
              <ScanLine size={17} />
              Pronto, o outro aparelho mostrou um QR code
            </button>
          </div>
        )

      case 'host-scan':
        return (
          <div className="sync-step">
            <span className="sync-step-number">Passo 2 de 2</span>
            <h3>Agora leia o QR code de resposta do outro aparelho</h3>
            <QrScanner prefix={SIGNAL_PREFIX} onCode={receiveAnswer} />
            <PasteCode label="Código de resposta" onSubmit={receiveAnswer} />
            <button
              type="button"
              className="text-button"
              onClick={() => setStep({ name: 'host-offer', offerCode: step.offerCode })}
            >
              Voltar e mostrar meu QR code de novo
            </button>
          </div>
        )

      case 'guest-scan':
        return (
          <div className="sync-step">
            <span className="sync-step-number">Passo 1 de 2</span>
            <h3>Aponte a câmera para o QR code do outro aparelho</h3>
            <QrScanner prefix={SIGNAL_PREFIX} onCode={receiveOffer} />
            <PasteCode label="Código de convite" onSubmit={receiveOffer} />
          </div>
        )

      case 'guest-answer':
        return (
          <div className="sync-step">
            <span className="sync-step-number">Passo 2 de 2</span>
            <h3>Mostre este QR code para o primeiro aparelho ler</h3>
            <QrCodeImage value={step.answerCode} label="QR code de resposta" />
            <WifiWarning />
            <CopyCode code={step.answerCode} />
            <div className="sync-status">
              <RefreshCw size={18} className="sync-spin" />
              <span>Aguardando a conexão…</span>
            </div>
          </div>
        )

      case 'syncing':
        return (
          <div className="sync-status">
            <ArrowLeftRight size={22} className="sync-pulse" />
            <span>{STAGE_LABELS[step.stage]}</span>
          </div>
        )

      case 'done':
        return (
          <div className="sync-step">
            <div className="sync-done-icon">
              <CheckCircle2 size={40} />
            </div>
            <h3>Sincronização concluída!</h3>

            <div className="sync-summary">
              <strong>Recebido neste aparelho</strong>
              {step.local.length === 0 ? (
                <p>Nada novo — este aparelho já estava em dia.</p>
              ) : (
                <ul>{step.local.map(line => <li key={line}>{line}</li>)}</ul>
              )}

              {step.peer && (
                <>
                  <strong>Enviado para o outro aparelho</strong>
                  {step.peer.length === 0 ? (
                    <p>Nada novo — o outro aparelho já estava em dia.</p>
                  ) : (
                    <ul>{step.peer.map(line => <li key={line}>{line}</li>)}</ul>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                // Recarrega para todas as telas mostrarem os dados novos.
                if (step.changed) reloadApp()
                else setStep({ name: 'menu' })
              }}
            >
              Concluir
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="sync-step">
            <p className="sync-error">{step.message}</p>
            <p className="sync-hint">Nenhum dado foi perdido. Você pode tentar novamente.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                closeConnections()
                setStep({ name: 'menu' })
              }}
            >
              Tentar novamente
            </button>
          </div>
        )
    }
  }

  return (
    <section className="backup-page sync-page">
      <div className="backup-page-heading">
        <span className="eyebrow">SEUS APARELHOS</span>
        <h1>
          Sincronização<span className="neon-dot">.</span>
        </h1>
        <p>Junte os dados do celular, tablet e computador. Seus dados vão direto de um aparelho para o outro.</p>
      </div>

      <LiveSyncCard
        onMessage={(type, message) => setToast({ id: crypto.randomUUID(), type, message })}
      />

      <div className="backup-security-panel sync-howto">
        <div className="backup-security-heading">
          <Wifi size={22} />
          <div>
            <h3>Sem internet: com dois QR codes</h3>
            <p>Uma sincronização de cada vez, sem usar internet. Os dois aparelhos precisam estar abertos e no mesmo Wi-Fi.</p>
          </div>
        </div>

        {peerSupported ? (
          renderFlow()
        ) : (
          <p className="sync-error">
            Este navegador não permite a conexão direta entre aparelhos.
            Use a sincronização por arquivo abaixo.
          </p>
        )}
      </div>

      <div className="backup-security-panel">
        <div className="backup-security-heading">
          <FileUp size={22} />
          <div>
            <h3>Por arquivo</h3>
            <p>Sem câmera ou sem Wi-Fi em comum? Envie um arquivo (WhatsApp, e-mail, pendrive).</p>
          </div>
        </div>

        <ol className="sync-file-steps">
          <li>Neste aparelho, toque em <strong>Gerar arquivo</strong> e envie para o outro.</li>
          <li>No outro aparelho, toque em <strong>Abrir arquivo</strong> e escolha o arquivo recebido.</li>
          <li>Para este aparelho também receber as novidades do outro, repita no sentido contrário.</li>
        </ol>

        <div className="sync-file-actions">
          <button type="button" className="backup-feature-button export-button" onClick={exportSyncFile}>
            <Download size={17} />
            Gerar arquivo
          </button>

          <label className="backup-feature-button import-button">
            <FileUp size={17} />
            Abrir arquivo
            <input type="file" accept=".json,application/json" onChange={importSyncFile} hidden />
          </label>
        </div>

        {fileError && <p className="sync-error">{fileError}</p>}

        {fileResult && (
          <div className="sync-summary">
            <strong>Sincronização concluída</strong>
            {fileResult.summary.length === 0 ? (
              <p>Nada novo — este aparelho já estava em dia.</p>
            ) : (
              <ul>{fileResult.summary.map(line => <li key={line}>{line}</li>)}</ul>
            )}
            {fileResult.changed && (
              <button type="button" className="primary-button" onClick={() => reloadApp()}>
                Atualizar telas
              </button>
            )}
          </div>
        )}
      </div>

      <div className="backup-security-panel">
        <div className="backup-security-heading">
          <ShieldCheck size={22} />
          <div>
            <h3>Como funciona</h3>
            <p>Seus dados ficam protegidos durante a sincronização.</p>
          </div>
        </div>

        <ul className="sync-file-steps">
          <li>Os aparelhos conversam diretamente; seus dados nunca ficam guardados em servidor.</li>
          <li>Se o mesmo item foi alterado nos dois aparelhos, vale a alteração mais recente.</li>
          <li>Antes de gravar, o app guarda uma cópia dos dados atuais. Se algo der errado, tudo volta como estava.</li>
          <li>Sincronize apenas aparelhos <strong>seus</strong>: os dados dos dois ficam iguais.</li>
        </ul>
      </div>

      <ProcessOverlay
        state={process.state}
        detail={process.detail}
        workingText="Sincronizando seus dados…"
        onClose={closeProcess}
      />
      <Toast key={toast?.id ?? 'empty'} toast={toast} onClose={closeToast} />
    </section>
  )
}
