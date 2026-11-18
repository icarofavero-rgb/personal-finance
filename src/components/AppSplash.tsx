import { useEffect, useMemo, useRef, useState } from 'react'
import { Wallet } from 'lucide-react'

import { getAppearancePreferences } from '../services/appearanceStorage'
import { getLayoutPreferences } from '../services/layoutPreferencesStorage'
import { findNavItem } from './AppNavigation'

import './AppSplash.css'

type AppSplashProps = {
  onComplete: () => void
}

/** Quantos ícones das seções passam antes do ícone do Personal Finance. */
const SECTION_ICONS = 7

/** Tempos da animação normal (ms). Ícones: 1 a cada STEP. */
const STEP = 370
const FIRST_ICON = 400
const FINAL_AT = FIRST_ICON + SECTION_ICONS * STEP
const CLOSE_AT = FINAL_AT + 1700
const FADE = 550

/**
 * Animação de entrada: os ícones das seções do menu vão se transformando
 * um no outro até virar o ícone do Personal Finance, na cor escolhida.
 * Tudo é feito só com transform/opacity (leve até em celulares simples).
 * Tocar na tela pula a animação.
 */
export default function AppSplash({ onComplete }: AppSplashProps) {
  const [closing, setClosing] = useState(false)
  const done = useRef(false)

  const mode = useMemo(() => {
    const animations = getAppearancePreferences().animations
    if (animations === 'off') return 'off'
    if (animations === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced'
    return 'full'
  }, [])

  // Os ícones seguem a ordem do menu escolhida em Configurações → Layout
  const icons = useMemo(
    () =>
      getLayoutPreferences()
        .mainOrder.map(page => findNavItem(page)?.icon)
        .filter(icon => icon !== undefined)
        .slice(0, SECTION_ICONS),
    []
  )

  useEffect(() => {
    if (mode === 'off') {
      onComplete()
      return
    }

    const closeAt = mode === 'reduced' ? 700 : CLOSE_AT
    const fade = mode === 'reduced' ? 200 : FADE
    const closeTimer = window.setTimeout(() => setClosing(true), closeAt)
    const finishTimer = window.setTimeout(() => {
      done.current = true
      onComplete()
    }, closeAt + fade)

    return () => {
      window.clearTimeout(closeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [mode, onComplete])

  function skip() {
    if (closing || done.current) return
    setClosing(true)
    window.setTimeout(() => {
      if (done.current) return
      done.current = true
      onComplete()
    }, 260)
  }

  if (mode === 'off') return null

  return (
    <div
      className={`pf-splash is-${mode} ${closing ? 'pf-splash-closing' : ''}`}
      role="status"
      aria-label="Abrindo o Personal Finance"
      onClick={skip}
      style={
        {
          '--splash-step': `${STEP}ms`,
          '--splash-first': `${FIRST_ICON}ms`,
          '--splash-final': `${FINAL_AT}ms`,
        } as React.CSSProperties
      }
    >
      <div className="pf-splash-glow" aria-hidden="true" />

      <div className="pf-splash-content">
        <div className="pf-splash-tile">
          <span className="pf-splash-tile-glass" aria-hidden="true" />
          <span className="pf-splash-tile-accent" aria-hidden="true" />
          <span className="pf-splash-ring" aria-hidden="true" />

          {mode === 'full' &&
            icons.map((Icon, index) => (
              <span
                key={index}
                className="pf-splash-section-icon"
                style={{ '--i': index } as React.CSSProperties}
                aria-hidden="true"
              >
                <Icon size={40} strokeWidth={1.7} />
              </span>
            ))}

          <span className="pf-splash-final-icon">
            <Wallet size={46} strokeWidth={1.7} />
          </span>
        </div>

        <div className="pf-splash-name">
          personal<span>finance</span>
        </div>
      </div>
    </div>
  )
}
