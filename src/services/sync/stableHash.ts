/**
 * JSON com as chaves dos objetos em ordem alfabética.
 * Garante que o mesmo conteúdo gere sempre o mesmo texto, mesmo que
 * outro aparelho tenha gravado as propriedades em outra ordem.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item ?? null)).join(',')}]`
  }

  const entries = Object.keys(value)
    .filter(key => (value as Record<string, unknown>)[key] !== undefined)
    .sort()
    .map(
      key =>
        `${JSON.stringify(key)}:${stableStringify(
          (value as Record<string, unknown>)[key]
        )}`
    )

  return `{${entries.join(',')}}`
}

/** Impressão digital (hash de 53 bits, algoritmo cyrb53) de um texto. */
export function hashString(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57

  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export function hashRecord(record: unknown): string {
  return hashString(stableStringify(record))
}
