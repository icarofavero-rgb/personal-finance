
import {
  getFinancialProfileStorageKey,
  type ProfileDataArea,
} from './financialProfileKeys'

import { getFinancialProfiles } from './financialProfilesStorage'

export function readFinancialProfileData(
  profileId: string,
  area: ProfileDataArea
): unknown | null {
  const key = getFinancialProfileStorageKey(
    profileId,
    area
  )

  const saved = localStorage.getItem(key)

  if (saved === null) {
    return null
  }

  try {
    return JSON.parse(saved) as unknown
  } catch {
    throw new Error(
      'Não foi possível ler os dados do perfil. ' +
      'Nenhuma informação foi alterada.'
    )
  }
}

export function writeFinancialProfileData(
  profileId: string,
  area: ProfileDataArea,
  data: unknown
): void {
  const profileExists = getFinancialProfiles().some(
    profile => profile.id === profileId
  )

  if (!profileExists) {
    throw new Error(
      'Perfil financeiro não encontrado. Nenhum dado foi alterado.'
    )
  }

  if (data === undefined) {
    throw new Error(
      'Não é permitido salvar dados indefinidos.'
    )
  }

  const key = getFinancialProfileStorageKey(
    profileId,
    area
  )

  const serialized = JSON.stringify(data)

  if (serialized === undefined) {
    throw new Error(
      'Não foi possível preparar os dados para gravação.'
    )
  }

  localStorage.setItem(key, serialized)
}
