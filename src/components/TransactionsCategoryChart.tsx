import { CATEGORY_GROUP_FILTER, matchesCategoryFilter } from '../services/categories'
import { useMemo } from 'react'
import { PieChart } from 'lucide-react'

import CategoryIcon from './CategoryIcon'
import GlassDonut, { formatPercent, type DonutSegment } from './GlassDonut'
import { getMainCategory, getTransactionVisual, INCOME_CATEGORY_META } from '../services/categories'
import type { Transaction } from '../services/storage'

type Props = {
  transactions: Transaction[]
  /** AAAA-MM ou '' (todos os meses) */
  month: string
  /** 'Todas' ou o valor exato da categoria filtrada */
  category: string
  /** 'Todos' | 'income' | 'expense' */
  type: string
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

function monthLabel(month: string): string {
  if (!month) return 'Todo o período'

  const [year, monthNumber] = month.split('-').map(Number)
  const text = new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Agrupa pela categoria principal (despesas) ou pela categoria (entradas). */
function groupOf(item: Transaction): { key: string; label: string; color: string; icon: string } {
  if (item.type === 'income') {
    const meta = INCOME_CATEGORY_META[item.category]
    return { key: item.category, label: item.category, color: meta?.color ?? '#64E6A5', icon: meta?.icon ?? 'wallet' }
  }

  const group = getMainCategory(item.category)
  return { key: group.name, label: group.name, color: group.color, icon: group.icon }
}

/**
 * Gráfico de rosca da página de Transações.
 * - "Todas": círculo completo com a % de cada categoria no período.
 * - Uma categoria: círculo incompleto com a % que ela representa,
 *   mostrada no meio.
 */
export default function TransactionsCategoryChart({ transactions, month, category, type }: Props) {
  const data = useMemo(() => {
    // Com uma categoria escolhida, o tipo vem dela (uma categoria de
    // entrada compara com as entradas; de saída, com as saídas).
    const categoryType =
      category !== 'Todas' ? transactions.find(item => matchesCategoryFilter(item.category, category))?.type : undefined

    const kind: 'income' | 'expense' =
      type === 'income' || type === 'expense' ? type : categoryType ?? 'expense'

    const base = transactions.filter(
      item => item.type === kind && (!month || item.date.startsWith(month))
    )

    const total = base.reduce((sum, item) => sum + item.amount, 0)

    if (category !== 'Todas') {
      const visual = getTransactionVisual(category.replace(CATEGORY_GROUP_FILTER, ''), kind)
      const value = base.filter(item => matchesCategoryFilter(item.category, category)).reduce((sum, item) => sum + item.amount, 0)

      return {
        kind,
        total,
        mode: 'single' as const,
        segments: [{ key: category, label: visual.label, value, color: visual.color, icon: visual.icon }],
      }
    }

    const groups = new Map<string, DonutSegment>()

    for (const item of base) {
      const group = groupOf(item)
      const current = groups.get(group.key)
      groups.set(group.key, {
        key: group.key,
        label: group.label,
        color: group.color,
        icon: group.icon,
        value: (current?.value ?? 0) + item.amount,
      })
    }

    return {
      kind,
      total,
      mode: 'all' as const,
      segments: [...groups.values()].sort((a, b) => b.value - a.value),
    }
  }, [transactions, month, category, type])

  const kindLabel = data.kind === 'income' ? 'entradas' : 'saídas'
  const single = data.mode === 'single' ? data.segments[0] : null
  const share = single && data.total > 0 ? (single.value / data.total) * 100 : 0

  return (
    <section className="panel pf-category-chart">
      {data.total <= 0 ? (
        <div className="pf-category-chart-empty" style={{ gridColumn: '1 / -1' }}>
          <PieChart size={30} />
          <p>Nenhuma {data.kind === 'income' ? 'entrada' : 'saída'} em {monthLabel(month).toLowerCase()}.</p>
        </div>
      ) : (
        <>
          <GlassDonut
            segments={data.segments}
            total={data.total}
            formatValue={money}
            interactive={data.mode === 'all'}
            ariaLabel={`Participação das categorias nas ${kindLabel}`}
            center={
              single ? (
                <>
                  {single.icon && (
                    <span className="pf-donut-center-icon" style={{ color: single.color }}>
                      <CategoryIcon icon={single.icon} size={18} />
                    </span>
                  )}
                  <strong>{formatPercent(share)}</strong>
                  <span>{single.label}</span>
                  <small>das {kindLabel}</small>
                </>
              ) : (
                <>
                  <small>Total de {kindLabel}</small>
                  <strong>{money(data.total)}</strong>
                  <span>{data.segments.length} categoria(s)</span>
                </>
              )
            }
          />

          <div className="pf-category-chart-info">
            <div>
              <h3>{single ? `${single.label} nas ${kindLabel}` : `Para onde foram as ${kindLabel}`}</h3>
              <p>{monthLabel(month)}</p>
            </div>

            {single ? (
              <ul className="pf-donut-legend">
                <li style={{ '--legend-color': single.color } as React.CSSProperties}>
                  <span className="pf-donut-legend-icon">
                    <CategoryIcon icon={single.icon} size={15} />
                  </span>
                  <span className="pf-donut-legend-name">{single.label}</span>
                  <span className="pf-donut-legend-percent">{formatPercent(share)}</span>
                  <span className="pf-donut-legend-value">{money(single.value)}</span>
                </li>
                <li style={{ '--legend-color': 'var(--pf-text-secondary, #8995aa)' } as React.CSSProperties}>
                  <span className="pf-donut-legend-icon">
                    <CategoryIcon icon="layers" size={15} />
                  </span>
                  <span className="pf-donut-legend-name">Demais categorias</span>
                  <span className="pf-donut-legend-percent">{formatPercent(Math.max(0, 100 - share))}</span>
                  <span className="pf-donut-legend-value">{money(Math.max(0, data.total - single.value))}</span>
                </li>
              </ul>
            ) : (
              <ul className="pf-donut-legend">
                {data.segments.map(segment => (
                  <li key={segment.key} style={{ '--legend-color': segment.color } as React.CSSProperties}>
                    <span className="pf-donut-legend-icon">
                      <CategoryIcon icon={segment.icon} size={15} />
                    </span>
                    <span className="pf-donut-legend-name">{segment.label}</span>
                    <span className="pf-donut-legend-percent">{formatPercent((segment.value / data.total) * 100)}</span>
                    <span className="pf-donut-legend-value">{money(segment.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
