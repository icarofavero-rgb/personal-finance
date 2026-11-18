/**
 * Bloqueio do app com PIN (e digital no Android).
 *
 * O PIN nunca é guardado: só uma "impressão digital" dele (SHA-256 com sal,
 * repetida milhares de vezes), que não dá para desfazer. Feito em
 * JavaScript puro para funcionar igual no app, no navegador e no arquivo.
 *
 * É uma configuração DESTE aparelho: não vai para backup nem sincronização.
 */

const KEY = 'personal-finance-app-lock-v1'
const ROUNDS = 12000
export const MAX_ATTEMPTS = 5
export const WAIT_SECONDS = 30

export type LockSettings = {
  enabled: boolean
  pinHash: string
  salt: string
  recoveryHash: string
  recoverySalt: string
  biometric: boolean
  /** minutos fora do app até pedir o PIN de novo (-1 = só ao abrir o app) */
  lockAfterMinutes: number
  /** quantidade de números do PIN (para conferir sozinho ao terminar) */
  pinLength: number
}

// ---------- SHA-256 ----------

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

export function sha256(data: Uint8Array): Uint8Array {
  const length = data.length
  const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6)
  padded.set(data)
  padded[length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, length * 8)
  view.setUint32(padded.length - 8, Math.floor((length * 8) / 2 ** 32))

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3)
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }

    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i] + w[i]) | 0
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      hh = g
      g = f
      f = e
      e = (d + t1) | 0
      d = c
      c = b
      b = a
      a = (t1 + t2) | 0
    }

    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh
  }

  const out = new Uint8Array(32)
  const outView = new DataView(out.buffer)
  h.forEach((value, index) => outView.setUint32(index * 4, value))
  return out
}

const toHex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
const encoder = new TextEncoder()

/** Impressão digital do segredo: SHA-256(sal + segredo), repetida várias vezes. */
export function hashSecret(secret: string, salt: string, rounds = ROUNDS): string {
  let state = sha256(encoder.encode(`${salt}:${secret}`))
  const saltBytes = encoder.encode(salt)
  const buffer = new Uint8Array(state.length + saltBytes.length)

  for (let round = 1; round < rounds; round++) {
    buffer.set(state)
    buffer.set(saltBytes, state.length)
    state = sha256(buffer)
  }

  return toHex(state)
}

function randomString(length: number, alphabet: string): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return [...bytes].map(byte => alphabet[byte % alphabet.length]).join('')
}

/** Código de recuperação fácil de ler (sem 0/O, 1/I/L). */
export function createRecoveryCode(): string {
  const raw = randomString(10, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789')
  return `${raw.slice(0, 5)}-${raw.slice(5)}`
}

const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

// ---------- configurações ----------

export function getLockSettings(): LockSettings | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LockSettings | null
    return parsed && parsed.enabled && parsed.pinHash && parsed.salt ? parsed : null
  } catch {
    return null
  }
}

export function isLockEnabled(): boolean {
  return getLockSettings() !== null
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

/** Liga o bloqueio. Retorna o código de recuperação (mostrado uma única vez). */
export function enableLock(pin: string, options: { biometric: boolean; lockAfterMinutes: number }): string {
  if (!isValidPin(pin)) throw new Error('O PIN precisa ter de 4 a 6 números.')

  const salt = randomString(16, 'abcdefghijklmnopqrstuvwxyz0123456789')
  const recoverySalt = randomString(16, 'abcdefghijklmnopqrstuvwxyz0123456789')
  const recovery = createRecoveryCode()

  const settings: LockSettings = {
    enabled: true,
    pinHash: hashSecret(pin, salt),
    salt,
    recoveryHash: hashSecret(normalizeCode(recovery), recoverySalt),
    recoverySalt,
    biometric: options.biometric,
    lockAfterMinutes: options.lockAfterMinutes,
    pinLength: pin.length,
  }

  localStorage.setItem(KEY, JSON.stringify(settings))
  return recovery
}

export function updateLockOptions(changes: Partial<Pick<LockSettings, 'biometric' | 'lockAfterMinutes'>>): void {
  const current = getLockSettings()
  if (!current) return
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...changes }))
}

export function disableLock(): void {
  localStorage.removeItem(KEY)
}

export function checkPin(pin: string): boolean {
  const settings = getLockSettings()
  return settings !== null && hashSecret(pin, settings.salt) === settings.pinHash
}

export function checkRecoveryCode(code: string): boolean {
  const settings = getLockSettings()
  return settings !== null && hashSecret(normalizeCode(code), settings.recoverySalt) === settings.recoveryHash
}
