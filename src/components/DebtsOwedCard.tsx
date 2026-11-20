import { useMemo } from 'react'
import { ChevronRight, HandCoins } from 'lucide-react'

import { getDebtorsData } from '../services/debtors/debtorsStorage'
import { calculateDebtSummary } from '../services/debtors/debtorsCalculations'
import { getMonthInstallment } from '../services/debtors/debtInstallments'

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Props = {
  /** mês do "Período" do Dashboard (AAAA-MM) */
  month: string
  onOpen: () => void
}

/**
 * Dashboard: o que você deve para outras pessoas (Devedores → Eu devo).
 * Mostra o saldo a pagar e as parcelas que vencem no mês.
 */
export default function DebtsOwedCard({ month, onOpen }: Props) {
  const data = useMemo(() => {
    try {
      const { debtors, debts, payments } = getDebtorsData()
      const mine = new Map(debtors.filter(debtor => debtor.kind === 'i-owe').map(debtor => [debtor.id, debtor.name]))
      const rows = debts
        .filter(debt => mine.has(debt.debtorId))
        .map(debt => {
          const summary = calculateDebtSummary(debt, payments)
          const installment = summary.remainingCents > 0 ? getMonthInstallment(debt, payments, month) : null
          return { debt, person: mine.get(debt.debtorId) ?? '', remaining: summary.remainingCents, installment }
        })
        .filter(row => row.remaining > 0)

      const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0)
      const dueThisMonth = rows.reduce((sum, row) => sum + (row.installment ? row.installment.remainingCents + row.installment.overdueCents : 0), 0)
      return { rows, totalRemaining, dueThisMonth }
    } catch {
      return { rows: [], totalRemaining: 0, dueThisMonth: 0 }
    }
  }, [month])

  if (data.rows.length === 0) return null

  const monthName = new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <section className="panel pf-owed-card" aria-label="O que você deve">
      <button type="button" className="pf-owed-head" onClick={onOpen}>
        <span className="pf-owed-icon">
          <HandCoins size={20} />
        </span>
        <span className="pf-owed-title">
          <strong>Eu devo</strong>
          <small>Dívidas com outras pessoas</small>
        </span>
        <ChevronRight size={18} />
      </button>

      <div className="pf-owed-totals">
        <div>
          <small>Saldo a pagar</small>
          <strong>{money(data.totalRemaining)}</strong>
        </div>
        <div>
          <small>A pagar em {monthName}</small>
          <strong className={data.dueThisMonth > 0 ? 'is-due' : ''}>{money(data.dueThisMonth)}</strong>
        </div>
      </div>

      <ul className="pf-owed-list">
        {data.rows.slice(0, 4).map(row => (
          <li key={row.debt.id}>
            <span className="pf-owed-name">
              {row.person} · {row.debt.description}
            </span>
            <span className="pf-owed-detail">
              {row.installment
                ? `${row.installment.number}/${row.installment.total} · ${row.installment.status === 'paid' ? 'paga' : money(row.installment.remainingCents)}`
                : `falta ${money(row.remaining)}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
