/**
 * "Começar do zero": apaga TODOS os dados financeiros deste aparelho
 * (transações, cartões, faturas, metas, orçamentos, guardado, lembretes,
 * recorrentes, devedores, fotos e perfis extras). Mantém aparência, layout,
 * nome/foto do usuário e o bloqueio por PIN.
 */

import { PROFILE_SCOPED_KEYS, PROFILES_STORAGE_KEY } from './profileScope'

export function wipeAllFinancialData(): number {
  const toRemove: string[] = []

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key) continue
    if (PROFILE_SCOPED_KEYS.has(key) || key.startsWith('personal-finance-p:') || key === PROFILES_STORAGE_KEY) {
      toRemove.push(key)
    }
  }

  toRemove.forEach(key => localStorage.removeItem(key))

  // Fotos dos comprovantes
  try {
    indexedDB.deleteDatabase('personal-finance-attachments')
  } catch {
    // sem IndexedDB: nada a apagar
  }

  return toRemove.length
}
