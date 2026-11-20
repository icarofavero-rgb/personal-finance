import { useMemo } from 'react'
import { ChevronRight, HandCoins, Wallet } from 'lucide-react'

import { getDebtorsData } from '../services/debtors/debtorsStorage'
import { calculateDebtSummary } from '../services/debtors/debtorsCalculations'
import { getMonthInstallment } from '../services/debtors/debtInstallments'
import type { DebtorKind } from '../services/debtors/debtorsTypes'

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function nextMonth(month: string): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const monthName = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long' })

type Side = {
  kind: DebtorKind
  rows: { id: string; label: string; detail: string }[]
  total: number
  thisMonth: number
  nextMonth: number
  /** valor das parcelas do mês (pagas ou não) */
  monthValue: number
}

type Props = {
  /** mês do "Período" do Dashboard (AAAA-MM) */
  month: string
  onOpen: () => void
}

/**
 * Dashboard: dívidas com outras pessoas (Devedores), em dois cartões:
 * "Eu devo" (saldo a pagar) e "Me devem" (saldo a receber), cada um com o
 * que vence no mês e no mês seguinte.
 */
export default function DebtsOwedCard({ month, onOpen }: Props) {
  const sides = useMemo<Side[]>(() => {
    try {
      const { debtors, debts, payments } = getDebtorsData()
      const following = nextMonth(month)

      return (['i-owe', 'owes-me'] as const).map(kind => {
        const people = new Map(debtors.filter(debtor => (debtor.kind ?? 'owes-me') === kind).map(debtor => [debtor.id, debtor.name]))
        let total = 0
        let thisMonth = 0
        let monthValue = 0
        let nextMonthTotal = 0
        const rows: Side['rows'] = []

        for (const debt of debts) {
          const person = people.get(debt.debtorId)
          if (!person) continue
          const remaining = calculateDebtSummary(debt, payments).remainingCents
          if (remaining <= 0) continue
          total += remaining

          const current = getMonthInstallment(debt, payments, month)
          const upcoming = getMonthInstallment(debt, payments, following)
          if (current) {
            thisMonth += current.remainingCents + current.overdueCents
            monthValue += current.amountCents + current.overdueCents
          }
          if (upcoming) nextMonthTotal += upcoming.remainingCents

          rows.push({
            id: debt.id,
            label: `${person} · ${debt.description}`,
            detail: current
              ? `${current.number}/${current.total} · ${current.status === 'paid' ? (kind === 'i-owe' ? 'paga' : 'recebida') : money(current.remainingCents)}`
              : `falta ${money(remaining)}`,
          })
        }

        return { kind, rows, total, thisMonth, nextMonth: nextMonthTotal, monthValue }
      })
    } catch {
      // dados ilegíveis: os dois blocos aparecem zerados
      return (['i-owe', 'owes-me'] as const).map(kind => ({ kind, rows: [], total: 0, thisMonth: 0, nextMonth: 0, monthValue: 0 }))
    }
  }, [month])

  // Os dois blocos ficam SEMPRE no Dashboard, mesmo zerados
  const visible = sides

  const following = nextMonth(month)

  return (
    <div className="pf-owed-grid">
      {visible.map(side => {
        const mine = side.kind === 'i-owe'
        return (
          <section key={side.kind} className={`panel pf-owed-card is-${side.kind}`} aria-label={mine ? 'O que você deve' : 'O que te devem'}>
            <button type="button" className="pf-owed-head" onClick={onOpen}>
              <span className="pf-owed-icon">{mine ? <HandCoins size={20} /> : <Wallet size={20} />}</span>
              <span className="pf-owed-title">
                <strong>{mine ? 'Eu devo' : 'Me devem'}</strong>
                <small>{mine ? 'Dívidas com outras pessoas' : 'Valores a receber de outras pessoas'}</small>
              </span>
              <ChevronRight size={18} />
            </button>

            {mine ? (
              // Eu devo: valor do mês (parcela), quanto falta do mês e saldo total
              <div className="pf-owed-totals">
                <div>
                  <small>Saldo a pagar em {monthName(month)}</small>
                  <strong>{money(side.monthValue)}</strong>
                </div>
                <div>
                  <small>Falta pagar em {monthName(month)}</small>
                  <strong className={side.thisMonth > 0 ? 'is-due' : ''}>{money(side.thisMonth)}</strong>
                </div>
                <div>
                  <small>Saldo total a pagar</small>
                  <strong>{money(side.total)}</strong>
                </div>
              </div>
            ) : (
              <div className="pf-owed-totals">
                <div>
                  <small>Saldo a receber</small>
                  <strong>{money(side.total)}</strong>
                </div>
                <div>
                  <small>A receber em {monthName(month)}</small>
                  <strong className={side.thisMonth > 0 ? 'is-due' : ''}>{money(side.thisMonth)}</strong>
                </div>
                <div>
                  <small>A receber em {monthName(following)}</small>
                  <strong>{money(side.nextMonth)}</strong>
                </div>
              </div>
            )}

            <ul className="pf-owed-list">
              {side.rows.length === 0 && (
                <li className="pf-owed-empty">
                  {mine ? 'Nenhuma dívida em aberto. Registre em Devedores → Eu devo.' : 'Ninguém te deve agora. Registre em Devedores → Me devem.'}
                </li>
              )}
              {side.rows.slice(0, 4).map(row => (
                <li key={row.id}>
                  <span className="pf-owed-name">{row.label}</span>
                  <span className="pf-owed-detail">{row.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
