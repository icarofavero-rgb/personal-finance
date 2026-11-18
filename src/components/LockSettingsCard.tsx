import { useEffect, useState } from 'react'
import { Copy, Fingerprint, Lock, LockOpen, ShieldCheck } from 'lucide-react'

import { LOCK_CHANGED_EVENT } from './AppLockScreen'
import {
  checkPin,
  disableLock,
  enableLock,
  getLockSettings,
  isValidPin,
  updateLockOptions,
} from '../services/appLock'
import { isBiometricAvailable } from '../services/biometric'

type Props = {
  onMessage: (message: string, type?: 'success' | 'error') => void
}

type Step =
  | { kind: 'idle' }
  | { kind: 'verify'; then: 'disable' | 'change' }
  | { kind: 'new' }
  | { kind: 'confirm'; pin: string }
  | { kind: 'code'; code: string }

const LOCK_AFTER = [
  { value: 1, label: 'Após 1 minuto fora do app' },
  { value: 5, label: 'Após 5 minutos fora do app' },
  { value: -1, label: 'Só ao abrir o app' },
]

/** Configurações → Privacidade e segurança: bloqueio com PIN e digital. */
export default function LockSettingsCard({ onMessage }: Props) {
  const [settings, setSettings] = useState(getLockSettings)
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const [value, setValue] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    void isBiometricAvailable().then(setBiometricAvailable)
  }, [])

  const refresh = () => {
    setSettings(getLockSettings())
    window.dispatchEvent(new Event(LOCK_CHANGED_EVENT))
  }

  const go = (next: Step) => {
    setValue('')
    setStep(next)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()

    if (step.kind === 'verify') {
      if (!checkPin(value)) {
        onMessage('PIN incorreto.', 'error')
        setValue('')
        return
      }
      if (step.then === 'disable') {
        disableLock()
        refresh()
        go({ kind: 'idle' })
        onMessage('Bloqueio desligado.')
      } else {
        go({ kind: 'new' })
      }
      return
    }

    if (step.kind === 'new') {
      if (!isValidPin(value)) {
        onMessage('Use de 4 a 6 números.', 'error')
        return
      }
      go({ kind: 'confirm', pin: value })
      return
    }

    if (step.kind === 'confirm') {
      if (value !== step.pin) {
        onMessage('Os PINs não são iguais. Tente de novo.', 'error')
        go({ kind: 'new' })
        return
      }
      const code = enableLock(step.pin, {
        biometric: settings?.biometric ?? biometricAvailable,
        lockAfterMinutes: settings?.lockAfterMinutes ?? 1,
      })
      refresh()
      go({ kind: 'code', code })
    }
  }

  const pinForm = (title: string, hint: string, button: string) => (
    <form className="pf-lock-setup" onSubmit={submit}>
      <strong>{title}</strong>
      <small>{hint}</small>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={value}
        onChange={event => setValue(event.target.value.replace(/\D/g, ''))}
        placeholder="••••"
        aria-label={title}
        autoFocus
      />
      <div className="pf-lock-setup-actions">
        <button type="button" className="pf-ghost-button" onClick={() => go({ kind: 'idle' })}>
          Cancelar
        </button>
        <button type="submit" className="primary-button" disabled={value.length < 4}>
          {button}
        </button>
      </div>
    </form>
  )

  return (
    <div className="settings-appearance-group pf-lock-settings">
      <h3>Bloqueio do app</h3>
      <p>Peça um PIN (ou a digital, no celular) para abrir o Personal Finance. Vale só para este aparelho.</p>

      {step.kind === 'code' ? (
        <div className="pf-lock-code-box">
          <ShieldCheck size={22} />
          <div>
            <strong>Anote seu código de recuperação</strong>
            <p>Se esquecer o PIN, é com ele que você entra. Ele aparece só agora.</p>
            <code>{step.code}</code>
            <div className="pf-lock-setup-actions">
              <button
                type="button"
                className="pf-ghost-button"
                onClick={() => {
                  void navigator.clipboard?.writeText(step.code).then(() => onMessage('Código copiado!'))
                }}
              >
                <Copy size={15} /> Copiar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  go({ kind: 'idle' })
                  onMessage('Bloqueio ligado!')
                }}
              >
                Já anotei
              </button>
            </div>
          </div>
        </div>
      ) : step.kind === 'verify' ? (
        pinForm('Digite seu PIN atual', 'Para confirmar que é você.', 'Confirmar')
      ) : step.kind === 'new' ? (
        pinForm('Crie um PIN', 'De 4 a 6 números. Evite datas de aniversário.', 'Continuar')
      ) : step.kind === 'confirm' ? (
        pinForm('Repita o PIN', 'Para ter certeza de que digitou certo.', 'Ligar bloqueio')
      ) : settings ? (
        <div className="pf-lock-on">
          <div className="pf-lock-status is-on">
            <Lock size={18} /> Bloqueio ligado
          </div>

          {biometricAvailable && (
            <label className="settings-notification-option">
              <span>
                <strong>
                  <Fingerprint size={15} style={{ verticalAlign: '-2px' }} /> Desbloquear com digital
                </strong>
                <small>Usa a digital ou o rosto cadastrado no celular.</small>
              </span>
              <input
                type="checkbox"
                className="settings-toggle-input"
                role="switch"
                checked={settings.biometric}
                onChange={event => {
                  updateLockOptions({ biometric: event.target.checked })
                  refresh()
                }}
              />
            </label>
          )}

          <label className="pf-lock-after">
            Pedir o PIN de novo
            <select
              value={settings.lockAfterMinutes}
              onChange={event => {
                updateLockOptions({ lockAfterMinutes: Number(event.target.value) })
                refresh()
              }}
            >
              {LOCK_AFTER.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="pf-lock-setup-actions">
            <button type="button" className="pf-ghost-button" onClick={() => go({ kind: 'verify', then: 'change' })}>
              Trocar PIN
            </button>
            <button type="button" className="pf-ghost-button" onClick={() => go({ kind: 'verify', then: 'disable' })}>
              <LockOpen size={15} /> Desligar bloqueio
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="primary-button pf-lock-enable" onClick={() => go({ kind: 'new' })}>
          <Lock size={16} /> Ligar bloqueio com PIN
        </button>
      )}
    </div>
  )
}
