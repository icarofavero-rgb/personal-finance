import { useCallback, useEffect, useState } from 'react'

import ProcessOverlay, { type ProcessState } from './ProcessOverlay'
import { LIVE_FEEDBACK_EVENT, type LiveFeedback } from '../services/sync/liveLink'

/**
 * Mesma animação do backup para a conexão contínua: o símbolo gira
 * enquanto sincroniza e vira ✓ verde (deu certo) ou ✗ vermelho (falhou).
 */
export default function LiveSyncFeedback() {
  const [state, setState] = useState<ProcessState>('idle')
  const [info, setInfo] = useState<LiveFeedback | null>(null)

  useEffect(() => {
    function onFeedback(event: Event) {
      const detail = (event as CustomEvent<LiveFeedback>).detail
      setInfo(detail)
      setState(detail.phase === 'start' ? 'working' : detail.phase)
    }
    window.addEventListener(LIVE_FEEDBACK_EVENT, onFeedback)
    return () => window.removeEventListener(LIVE_FEEDBACK_EVENT, onFeedback)
  }, [])

  const close = useCallback(() => setState('idle'), [])

  const peer = info?.peerName
  const summary = info?.summary?.filter(Boolean) ?? []

  return (
    <ProcessOverlay
      state={state}
      workingText={peer ? `Sincronizando com ${peer}…` : 'Sincronizando com os aparelhos…'}
      successText={peer ? `${peer} sincronizado!` : 'Aparelhos sincronizados!'}
      errorText="A conexão falhou."
      detail={state === 'error' ? info?.message : summary.length > 0 ? summary.slice(0, 3).join(' · ') : undefined}
      onClose={close}
      autoCloseMs={1800}
    />
  )
}
