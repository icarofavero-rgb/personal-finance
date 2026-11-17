
export type StorageDiagnostics = {
  totalKeys: number
  financialKeys: number
  estimatedBytes: number
  estimatedKilobytes: number
  available: boolean
}

export function getStorageDiagnostics(): StorageDiagnostics {
  try {
    let totalKeys = 0
    let financialKeys = 0
    let estimatedBytes = 0

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)

      if (key === null) continue

      const value = localStorage.getItem(key)

      if (value === null) continue

      totalKeys++

      if (key.startsWith('personal-finance-')) {
        financialKeys++
      }

      estimatedBytes += (key.length + value.length) * 2
    }

    return {
      totalKeys,
      financialKeys,
      estimatedBytes,
      estimatedKilobytes:
        Math.round((estimatedBytes / 1024) * 100) / 100,
      available: true,
    }
  } catch {
    return {
      totalKeys: 0,
      financialKeys: 0,
      estimatedBytes: 0,
      estimatedKilobytes: 0,
      available: false,
    }
  }
}
