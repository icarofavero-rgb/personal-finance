/**
 * Pareamento da conexão contínua: os dois aparelhos guardam o mesmo
 * "canal" (tópico) e a mesma chave secreta, recebidos pelo QR code.
 * Tudo que passa pelo serviço de encontro vai cifrado com essa chave.
 *
 * Fica só neste aparelho (não vai para backup nem sincronização).
 */

const PAIRING_KEY = 'personal-finance-live-link-v1'
const DEVICE_KEY = 'personal-finance-device-id-v1'
export const LIVE_CODE_PREFIX = 'PF2:'

export type Pairing = {
  topic: string
  key: string
  peerName: string
  role: 'host' | 'guest'
  createdAt: string
  /** a primeira sincronização ainda não aconteceu */
  needsInitialSync: boolean
  lastSyncAt?: string
  /** última alteração feita neste aparelho (para mostrar "Sincronizar") */
  lastLocalChangeAt?: string
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'

function random(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return [...bytes].map(byte => ALPHABET[byte % 32]).join('')
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/** Identificação fixa deste aparelho. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = random(20)
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export function getPairing(): Pairing | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PAIRING_KEY) ?? 'null') as Pairing | null
    return parsed && typeof parsed.topic === 'string' && typeof parsed.key === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function savePairing(pairing: Pairing): void {
  localStorage.setItem(PAIRING_KEY, JSON.stringify(pairing))
}

export function updatePairing(changes: Partial<Pairing>): void {
  const current = getPairing()
  if (current) savePairing({ ...current, ...changes })
}

export function clearPairing(): void {
  localStorage.removeItem(PAIRING_KEY)
}

/** Cria um novo convite (canal + chave) e devolve o texto do QR code. */
export function createInvite(myName: string): { code: string; topic: string; key: string } {
  const topic = `pf-${random(26)}`
  const keyBytes = new Uint8Array(32)
  crypto.getRandomValues(keyBytes)
  const key = toBase64Url(keyBytes)
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ v: 1, t: topic, k: key, n: myName })))
  return { code: `${LIVE_CODE_PREFIX}${payload}`, topic, key }
}

export function parseInvite(code: string): { topic: string; key: string; name: string } {
  const invalid = new Error('Este não é um código de conexão do Personal Finance.')
  if (!code.startsWith(LIVE_CODE_PREFIX)) throw invalid

  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(code.slice(LIVE_CODE_PREFIX.length)))) as Record<string, unknown>
    if (data.v !== 1 || typeof data.t !== 'string' || !/^pf-[a-z2-7]{26}$/.test(data.t) || typeof data.k !== 'string') throw invalid
    return { topic: data.t, key: data.k, name: typeof data.n === 'string' ? data.n.slice(0, 40) : 'Outro aparelho' }
  } catch {
    throw invalid
  }
}

// ---------- criptografia (AES-GCM) ----------

export async function importKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64Url(key), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptText(key: CryptoKey, text: string): Promise<string> {
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)))
  const out = new Uint8Array(iv.length + data.length)
  out.set(iv)
  out.set(data, iv.length)
  return toBase64Url(out)
}

/** `null` se a mensagem não foi cifrada com a nossa chave. */
export async function decryptText(key: CryptoKey, text: string): Promise<string | null> {
  try {
    const bytes = fromBase64Url(text)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12))
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}
