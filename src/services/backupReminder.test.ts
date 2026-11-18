import { beforeEach, describe, expect, it } from 'vitest'
import { getBackupReminder, markBackupDone, snoozeBackupReminder } from './backupReminder'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
  },
})

const day = (n: number) => new Date(2026, 10, 1 + n, 12)

describe('lembrete de backup', () => {
  beforeEach(() => memory.clear())

  it('sem dados, não incomoda', () => {
    expect(getBackupReminder(false, day(0)).show).toBe(false)
  })

  it('com dados e nenhum backup, avisa', () => {
    expect(getBackupReminder(true, day(0))).toEqual({ show: true, days: null })
  })

  it('só volta a avisar 7 dias depois do último backup', () => {
    markBackupDone(day(0))
    expect(getBackupReminder(true, day(6)).show).toBe(false)
    expect(getBackupReminder(true, day(7))).toEqual({ show: true, days: 7 })
  })

  it('"lembrar depois" esconde por 3 dias', () => {
    markBackupDone(day(0))
    snoozeBackupReminder(day(10))
    expect(getBackupReminder(true, day(12)).show).toBe(false)
    expect(getBackupReminder(true, day(14)).show).toBe(true)
  })
})
