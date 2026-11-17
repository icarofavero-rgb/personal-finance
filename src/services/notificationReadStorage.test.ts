
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getReadNotificationIds,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
} from './notificationReadStorage'

const STORAGE_KEY = 'personal-finance-notification-read-v1'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
  })
})

describe('Histórico de leitura das notificações', () => {
  it('começa sem notificações lidas', () => {
    expect(getReadNotificationIds()).toEqual([])
  })

  it('marca uma notificação como lida', () => {
    markNotificationAsRead('aviso-1')

    expect(getReadNotificationIds()).toEqual(['aviso-1'])
  })

  it('não duplica notificações lidas', () => {
    markNotificationAsRead('aviso-1')
    markNotificationAsRead('aviso-1')

    expect(getReadNotificationIds()).toEqual(['aviso-1'])
  })

  it('preserva outras notificações ao marcar como não lida', () => {
    markNotificationAsRead('aviso-1')
    markNotificationAsRead('aviso-2')

    markNotificationAsUnread('aviso-1')

    expect(getReadNotificationIds()).toEqual(['aviso-2'])
  })

  it('não altera o histórico ao remover um ID inexistente', () => {
    markNotificationAsRead('aviso-1')
    markNotificationAsUnread('aviso-inexistente')

    expect(getReadNotificationIds()).toEqual(['aviso-1'])
  })

  it('rejeita identificadores vazios', () => {
    expect(() => markNotificationAsRead('')).toThrow()
    expect(() => markNotificationAsUnread('  ')).toThrow()
  })

  it('não sobrescreve dados inválidos', () => {
    const invalidData = '{"version":1,"readIds":"invalido"}'

    memory.set(STORAGE_KEY, invalidData)

    expect(() => markNotificationAsRead('aviso-1')).toThrow()
    expect(memory.get(STORAGE_KEY)).toBe(invalidData)
  })

it('marca várias notificações como lidas', () => {
  markAllNotificationsAsRead([
    'aviso-1',
    'aviso-2',
    'aviso-3',
  ])

  expect(getReadNotificationIds()).toEqual([
    'aviso-1',
    'aviso-2',
    'aviso-3',
  ])
})

it('preserva notificações anteriormente lidas', () => {
  markNotificationAsRead('aviso-antigo')

  markAllNotificationsAsRead([
    'aviso-1',
    'aviso-2',
  ])

  expect(getReadNotificationIds()).toEqual([
    'aviso-antigo',
    'aviso-1',
    'aviso-2',
  ])
})

it('não duplica identificadores', () => {
  markNotificationAsRead('aviso-1')

  markAllNotificationsAsRead([
    'aviso-1',
    'aviso-2',
    'aviso-2',
  ])

  expect(getReadNotificationIds()).toEqual([
    'aviso-1',
    'aviso-2',
  ])
})

it('rejeita identificadores inválidos sem alterar os dados', () => {
  markNotificationAsRead('aviso-original')

  const previousData = memory.get(STORAGE_KEY)

  expect(() =>
    markAllNotificationsAsRead([
      'aviso-1',
      '',
    ])
  ).toThrow()

  expect(memory.get(STORAGE_KEY)).toBe(previousData)
})

it('não sobrescreve um histórico corrompido', () => {
  const invalidData = '{"version":1,"readIds":"invalido"}'

  memory.set(STORAGE_KEY, invalidData)

  expect(() =>
    markAllNotificationsAsRead(['aviso-1'])
  ).toThrow()

  expect(memory.get(STORAGE_KEY)).toBe(invalidData)
})

})
