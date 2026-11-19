
// Deve ser o primeiro import: garante crypto.randomUUID na rede local (HTTP).
import './polyfills'
import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppSplash from './components/AppSplash'
import AppLockScreen from './components/AppLockScreen'
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
  applyBackground,
} from './services/appearanceStorage'

// Camada visual (fundo, vidro, navegação, transições). Deve vir por último.
import './styles/experience.css'
import './styles/liquid-ios.css'
import './styles/christmas.css'
import './styles/uniform.css'
import './styles/neon-lightshow.css'
import { installBusyMarker } from './hooks/busyMarker'
import { installProfileScope } from './services/profileScope'
import { liveLink } from './services/sync/liveLink'

// Pausa o fundo animado enquanto a tela rola (mais fluidez no celular).
installBusyMarker()

// Multiperfis: cada perfil lê e grava nos próprios dados.
// Precisa vir ANTES do rastreador da sincronização.
installProfileScope()

// Registra quando cada dado foi criado/alterado/excluído (base da sincronização).
// Não interfere nas gravações do app: só observa.
installChangeTracking()

// Conexão contínua com o aparelho pareado (se houver)
liveLink.start()

// Aplica a aparência antes do primeiro desenho da tela (evita "piscar").
const initialAppearance = getAppearancePreferences()

applyAccentColor(initialAppearance.accentColor)
applyNeonIntensity(initialAppearance.neonIntensity)
applyAnimationPreference(initialAppearance.animations)
applyAppTheme(initialAppearance.theme)
applyVisualStyle(initialAppearance.visualStyle)
applyBackground(initialAppearance.background)
applyDeviceAttributes()

function AppWithSplash() {
  // Depois de trocar de perfil a tela recarrega: sem repetir a animação de entrada.
  const [showSplash, setShowSplash] = useState(() => {
    try {
      if (sessionStorage.getItem('pf-skip-splash') === '1') {
        sessionStorage.removeItem('pf-skip-splash')
        return false
      }
    } catch {
      // sem sessionStorage: mostra normalmente
    }
    return true
  })
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
      <AppLockScreen />
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
