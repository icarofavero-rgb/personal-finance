
const PREFIX = 'personal-finance-'

export type FinancialSnapshot = {
  version: 1
  createdAt: string
  origin: string
  entries: Record<string, string>
}

export function createFinancialSnapshot(): FinancialSnapshot {
  const entries: Record<string, string> = {}

  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)

    if (!key || !key.startsWith(PREFIX)) {
      continue
    }

    const value = localStorage.getItem(key)

    if (value === null) {
      throw new Error(
        `Não foi possível ler a chave ${key}.`
      )
    }

    entries[key] = value
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    origin: window.location.origin,
    entries,
  }
}

export function downloadFinancialSnapshot(): void {
  const snapshot = createFinancialSnapshot()

  const blob = new Blob(
    [JSON.stringify(snapshot, null, 2)],
    { type: 'application/json' }
  )

  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download =
      `personal-finance-snapshot-${Date.now()}.json`

    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
