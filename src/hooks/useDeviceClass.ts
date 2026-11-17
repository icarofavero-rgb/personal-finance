import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Tipo de tela, usado pela navegação e pelas animações:
 *  - phone:   até 650px   (barra inferior, transições deslizando como no celular)
 *  - tablet:  651–1100px  (trilho lateral compacto)
 *  - desktop: acima disso (menu lateral completo, transições suaves)
 *
 * Os limites são os mesmos já usados no CSS do app.
 */
export type DeviceClass = 'phone' | 'tablet' | 'desktop'

const PHONE_MAX = 650
const TABLET_MAX = 1100

export function getDeviceClass(width = window.innerWidth): DeviceClass {
  if (width <= PHONE_MAX) return 'phone'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}

/** 'app' no Android (Capacitor), 'web' no navegador. */
export function getPlatform(): 'app' | 'web' {
  return Capacitor.isNativePlatform() ? 'app' : 'web'
}

/** Marca o <html> com o tipo de tela e a plataforma (para o CSS). */
export function applyDeviceAttributes(): DeviceClass {
  const device = getDeviceClass()
  const root = document.documentElement

  root.setAttribute('data-pf-device', device)
  root.setAttribute('data-pf-platform', getPlatform())

  return device
}

export function useDeviceClass(): DeviceClass {
  const [device, setDevice] = useState<DeviceClass>(() => applyDeviceAttributes())

  useEffect(() => {
    let frame = 0

    function update() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setDevice(applyDeviceAttributes()))
    }

    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return device
}
