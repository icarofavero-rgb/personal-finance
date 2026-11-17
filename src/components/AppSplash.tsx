
import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'

import {
  getAppearancePreferences,
  applyAccentColor,
  applyNeonIntensity,
  applyAnimationPreference,
} from '../services/appearanceStorage'

import './AppSplash.css'

type AppSplashProps = {
  onComplete: () => void
}

export default function AppSplash({
  onComplete,
}: AppSplashProps) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const preferences = getAppearancePreferences()

    applyAccentColor(preferences.accentColor)
    applyNeonIntensity(preferences.neonIntensity)
    applyAnimationPreference(preferences.animations)

    const systemReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const reduceMotion =
      systemReducedMotion ||
      preferences.animations === 'reduced'

    const disableMotion =
      preferences.animations === 'off'

    const duration = disableMotion
      ? 0
      : reduceMotion
        ? 600
        : 4200

    const fadeDuration =
      disableMotion || reduceMotion ? 0 : 300

    const closeTimer = window.setTimeout(() => {
      setClosing(true)
    }, duration)

    const finishTimer = window.setTimeout(() => {
      onComplete()
    }, duration + fadeDuration)

    return () => {
      window.clearTimeout(closeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [onComplete])

  return (
    <div
      className={`pf-splash ${
        closing ? 'pf-splash-closing' : ''
      }`}
      role="status"
      aria-label="Inicializando Personal Finance"
    >
      <div className="pf-splash-content">
        <div className="pf-splash-icon">
          <Wallet size={48} strokeWidth={1.5} />
        </div>

        <div className="pf-splash-name">
          Personal <span>Finance</span>
        </div>
      </div>
    </div>
  )
}
