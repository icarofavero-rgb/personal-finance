/** Digital / reconhecimento facial do Android (só no app instalado). */

import { Capacitor } from '@capacitor/core'
import { NativeBiometric } from '@capgo/capacitor-native-biometric'

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false

  try {
    return (await NativeBiometric.isAvailable()).isAvailable
  } catch {
    return false
  }
}

/** Mostra a janela de digital do Android. `true` = reconhecido. */
export async function verifyBiometric(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      title: 'Desbloquear o Personal Finance',
      subtitle: 'Use sua digital ou rosto',
      reason: 'Desbloquear o Personal Finance',
      negativeButtonText: 'Usar PIN',
    })
    return true
  } catch {
    return false
  }
}
