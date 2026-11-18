
// Deve ser o primeiro import: garante crypto.randomUUID na rede local (HTTP).
import './polyfills'
import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppSplash from './components/AppSplash'
import Onboarding from './components/Onboarding'
import { installChangeTracking } from './services/sync/changeTracker'
import {
  OPEN_TUTORIAL_EVENT,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from './services/onboardingStorage'
import { applyDeviceAttributes } from './hooks/useDeviceClass'

import {
  getAppearancePreferences,
  applyAccentColor,
  applyNeonIntensity,
  applyAnimationPreference,
  applyAppTheme,
  applyVisualStyle,
} from './services/appearanceStorage'

// Camada visual (fundo, vidro, navegação, transições). Deve vir por último.
import './styles/experience.css'
import './styles/liquid-ios.css'
import './styles/christmas.css'
import './styles/uniform.css'
import './styles/neon-lightshow.css'
import { installBusyMarker } from './hooks/busyMarker'

// Pausa o fundo animado enquanto a tela rola (mais fluidez no celular).
installBusyMarker()

// Registra quando cada dado foi criado/alterado/excluído (base da sincronização).
// Não interfere nas gravações do app: só observa.
installChangeTracking()

// Aplica a aparência antes do primeiro desenho da tela (evita "piscar").
const initialAppearance = getAppearancePreferences()

applyAccentColor(initialAppearance.accentColor)
applyNeonIntensity(initialAppearance.neonIntensity)
applyAnimationPreference(initialAppearance.animations)
applyAppTheme(initialAppearance.theme)
applyVisualStyle(initialAppearance.visualStyle)
applyDeviceAttributes()

function AppWithSplash() {
  const [showSplash, setShowSplash] = useState(true)
  const [showTutorial, setShowTutorial] = useState(() => !hasCompletedOnboarding())

  const finishSplash = useCallback(() => {
    setShowSplash(false)
  }, [])

  const finishTutorial = useCallback(() => {
    markOnboardingCompleted()
    setShowTutorial(false)
  }, [])

  // Permite reabrir o tutorial pelas Configurações.
  useEffect(() => {
    const open = () => setShowTutorial(true)
    window.addEventListener(OPEN_TUTORIAL_EVENT, open)
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, open)
  }, [])

  return (
    <>
      <App />
      {showSplash && (
        <AppSplash onComplete={finishSplash} />
      )}
      {!showSplash && showTutorial && (
        <Onboarding onFinish={finishTutorial} />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithSplash />
  </StrictMode>,
)
