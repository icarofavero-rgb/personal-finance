import { useCallback, useEffect, useState } from 'react'
import { BellOff, BellRing, CheckCircle2, Send, Smartphone } from 'lucide-react'

import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationPermissionState,
} from '../services/systemNotifications'

type Props = {
  onMessage: (message: string, type?: 'success' | 'error') => void
}

/**
 * Situação das notificações do celular (fora do app): permitidas,
 * bloqueadas ou ainda não pedidas. Tem botão para pedir a permissão e
 * para mandar uma notificação de teste.
 */
export default function NotificationPermissionCard({ onMessage }: Props) {
  const [state, setState] = useState<NotificationPermissionState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    getNotificationPermission()
      .then(setState)
      .catch(() => setState('unsupported'))
  }, [])

  useEffect(() => {
    refresh()

    // Voltou das configurações do Android: confere de novo
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  async function allow() {
    setBusy(true)
    try {
      const next = await requestNotificationPermission()
      setState(next)
      if (next === 'granted') onMessage('Notificações permitidas!')
      else if (next === 'denied') onMessage('O Android bloqueou as notificações. Veja como liberar abaixo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setBusy(true)
    try {
      const result = await sendTestNotification()
      setState(result)
      if (result === 'granted') onMessage('Notificação de teste enviada! Ela aparece em alguns segundos.')
      else onMessage('Não foi possível enviar: as notificações estão bloqueadas.', 'error')
    } catch {
      onMessage('Não foi possível enviar a notificação de teste.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return null

  if (state === 'unsupported') {
    return (
      <div className="pf-permission-card is-info">
        <Smartphone size={22} />
        <div>
          <strong>Notificações no celular</strong>
          <p>
            No navegador os avisos aparecem no sininho do app. No <b>app Android</b> eles também aparecem na
            tela do celular, mesmo com o app fechado.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'granted') {
    return (
      <div className="pf-permission-card is-ok">
        <CheckCircle2 size={22} />
        <div>
          <strong>Notificações do celular permitidas</strong>
          <p>Faturas e lembretes avisam às 9h, mesmo com o app fechado.</p>
          <button type="button" className="pf-permission-button" onClick={test} disabled={busy}>
            <Send size={16} /> Enviar notificação de teste
          </button>
        </div>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="pf-permission-card is-blocked">
        <BellOff size={22} />
        <div>
          <strong>Notificações bloqueadas no Android</strong>
          <p>
            Para receber os avisos, abra as <b>Configurações do celular → Apps → Personal Finance →
            Notificações</b> e ative. Depois volte aqui.
          </p>
          <button type="button" className="pf-permission-button" onClick={allow} disabled={busy}>
            <BellRing size={16} /> Tentar permitir de novo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pf-permission-card is-ask">
      <BellRing size={22} />
      <div>
        <strong>Ative as notificações do celular</strong>
        <p>Para ser avisado de faturas e lembretes mesmo com o app fechado.</p>
        <button type="button" className="pf-permission-button is-primary" onClick={allow} disabled={busy}>
          <BellRing size={16} /> Permitir notificações
        </button>
      </div>
    </div>
  )
}
