import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Delete, Fingerprint, KeyRound, Lock, Wallet } from 'lucide-react'

import {
  checkPin,
  checkRecoveryCode,
  disableLock,
  getLockSettings,
  MAX_ATTEMPTS,
  WAIT_SECONDS,
} from '../services/appLock'
import { isBiometricAvailable, verifyBiometric } from '../services/biometric'

/** Avisado quando o bloqueio é ligado/desligado em Configurações. */
export const LOCK_CHANGED_EVENT = 'personal-finance-lock-changed'

/**
 * Tela de bloqueio: aparece ao abrir o app e ao voltar para ele depois
 * do tempo escolhido. Enquanto bloqueado, o conteúdo fica escondido.
 */
export default function AppLockScreen() {
  const [locked, setLocked] = useState(() => getLockSettings() !== null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [waitUntil, setWaitUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [recovery, setRecovery] = useState<string | null>(null)
  const [biometricReady, setBiometricReady] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const hiddenAt = useRef<number | null>(null)
  const settings = getLockSettings()
  const pinLength = settings?.pinLength ?? 4

  const unlock = useCallback(() => {
    setUnlocking(true)
    window.setTimeout(() => {
      setLocked(false)
      setUnlocking(false)
      setPin('')
      setAttempts(0)
      setRecovery(null)
    }, 260)
  }, [])

  const tryBiometric = useCallback(async () => {
    const current = getLockSettings()
    if (!current?.biometric || !(await isBiometricAvailable())) return
    if (await verifyBiometric()) unlock()
  }, [unlock])

  // Esconde o app enquanto estiver bloqueado
  useEffect(() => {
    const root = document.documentElement
    if (locked) root.setAttribute('data-pf-locked', '')
    else root.removeAttribute('data-pf-locked')
  }, [locked])

  // Digital: oferece assim que a tela de bloqueio aparece
  useEffect(() => {
    if (!locked) return
    let active = true

    void isBiometricAvailable().then(available => {
      if (!active) return
      const ready = available && Boolean(getLockSettings()?.biometric)
      setBiometricReady(ready)
      if (ready) window.setTimeout(() => void tryBiometric(), 450)
    })

    return () => {
      active = false
    }
  }, [locked, tryBiometric])

  // Volta a bloquear depois de um tempo fora do app
  useEffect(() => {
    function wentAway() {
      hiddenAt.current = Date.now()
    }

    function cameBack() {
      const current = getLockSettings()
      const since = hiddenAt.current
      hiddenAt.current = null
      if (!current || since === null || current.lockAfterMinutes < 0) return
      if (Date.now() - since >= current.lockAfterMinutes * 60_000) setLocked(true)
    }

    const onVisibility = () => (document.visibilityState === 'hidden' ? wentAway() : cameBack())
    document.addEventListener('visibilitychange', onVisibility)

    let removeNative: (() => void) | null = null
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('appStateChange', state => (state.isActive ? cameBack() : wentAway())).then(handle => {
        removeNative = () => void handle.remove()
      })
    }

    // Bloqueio ligado/desligado nas Configurações
    const onChange = () => {
      if (!getLockSettings()) setLocked(false)
    }
    window.addEventListener(LOCK_CHANGED_EVENT, onChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(LOCK_CHANGED_EVENT, onChange)
      removeNative?.()
    }
  }, [])

  // Contagem regressiva depois de muitos erros
  useEffect(() => {
    if (waitUntil <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [waitUntil])

  const waiting = waitUntil > now
  const secondsLeft = Math.ceil((waitUntil - now) / 1000)

  const submit = useCallback(
    (value: string) => {
      if (checkPin(value)) {
        unlock()
        return
      }

      const next = attempts + 1
      setAttempts(next)
      setError(true)
      window.setTimeout(() => {
        setError(false)
        setPin('')
      }, 450)

      if (next >= MAX_ATTEMPTS) {
        setAttempts(0)
        setWaitUntil(Date.now() + WAIT_SECONDS * 1000)
        setNow(Date.now())
      }
    },
    [attempts, unlock]
  )

  const press = useCallback(
    (digit: string) => {
      if (waiting || error || unlocking) return
      setPin(current => {
        if (current.length >= pinLength) return current
        const next = current + digit
        if (next.length === pinLength) window.setTimeout(() => submit(next), 120)
        return next
      })
    },
    [waiting, error, unlocking, pinLength, submit]
  )

  // Teclado do computador
  useEffect(() => {
    if (!locked || recovery !== null) return

    function onKey(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') setPin(current => current.slice(0, -1))
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, recovery, press])

  if (!locked) return null

  return createPortal(
    <div className={`pf-lock ${unlocking ? 'is-unlocking' : ''}`} role="dialog" aria-modal="true" aria-label="App bloqueado">
      <div className="pf-lock-card">
        <span className="pf-lock-logo">
          <Wallet size={30} />
          <span className="pf-lock-badge">
            <Lock size={13} />
          </span>
        </span>

        {recovery === null ? (
          <>
            <h2>Personal Finance bloqueado</h2>
            <p>{waiting ? `Muitas tentativas. Aguarde ${secondsLeft}s.` : 'Digite seu PIN para continuar'}</p>

            <div className={`pf-lock-dots ${error ? 'is-error' : ''}`} aria-hidden="true">
              {Array.from({ length: pinLength }, (_, index) => (
                <span key={index} className={index < pin.length ? 'is-filled' : ''} />
              ))}
            </div>

            <div className="pf-lock-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button key={digit} type="button" onClick={() => press(digit)} disabled={waiting}>
                  {digit}
                </button>
              ))}
              {biometricReady ? (
                <button type="button" className="is-tool" onClick={() => void tryBiometric()} aria-label="Usar digital">
                  <Fingerprint size={26} />
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => press('0')} disabled={waiting}>
                0
              </button>
              <button
                type="button"
                className="is-tool"
                onClick={() => setPin(current => current.slice(0, -1))}
                aria-label="Apagar"
              >
                <Delete size={24} />
              </button>
            </div>

            <button type="button" className="pf-lock-link" onClick={() => setRecovery('')}>
              Esqueci meu PIN
            </button>
          </>
        ) : (
          <form
            className="pf-lock-recovery"
            onSubmit={event => {
              event.preventDefault()
              if (checkRecoveryCode(recovery)) {
                disableLock()
                window.dispatchEvent(new Event(LOCK_CHANGED_EVENT))
                unlock()
              } else {
                setError(true)
                window.setTimeout(() => setError(false), 450)
              }
            }}
          >
            <h2>Código de recuperação</h2>
            <p>
              Digite o código que apareceu quando você criou o PIN. O bloqueio será desligado e você pode criar
              um PIN novo em Configurações.
            </p>
            <label className={`pf-lock-code ${error ? 'is-error' : ''}`}>
              <KeyRound size={18} />
              <input
                value={recovery}
                onChange={event => setRecovery(event.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                autoFocus
                autoComplete="off"
                aria-label="Código de recuperação"
              />
            </label>
            <button type="submit" className="primary-button">
              Desbloquear
            </button>
            <button type="button" className="pf-lock-link" onClick={() => setRecovery(null)}>
              Voltar para o PIN
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
