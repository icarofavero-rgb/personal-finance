
import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Area,
  ComposedChart,
} from 'recharts'

import {
  getMainCategory,
} from '../services/categories'

import {
  Utensils,
  House,
  CarFront,
  HeartPulse,
  Gamepad2,
  ShoppingBag,
  GraduationCap,
  Wallet,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react'

import type { Transaction } from '../services/storage'

type Props = {
  transactions: Transaction[]
  categoryTransactions?: Transaction[]
  categoryEndMonth?: string
}

type MonthlyCategory = {
  month: string
  [category: string]: string | number
}

const COLORS = [
  '#35D9FF',
  '#9B75FF',
  '#64E6A5',
  '#FFB86B',
  '#FF789A',
  '#7C91FF',
]

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  house: House,
  'car-front': CarFront,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  'graduation-cap': GraduationCap,
  wallet: Wallet,
  ellipsis: Ellipsis,
}

function CategoryIcon({
  category,
  size = 16,
}: {
  category: string
  size?: number
}) {
  const group = getMainCategory(category)
  const Icon = CATEGORY_ICONS[group.icon] ?? Ellipsis

  return (
    <Icon
      size={size}
      color={group.color}
      strokeWidth={2}
      aria-hidden="true"
    />
  )
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)


const formatMonth = (key: string) => {
  const [year, month] = key.split('-').map(Number)

  const monthName = new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')

  return `${monthName}/${String(year).slice(-2)}`
}


export default function FinancialComparisonCharts({
  transactions,
  categoryTransactions,
  categoryEndMonth,
}: Props) {
  const [isLightTheme, setIsLightTheme] = useState(
    () =>
      document.documentElement.dataset.pfTheme === 'light'
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightTheme(
        document.documentElement.dataset.pfTheme === 'light'
      )
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-pf-theme'],
    })

    return () => observer.disconnect()
  }, [])

  const axisColor = isLightTheme ? '#64748b' : '#8993a5'
  const gridColor = isLightTheme ? '#dbe3ef' : '#29303c'
  const tooltipBackground = isLightTheme
    ? '#ffffff'
    : '#1d222d'
  const tooltipText = isLightTheme ? '#172033' : '#f3f5fa'

  const comparisonData = useMemo(() => {
    const income = transactions
      .filter(item => item.type === 'income')
      .reduce((total, item) => total + item.amount, 0)

    const expenses = transactions
      .filter(item => item.type === 'expense')
      .reduce((total, item) => total + item.amount, 0)

    return [
      { name: 'Entradas', value: income, fill: '#64E6A5' },
      { name: 'Saídas', value: expenses, fill: '#9B75FF' },
    ]
  }, [transactions])


const { categoryData, categories } = useMemo(() => {
  const source = categoryTransactions ?? transactions

  const categoryTotals = new Map<string, number>()
  const monthlyMap = new Map<string, Record<string, number>>()

  source.forEach(item => {
    if (item.type !== 'expense') return

    const key = item.date.slice(0, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return

    const category = getMainCategory(
  item.category || 'Outros'
).name

    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + item.amount
    )

    const month = monthlyMap.get(key) ?? {}

    month[category] = (month[category] ?? 0) + item.amount
    monthlyMap.set(key, month)
  })

  const categories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)

  let monthKeys: string[]

  if (categoryEndMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(categoryEndMonth)) {
    const [year, month] = categoryEndMonth.split('-').map(Number)

    monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, month - 6 + index, 1)

      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
      ].join('-')
    })
  } else {
    monthKeys = [...monthlyMap.keys()].sort()
  }

  const categoryData: MonthlyCategory[] = monthKeys.map(key => {
    const values = monthlyMap.get(key) ?? {}

    const row: MonthlyCategory = {
      month: formatMonth(key),
    }

    categories.forEach(category => {
      row[category] = values[category] ?? 0
    })

    return row
  })

  return { categoryData, categories }
}, [transactions, categoryTransactions, categoryEndMonth])


  const tooltipStyle = {
    background: tooltipBackground,
    border: '1px solid rgba(155,117,255,0.45)',
    borderRadius: 12,
    color: tooltipText,
    boxShadow: isLightTheme
      ? '0 8px 30px rgba(23,32,51,0.12)'
      : '0 8px 30px rgba(0,0,0,0.35)',
  }

  const hasComparisonData = comparisonData.some(
    item => item.value > 0
  )

  return (
    <div className="financial-comparison-charts">
      <section className="finance-chart-card">
        <h3>Comparação de entradas e saídas</h3>
        <p>Distribuição dos valores no período selecionado</p>

        {!hasComparisonData ? (
          <div className="chart-empty">
            Nenhuma movimentação registrada.
          </div>
        ) : (
          <div className="financial-comparison-chart-container">
            <ResponsiveContainer width="100%" height="100%">
             <BarChart
  data={comparisonData}
  layout="vertical"
  margin={{
    top: 12,
    right: 8,
    bottom: 12,
    left: 0,
  }}
>
                
<defs>
  <linearGradient
    id="pf-income-bar-gradient"
    x1="0"
    y1="0"
    x2="1"
    y2="0"
  >
    <stop offset="0%" stopColor="#36C995" />
    <stop offset="100%" stopColor="#64E6A5" />
  </linearGradient>

  <linearGradient
    id="pf-expense-bar-gradient"
    x1="0"
    y1="0"
    x2="1"
    y2="0"
  >
    <stop offset="0%" stopColor="#7C5CFF" />
    <stop offset="100%" stopColor="#A78BFA" />
  </linearGradient>
</defs>
<CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={value =>
                    Number(value).toLocaleString('pt-BR', {
                      notation: 'compact',
                    })
                  }
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={65}
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 12 }}
                />

                <Tooltip
                  cursor={{ fill: 'rgba(155,117,255,0.07)' }}
                  formatter={value => money(Number(value))}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: tooltipText }}
                  labelStyle={{ color: tooltipText }}
                />

                
<Bar
  dataKey="value"
  name="Valor"
  radius={[0, 9, 9, 0]}
  maxBarSize={38}
  isAnimationActive
  shape={props => {
    const { x, y, width, height, payload } = props

    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={9}
        fill={
          payload.name === 'Entradas'
            ? 'url(#pf-income-bar-gradient)'
            : 'url(#pf-expense-bar-gradient)'
        }
      />
    )
  }}
/>

              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="finance-chart-card">
        <h3>Evolução das despesas por categoria</h3>
        <p>Evolução mensal das categorias com gradiente neon</p>

        {categories.length === 0 ? (
          <div className="chart-empty">
            Nenhuma despesa registrada.
          </div>
        ) : (
          <div className="financial-comparison-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
  data={categoryData}
  margin={{
    top: 15,
    right: 6,
    bottom: 8,
    left: -10,
  }}
>
                <defs>
                  {categories.map((category, index) => (
                    <linearGradient
                      key={category}
                      id={`category-neon-gradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={getMainCategory(category).color}
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="100%"
                        stopColor={getMainCategory(category).color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />

                <YAxis
                  stroke={axisColor}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  width={48}
                  tickFormatter={value =>
                    Number(value).toLocaleString('pt-BR', {
                      notation: 'compact',
                    })
                  }
                />

               
<Tooltip
  content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div
        style={{
  ...tooltipStyle,
  padding: 12,
  minWidth: 0,
  width: 'max-content',
  maxWidth: 'min(280px, calc(100vw - 40px))',
  boxSizing: 'border-box',
  overflowWrap: 'anywhere',
}}
      >
        <strong>{String(label ?? '')}</strong>

        {payload
  .filter(
    (entry, index, entries) =>
      entries.findIndex(
        item => item.dataKey === entry.dataKey
      ) === index
  )
  .map((entry, index) => {
          const category = String(entry.name ?? '')
          const group = getMainCategory(category)

          return (
            <div
              key={`${category}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                fontSize: 12,
              }}
            >
              <CategoryIcon category={category} />

              <span style={{ color: group.color }}>
                {category}
              </span>

              <strong style={{ marginLeft: 'auto' }}>
                {money(Number(entry.value ?? 0))}
              </strong>
            </div>
          )
        })}
      </div>
    )
  }}
/>
                

<Legend
  content={({ payload }) => {
    const uniqueCategories = [
      ...new Set(
        (payload ?? [])
          .map(entry => String(entry.value ?? ''))
          .filter(category => categories.includes(category))
      ),
    ]

    return (
      <div className="category-line-legend">
        {uniqueCategories.map(category => {
          const group = getMainCategory(category)

          return (
            <div
              className="category-line-legend-item"
              key={category}
            >
              <CategoryIcon category={category} />

              <span
                className="category-line-legend-dot"
                style={{ background: group.color }}
              />

              <span>{category}</span>
            </div>
          )
        })}
      </div>
    )
  }}
/>


                {categories.map((category, index) => (
                  <Area
                    key={`area-${category}`}
                    type="monotone"
                    dataKey={category}
                    stroke="none"
                    fill={`url(#category-neon-gradient-${index})`}
                    fillOpacity={1}
                    connectNulls
                    legendType="none"
                    tooltipType="none"
                    isAnimationActive
                  />
                ))}

                {categories.map((category, index) => (
                  
<Line
  key={`line-${category}`}
  type="monotone"
  dataKey={category}
  name={category}
  stroke={getMainCategory(category).color}
  strokeWidth={3}
  strokeLinecap="round"
  dot={false}
  activeDot={{
    r: 6,
    strokeWidth: 2,
    stroke: COLORS[index % COLORS.length],
    fill: isLightTheme ? '#ffffff' : '#1d222d',
  }}
  connectNulls
  isAnimationActive
  animationDuration={850}

style={{
  filter: `drop-shadow(0 0 4px ${
    getMainCategory(category).color
  }55)`,
}}

/>

                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
