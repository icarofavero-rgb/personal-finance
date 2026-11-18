import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'

import CategoryIcon from './CategoryIcon'
import { buildMonthInsights } from '../services/monthInsights'
import type { Transaction } from '../services/storage'

type Props = {
  transactions: Transaction[]
  month: string
}

/** "Destaques do mês": comparativos automáticos com o mês anterior. */
export default function MonthInsights({ transactions, month }: Props) {
  const insights = useMemo(() => buildMonthInsights(transactions, month), [transactions, month])

  if (insights.length === 0) return null

  return (
    <section className="panel pf-insights" aria-label="Destaques do mês">
      <div className="pf-insights-heading">
        <span className="pf-insights-badge">
          <Sparkles size={18} />
        </span>
        <div>
          <h3>Destaques do mês</h3>
          <p>Comparação automática com o mês anterior</p>
        </div>
      </div>

      <ul className="pf-insights-list">
        {insights.map((insight, index) => (
          <li key={insight.id} className={`pf-insight is-${insight.tone}`} style={{ '--i': index } as React.CSSProperties}>
            <span className="pf-insight-icon">
              <CategoryIcon icon={insight.icon} size={18} />
            </span>
            <span className="pf-insight-text">
              <strong>{insight.title}</strong>
              <small>{insight.detail}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
