import { describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
  registerPlugin: () => ({ update: async () => {} }),
}))

const { buildWidgetData } = await import('./widgetBridge')

const today = new Date(2026, 10, 18)
const data = [
  { amount: 3000, type: 'income' as const, date: '2026-11-01' },
  { amount: 1250.5, type: 'expense' as const, date: '2026-11-05' },
  { amount: 999, type: 'expense' as const, date: '2026-10-30' }, // mês passado: não conta
]

const clean = (text: string) => text.replace(/ /g, ' ')

describe('widget da tela inicial', () => {
  it('mostra saldo, entradas e saídas do mês atual', () => {
    const widget = buildWidgetData(data, today, { accent: '#ec4899', locked: false })

    expect(widget.title).toBe('Personal Finance · Novembro')
    expect(clean(widget.balance)).toBe('R$ 1.749,50')
    expect(clean(widget.income)).toBe('↑ R$ 3.000,00')
    expect(clean(widget.expense)).toBe('↓ R$ 1.250,50')
    expect(widget.negative).toBe(false)
  })

  it('saldo negativo fica marcado e o nome do perfil aparece', () => {
    const widget = buildWidgetData([{ amount: 50, type: 'expense', date: '2026-11-02' }], today, {
      profileName: 'Trabalho',
      accent: '',
      locked: true,
    })

    expect(widget.negative).toBe(true)
    expect(widget.title).toBe('Trabalho · Novembro')
    expect(widget.accent).toBe('#8b5cf6')
    expect(widget.locked).toBe(true)
  })
})
