import { useEffect, useId, useState } from 'react'
import { chartAnimation } from './chartMotion'
import GlassDonut from './GlassDonut'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
} from 'lucide-react'

import type { Transaction } from '../services/storage'

import type {
  FinancialProjectionMonth,
} from '../services/financialProjection'

type Props = {
  transactions: Transaction[]
  projection?: FinancialProjectionMonth[]
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const CATEGORY_ICONS = {
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

/** Cores das barras: [topo, base] */
const BAR_GRADIENTS: Record<string, [string, string]> = {
  income: ['#67e8f9', '#38bdf8'],
  expense: ['#c4b5fd', '#8b5cf6'],
  paid: ['#6ee7b7', '#36c995'],
  pending: ['#fcd34d', '#f0b85d'],
}

function FinanceCharts({
  transactions,
  projection,
}: Props) {
  // Ids únicos: o gráfico aparece no Dashboard e nos Relatórios.
  const gradientId = `pf-bars-${useId().replace(/:/g, '')}`


const [isLightTheme, setIsLightTheme] = useState(
  () => document.documentElement.dataset.pfTheme === 'light'
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
const gridColor = isLightTheme ? '#cbd5e1' : '#29303c'
const tooltipBackground = isLightTheme ? '#ffffff' : '#1d222d'
const tooltipText = isLightTheme ? '#172033' : '#f3f5fa'
const tooltipTitle = isLightTheme ? '#6d28d9' : '#c4a5ff'

const categoryMap = new Map<string, number>()

transactions.forEach(item => {
  if (item.type !== 'expense') return

  const group = getMainCategory(item.category)

  categoryMap.set(
    group.name,
    (categoryMap.get(group.name) ?? 0) + item.amount
  )
})


  const monthlyMap = new Map<string, {
  key: string
  entradas: number
  saidas: number
  faturas: number
}>()

transactions.forEach(item => {
  const key = item.date.slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(key)) return

  const month = monthlyMap.get(key) ?? {
    key,
    entradas: 0,
    saidas: 0,
    faturas: 0,
  }

  if (item.type === 'income') {
    month.entradas += item.amount
  } else {
    month.saidas += item.amount
  }

  monthlyMap.set(key, month)
})

const monthlyData = projection ?? [...monthlyMap.values()]
  .sort((a, b) => a.key.localeCompare(b.key))
  .map(item => {
    const [year, month] = item.key.split('-').map(Number)

    return {
      ...item,
      name: new Date(year, month - 1, 1)
        .toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
        }),
    }
  })

  const categoryData = [...categoryMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

const totalCategoryExpenses = categoryData.reduce(
  (total, item) => total + item.value,
  0
)

  return (
    <div className="finance-charts">
      <section className="finance-chart-card">
        <h3>Fluxo financeiro projetado</h3>
         <p>Mês atual e próximos 5 meses — valores cadastrados</p>

        {monthlyData.length === 0 ? (
          <div className="chart-empty">
            Cadastre transações para visualizar o gráfico.
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
  data={monthlyData}
  margin={{
    top: 10,
    right: 4,
    left: -12,
    bottom: 8,
  }}
>
                {/* Gradientes "de vidro": cor viva no topo, mais transparente na base */}
                <defs>
                  {Object.entries(BAR_GRADIENTS).map(([key, [top, bottom]]) => (
                    <linearGradient key={key} id={`${gradientId}-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={top} stopOpacity={1} />
                      <stop offset="100%" stopColor={bottom} stopOpacity={0.55} />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid
  stroke={gridColor}
  strokeDasharray="3 3"
  vertical={false}
/>
                
<XAxis
  dataKey="name"
  stroke={axisColor}
  tick={{ fontSize: 11, fill: axisColor }}
/>

<YAxis
  stroke={axisColor}
  tick={{ fontSize: 11, fill: axisColor }}
  width={55}
/>

                

<Tooltip
  cursor={{
    fill: 'rgba(167, 139, 250, 0.07)',
  }}
  formatter={(value) => money(Number(value))}
  contentStyle={{
    background: tooltipBackground,
    border: '1px solid #A78BFA',
    borderRadius: 12,
    color: tooltipText,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
  }}
  labelStyle={{
  color: tooltipTitle,
  fontWeight: 600,
}}
  content={({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    const month = projection?.find(
      item => item.name === String(label)
    )

    
return (
  <div
    style={{
      background: tooltipBackground,
      border: '1px solid #A78BFA',
      borderRadius: 12,
      padding: 14,
      color: tooltipText,
      boxShadow: isLightTheme
        ? '0 8px 30px rgba(23, 32, 51, 0.16)'
        : '0 8px 30px rgba(0, 0, 0, 0.35)',
    }}
  >

        <strong style={{ color: tooltipTitle }}>
          {String(label)}
        </strong>

        
{payload.map((entry, index) => (
  <div
    key={`${String(entry.dataKey)}-${index}`}
    style={{
      marginTop: 8,
      color: tooltipText,
      fontSize: 12,
    }}
  >
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        marginRight: 7,
        borderRadius: 3,
        background: String(entry.color ?? '#A78BFA'),
      }}
    />

    {String(entry.name)}: {money(Number(entry.value ?? 0))}
  </div>
))}


        {month && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: isLightTheme
  ? '1px solid #cbd5e1'
  : '1px solid #343C4B',
              fontWeight: 700,
            }}
          >
            Total das faturas: {money(month.faturas)}
          </div>
        )}
      </div>
    )
  }}
/>


<Legend />

{projection ? (
  <>
    <Bar {...chartAnimation}
      dataKey="entradas"
      name="Receitas cadastradas"
      fill={`url(#${gradientId}-income)`}
      radius={[8, 8, 0, 0]}
    />

    <Bar {...chartAnimation}
      dataKey="saidas"
      name="Outras despesas"
      fill={`url(#${gradientId}-expense)`}
      radius={[8, 8, 0, 0]}
    />

    <Bar {...chartAnimation}
      dataKey="faturasPagas"
      name="Faturas pagas"
      stackId="faturas"
      fill={`url(#${gradientId}-paid)`}
    />

    <Bar {...chartAnimation}
      dataKey="faturasPendentes"
      name="Faturas pendentes"
      stackId="faturas"
      fill={`url(#${gradientId}-pending)`}
      radius={[8, 8, 0, 0]}
    />
  </>
) : (
  <>
    <Bar {...chartAnimation}
      dataKey="entradas"
      name="Entradas"
      fill={`url(#${gradientId}-paid)`}
      radius={[8, 8, 0, 0]}
    />

    <Bar {...chartAnimation}
      dataKey="saidas"
      name="Saídas"
      fill={`url(#${gradientId}-expense)`}
      radius={[8, 8, 0, 0]}
    />
  </>
)}

</BarChart>
</ResponsiveContainer>

          </div>
        )}
      </section>

      <section className="finance-chart-card">
        <h3>Despesas por categoria</h3>
        <p>Distribuição das suas saídas</p>

        {categoryData.length === 0 ? (
          <div className="chart-empty">
            Nenhuma despesa registrada.
          </div>
        ) : (
          <>
            <div className="pf-chart-donut-wrap">
              <GlassDonut
                segments={categoryData.map(item => {
                  const group = getMainCategory(item.name)
                  return {
                    key: item.name,
                    label: item.name,
                    value: item.value,
                    color: group.color,
                    icon: group.icon,
                  }
                })}
                formatValue={money}
                ariaLabel="Despesas por categoria"
                center={
                  <>
                    <small>Total de saídas</small>
                    <strong>{money(totalCategoryExpenses)}</strong>
                    <span>Toque numa fatia</span>
                  </>
                }
              />
            </div>

         
<div className="category-legend">
  {categoryData.map(item => {
    const group = getMainCategory(item.name)
    const Icon = CATEGORY_ICONS[
      group.icon as keyof typeof CATEGORY_ICONS
    ] ?? Ellipsis

    return (
      <div className="category-row" key={item.name}>
        <span
          className="category-color"
          style={{ background: group.color }}
        />

        <Icon
          size={15}
          color={group.color}
          aria-hidden="true"
        />

        <span>{item.name}</span>

        <strong>{money(item.value)}</strong>
      </div>
    )
  })}
</div>

          </>
        )}
      </section>
    </div>
  )
}


export { FinanceCharts }
