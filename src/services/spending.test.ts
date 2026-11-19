import { describe, expect, it } from 'vitest'
import { buildSpendingEntries, shiftDate } from './spending'
import { calculateMonthlyDashboard } from './monthlyDashboard'

const card = { id: 'c1', name: 'Nubank', bank: 'Nu', limit: 5000, closingDay: 5, dueDay: 12 }

describe('gastos de todas as formas de pagamento', () => {
  const transactions = [
    { id: 't1', description: 'Mercado (Pix)', amount: 200, type: 'expense' as const, category: 'Alimentação / Supermercado', date: '2026-11-03' },
    { id: 't2', description: 'Salário', amount: 3000, type: 'income' as const, category: 'Salário', date: '2026-11-01' },
    // pagamento da fatura: não pode contar de novo
    { id: 'pay', description: 'Pagamento fatura Nubank', amount: 300, type: 'expense' as const, category: 'Finanças / Tarifas', date: '2026-11-12' },
  ]
  const purchases = [
    { id: 'p1', cardId: 'c1', description: 'TV', amount: 900, category: 'Compras / Eletrônicos', date: '2026-11-08', installments: 3 },
    { id: 'p2', cardId: 'c1', description: 'Uber', amount: 30, category: 'Transporte / Aplicativos de transporte', date: '2026-11-10', installments: 1 },
  ]
  const payments = [{ id: 'pg', cardId: 'c1', invoiceMonth: '2026-11', amount: 300, date: '2026-11-12', transactionId: 'pay' }]

  const entries = buildSpendingEntries(transactions, purchases, payments, [card])

  it('cartão de crédito entra nas saídas do mês junto com Pix, débito e dinheiro', () => {
    const november = calculateMonthlyDashboard(entries, '2026-11')
    // Pix 200 + 1ª parcela da TV 300 + Uber 30 (o pagamento da fatura fica de fora)
    expect(november.expense).toBe(530)
    expect(november.income).toBe(3000)
  })

  it('as parcelas aparecem nos meses seguintes, com o número da parcela', () => {
    const tv = entries.filter(item => item.purchaseId === 'p1')
    expect(tv.map(item => [item.date, item.description])).toEqual([
      ['2026-11-08', 'TV (1/3)'],
      ['2026-12-08', 'TV (2/3)'],
      ['2027-01-08', 'TV (3/3)'],
    ])
    expect(calculateMonthlyDashboard(entries, '2026-12').expense).toBe(300)
  })

  it('dia 31 vira o último dia do mês', () => {
    expect(shiftDate('2026-01-31', 1)).toBe('2026-02-28')
  })
})
