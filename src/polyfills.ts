/**
 * Compatibilidade para uso na rede local.
 *
 * `crypto.randomUUID()` só existe em "contextos seguros" (HTTPS ou localhost).
 * Ao abrir o app por http://192.168.x.x a partir de outro aparelho da rede,
 * a função não existe e qualquer cadastro falharia. `crypto.getRandomValues()`
 * existe em qualquer contexto, então geramos o UUID v4 a partir dela.
 */
export function createRandomUUID(): `${string}-${string}-${string}-${string}-${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(16))

  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'))

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}` as
    `${string}-${string}-${string}-${string}-${string}`
}

if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  Object.defineProperty(crypto, 'randomUUID', {
    value: createRandomUUID,
    configurable: true,
    writable: true,
  })
}
