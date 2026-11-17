
// Deve ser o primeiro import: garante crypto.randomUUID na rede local (HTTP).
import './polyfills'
import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppSplash from './components/AppSplash'

import {
  getAppearancePreferences,
  applyAccentColor,
  applyNeonIntensity,
  applyAnimationPreference,
} from './services/appearanceStorage'

const initialAppearance = getAppearancePreferences()

applyAccentColor(initialAppearance.accentColor)
applyNeonIntensity(initialAppearance.neonIntensity)
applyAnimationPreference(initialAppearance.animations)

function AppWithSplash() {
  const [showSplash, setShowSplash] = useState(true)

  const finishSplash = useCallback(() => {
    setShowSplash(false)
  }, [])

  return (
    <>
      <App />
      {showSplash && (
        <AppSplash onComplete={finishSplash} />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithSplash />
  </StrictMode>,
)
