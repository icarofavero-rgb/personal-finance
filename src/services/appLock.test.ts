import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkPin,
  checkRecoveryCode,
  disableLock,
  enableLock,
  getLockSettings,
  hashSecret,
  isValidPin,
  sha256,
} from './appLock'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
})

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex')

describe('SHA-256 próprio', () => {
  it('dá o mesmo resultado do SHA-256 oficial', () => {
    for (const text of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'Olá, mundo! 💰'.repeat(20)]) {
      const bytes = new TextEncoder().encode(text)
      expect(hex(sha256(bytes))).toBe(createHash('sha256').update(bytes).digest('hex'))
    }
  })
})

describe('bloqueio com PIN', () => {
  beforeEach(() => memory.clear())

  it('PIN de 4 a 6 números', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })

  it('confere o PIN sem guardar o PIN', () => {
    const recovery = enableLock('2580', { biometric: false, lockAfterMinutes: 1 })

    expect(checkPin('2580')).toBe(true)
    expect(checkPin('0000')).toBe(false)
    expect(JSON.stringify([...memory.values()])).not.toContain('2580')
    expect(recovery).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
  })

  it('o código de recuperação funciona com letras minúsculas e sem traço', () => {
    const recovery = enableLock('2580', { biometric: false, lockAfterMinutes: 0 })
    expect(checkRecoveryCode(recovery.toLowerCase().replace('-', ' '))).toBe(true)
    expect(checkRecoveryCode('AAAAA-BBBBB')).toBe(false)
  })

  it('sal diferente gera impressão diferente para o mesmo PIN', () => {
    expect(hashSecret('1234', 'a', 10)).not.toBe(hashSecret('1234', 'b', 10))
  })

  it('desligar apaga a configuração', () => {
    enableLock('2580', { biometric: true, lockAfterMinutes: 5 })
    expect(getLockSettings()?.lockAfterMinutes).toBe(5)
    disableLock()
    expect(getLockSettings()).toBeNull()
    expect(checkPin('2580')).toBe(false)
  })
})
