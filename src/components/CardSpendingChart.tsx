import { useMemo, useState } from 'react'
import { CreditCard as CardIcon } from 'lucide-react'

import GlassDonut, { formatPercent, type DonutSegment } from './GlassDonut'
import CategoryIcon from './CategoryIcon'
import SelectField from './SelectField'
import { getCards } from '../services/cardsStorage'
import { getCardPurchases } from '../services/cardPurchasesStorage'
import { getCardPayments } from '../services/cardPaymentsStorage'
import { getCardInvoices } from '../services/cardInvoices'
import { getMainCategory } from '../services/categories'
import { getCurrentInvoiceMonth } from '../services/cardInvoiceDueDate'

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const DEFAULT_COLOR = '#8b5cf6'

function monthName(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return new Date(year, number - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

type Props = {
  /** mês (AAAA-MM) da fatura mostrada */
  month: string
  /** muda quando cartões/compras mudam (para ler de novo) */
  revision?: number
  title?: string
  /** cartão escolhido controlado por fora (ex.: filtro de Minhas faturas) */
  selectedCardId?: string
  onSelectCard?: (cardId: string) => void
}

/**
 * Despesas dos cartões de crédito no mês.
 * - "Todos os cartões": cada cartão é uma fatia (valor da fatura).
 * - Um cartão: o anel mostra quanto do limite a fatura usou e o centro
 *   mostra o valor da fatura; a lista mostra as categorias dela.
 */
export default function CardSpendingChart({ month, revision = 0, title = 'Despesas dos cartões', selectedCardId, onSelectCard }: Props) {
  const [ownSelected, setOwnSelected] = useState('all')
  const selected = selectedCardId ?? ownSelected
  const setSelected = (value: string) => {
    setOwnSelected(value)
    onSelectCard?.(value)
  }

  const data = useMemo(() => {
    void revision
    const cards = getCards()
    const purchases = getCardPurchases()
    const payments = getCardPayments()
    const invoices = getCardInvoices(purchases, cards)

    // No mês atual: a fatura "da vez" de cada cartão (a que ainda vai
    // vencer; depois do vencimento, passa para a seguinte)
    const now = new Date()
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    const followDue = month === today.slice(0, 7)

    const perCard = cards.map(card => {
      const invoiceMonth = followDue ? getCurrentInvoiceMonth(card, today) : month
      const invoice = invoices.find(item => item.cardId === card.id && item.invoiceMonth === invoiceMonth)
      const paid = payments.filter(item => item.cardId === card.id && item.invoiceMonth === invoiceMonth).reduce((sum, item) => sum + item.amount, 0)
      return { card, invoiceMonth, total: invoice?.total ?? 0, paid, installments: invoice?.installments ?? [] }
    })

    return { cards, perCard, purchases, followDue }
  }, [month, revision])

  const current = data.perCard.find(item => item.card.id === selected) ?? null
  const totalAll = data.perCard.reduce((sum, item) => sum + item.total, 0)

  const segments: DonutSegment[] = current
    ? current.total > 0
      ? [{ key: current.card.id, label: current.card.name, value: current.total, color: current.card.color ?? DEFAULT_COLOR }]
      : []
    : data.perCard
        .filter(item => item.total > 0)
        .map(item => ({ key: item.card.id, label: item.card.name, value: item.total, color: item.card.color ?? DEFAULT_COLOR, icon: 'credit-card' }))

  // Categorias da fatura do cartão escolhido
  const categories = useMemo(() => {
    if (!current) return []
    const map = new Map<string, { name: string; icon: string; color: string; value: number }>()
    for (const installment of current.installments) {
      const purchase = data.purchases.find(item => item.id === installment.purchaseId)
      const group = getMainCategory(purchase?.category ?? 'Outros')
      const entry = map.get(group.name) ?? { name: group.name, icon: group.icon, color: group.color, value: 0 }
      entry.value += installment.amount
      map.set(group.name, entry)
    }
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [current, data.purchases])

  const limit = current?.card.limit ?? 0
  const usage = current && limit > 0 ? (current.total / limit) * 100 : 0

  return (
    <section className="finance-chart-card pf-card-spending">
      <div className="pf-card-spending-heading">
        <div>
          <h3>{title}</h3>
          <p>{current ? `Fatura de ${monthName(current.invoiceMonth)}` : data.followDue ? 'Faturas a vencer de cada cartão' : `Faturas de ${monthName(month)}`}</p>
        </div>
        {data.cards.length > 0 && (
          <div className="pf-card-spending-select">
            <SelectField
              id={`card-spending-${title.length}`}
              value={selected}
              onChange={setSelected}
              options={[
                { value: 'all', label: 'Todos os cartões' },
                ...data.cards.map(card => ({ value: card.id, label: card.name })),
              ]}
              placeholder="Cartão"
            />
          </div>
        )}
      </div>

      {data.cards.length === 0 ? (
        <div className="chart-empty">
          <CardIcon size={28} />
          Cadastre um cartão em Cartões para ver este gráfico.
        </div>
      ) : (
        <>
          <div className="pf-chart-donut-wrap">
            <GlassDonut
              segments={segments}
              total={current ? Math.max(limit, current.total, 0.01) : undefined}
              formatValue={money}
              interactive={!current}
              ariaLabel={title}
              center={
                current ? (
                  <>
                    <small>{data.followDue ? 'Fatura a vencer' : 'Fatura do mês'}</small>
                    <strong>{money(current.total)}</strong>
                    <span>{formatPercent(usage)} do limite</span>
                  </>
                ) : (
                  <>
                    <small>Total das faturas</small>
                    <strong>{money(totalAll)}</strong>
                    <span>{segments.length} cartão(ões)</span>
                  </>
                )
              }
            />
          </div>

          <ul className="pf-donut-legend pf-chart-category-legend">
            {current
              ? categories.length === 0
                ? [<li key="empty" className="pf-card-spending-empty">Nenhuma compra nesta fatura.</li>]
                : categories.map(item => (
                    <li key={item.name} style={{ '--legend-color': item.color } as React.CSSProperties}>
                      <span className="pf-donut-legend-icon">
                        <CategoryIcon icon={item.icon} size={15} />
                      </span>
                      <span className="pf-donut-legend-name">{item.name}</span>
                      <span className="pf-donut-legend-percent">{formatPercent(current.total > 0 ? (item.value / current.total) * 100 : 0)}</span>
                      <span className="pf-donut-legend-value">{money(item.value)}</span>
                    </li>
                  ))
              : data.perCard.map(item => (
                  <li key={item.card.id} style={{ '--legend-color': item.card.color ?? DEFAULT_COLOR } as React.CSSProperties}>
                    <span className="pf-donut-legend-icon">
                      <CategoryIcon icon="credit-card" size={15} />
                    </span>
                    <span className="pf-donut-legend-name">{item.card.name}</span>
                    <span className="pf-donut-legend-percent">
                      {formatPercent(item.card.limit > 0 ? (item.total / item.card.limit) * 100 : 0)} do limite
                    </span>
                    <span className="pf-donut-legend-value">{money(item.total)}</span>
                  </li>
                ))}
          </ul>
        </>
      )}
    </section>
  )
}
