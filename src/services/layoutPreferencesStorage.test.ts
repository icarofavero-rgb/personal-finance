import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignPhoneTab,
  DEFAULT_MAIN_ORDER,
  getLayoutPreferences,
  LAYOUT_STORAGE_KEY,
  moveItem,
  normalizeMainOrder,
  normalizePhoneTabs,
  saveLayoutPreferences,
} from './layoutPreferencesStorage'

const store = new Map<string, string>()
const events: string[] = []

Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
  window: { dispatchEvent: (event: Event) => events.push(event.type) },
})

describe('layout do menu', () => {
  beforeEach(() => {
    store.clear()
    events.length = 0
  })

  it('sem nada salvo, usa a ordem original', () => {
    expect(getLayoutPreferences()).toEqual({
      mainOrder: DEFAULT_MAIN_ORDER,
      phoneTabs: ['Dashboard', 'Transações', 'Cartões'],
    })
  })

  it('ordem salva com seção desconhecida ou faltando é corrigida', () => {
    const order = normalizeMainOrder(['Metas', 'Inexistente', 'Metas', 'Dashboard'])

    expect(order.slice(0, 2)).toEqual(['Metas', 'Dashboard'])
    expect(order).toHaveLength(DEFAULT_MAIN_ORDER.length)
    expect(new Set(order).size).toBe(DEFAULT_MAIN_ORDER.length)
  })

  it('barra do celular sempre tem 3 páginas diferentes e válidas', () => {
    expect(normalizePhoneTabs(['Metas', 'Metas', 'Configurações'])).toEqual(['Metas', 'Dashboard', 'Transações'])
    expect(normalizePhoneTabs('lixo')).toEqual(['Dashboard', 'Transações', 'Cartões'])
  })

  it('trocar um botão da barra por um que já está nela troca os dois de lugar', () => {
    expect(assignPhoneTab(['Dashboard', 'Transações', 'Cartões'], 0, 'Cartões')).toEqual([
      'Cartões',
      'Transações',
      'Dashboard',
    ])
    expect(assignPhoneTab(['Dashboard', 'Transações', 'Cartões'], 2, 'Metas')).toEqual([
      'Dashboard',
      'Transações',
      'Metas',
    ])
  })

  it('mover uma seção para cima', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
  })

  it('salvar grava, limpa e avisa o menu', () => {
    saveLayoutPreferences({ mainOrder: ['Relatórios'], phoneTabs: ['Calendário', 'Guardado', 'Metas'] })

    const saved = JSON.parse(store.get(LAYOUT_STORAGE_KEY)!)
    expect(saved.mainOrder[0]).toBe('Relatórios')
    expect(saved.mainOrder).toHaveLength(DEFAULT_MAIN_ORDER.length)
    expect(getLayoutPreferences().phoneTabs).toEqual(['Calendário', 'Guardado', 'Metas'])
    expect(events).toEqual(['personal-finance-layout-changed'])
  })
})
