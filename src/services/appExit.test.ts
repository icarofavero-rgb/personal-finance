import { beforeEach, describe, expect, it, vi } from 'vitest'

// Simula o app Android: captura o "ouvinte" do botão voltar.
const state = vi.hoisted(() => ({
  backHandler: null as null | (() => void),
  exitCalls: 0,
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (_event: string, handler: () => void) => {
      state.backHandler = handler
      return Promise.resolve({ remove: () => {} })
    },
    exitApp: () => {
      state.exitCalls++
      return Promise.resolve()
    },
  },
}))

// "Tela" mínima: diz se há uma janela aberta e registra o Esc enviado.
let overlayOpen = false
const escapes: string[] = []

class FakeKeyboardEvent extends Event {
  key: string
  constructor(type: string, init: { key: string; bubbles?: boolean; cancelable?: boolean }) {
    super(type, init)
    this.key = init.key
  }
}

Object.assign(globalThis, {
  KeyboardEvent: FakeKeyboardEvent,
  document: {
    querySelector: () => (overlayOpen ? {} : null),
    dispatchEvent: (event: FakeKeyboardEvent) => {
      escapes.push(event.key)
      return true
    },
  },
})

const { installBackButton } = await import('./appExit')

describe('botão voltar do Android', () => {
  let page = 'Dashboard'
  const messages: string[] = []

  beforeEach(() => {
    page = 'Dashboard'
    overlayOpen = false
    escapes.length = 0
    messages.length = 0
    state.exitCalls = 0
    vi.useFakeTimers()
    installBackButton({
      isHome: () => page === 'Dashboard',
      goHome: () => {
        page = 'Dashboard'
      },
      notify: message => messages.push(message),
    })
  })

  const pressBack = () => state.backHandler?.()

  it('fecha a janela aberta em vez de sair ou trocar de tela', () => {
    page = 'Cartões'
    overlayOpen = true

    pressBack()

    expect(escapes).toEqual(['Escape'])
    expect(page).toBe('Cartões')
    expect(state.exitCalls).toBe(0)
  })

  it('fora do Dashboard, volta para o Dashboard', () => {
    page = 'Metas'

    pressBack()

    expect(page).toBe('Dashboard')
    expect(state.exitCalls).toBe(0)
  })

  it('no Dashboard, o primeiro toque só avisa', () => {
    pressBack()

    expect(messages).toEqual(['Pressione voltar novamente para sair'])
    expect(state.exitCalls).toBe(0)
  })

  it('dois toques seguidos no Dashboard fecham o app', () => {
    pressBack()
    vi.advanceTimersByTime(800)
    pressBack()

    expect(state.exitCalls).toBe(1)
  })

  it('dois toques muito separados não fecham (avisa de novo)', () => {
    pressBack()
    vi.advanceTimersByTime(3000)
    pressBack()

    expect(state.exitCalls).toBe(0)
    expect(messages).toHaveLength(2)
  })
})
