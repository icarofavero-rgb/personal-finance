import { beforeEach, describe, expect, it } from 'vitest'

import { dismissNotifications, filterVisibleNotifications } from './notificationDismissStorage'

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
})

const today = '2026-11-20'
const list = [
  { id: 'antigo-lido', dueDate: '2026-11-01' },
  { id: 'antigo-nao-lido', dueDate: '2026-11-01' },
  { id: 'recente-lido', dueDate: '2026-11-18' },
]

describe('avisos do sino: excluir e limpar sozinho', () => {
  beforeEach(() => memory.clear())

  it('limpa só os avisos LIDOS e antigos (os não lidos ficam)', () => {
    const visible = filterVisibleNotifications(list, today, new Set(['antigo-lido', 'recente-lido']), 7)
    expect(visible.map(item => item.id)).toEqual(['antigo-nao-lido', 'recente-lido'])
  })

  it('"nunca" não limpa nada', () => {
    expect(filterVisibleNotifications(list, today, new Set(['antigo-lido']), 0)).toHaveLength(3)
  })

  it('aviso excluído some na hora', () => {
    dismissNotifications(['recente-lido'])
    expect(filterVisibleNotifications(list, today, new Set(), 0).map(item => item.id)).toEqual(['antigo-lido', 'antigo-nao-lido'])
  })
})
