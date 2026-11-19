import { useId, useState, type ReactNode } from 'react'

import CategoryIcon from './CategoryIcon'
import '../styles/glass-donut.css'

export type DonutSegment = {
  key: string
  label: string
  value: number
  color: string
  icon?: string
}

type GlassDonutProps = {
  segments: DonutSegment[]
  /**
   * Total que representa o círculo inteiro. Se for maior que a soma dos
   * segmentos, o restante fica como "trilho" vazio (círculo incompleto).
   */
  total?: number
  formatValue: (value: number) => string
  /** Conteúdo do centro quando nada está selecionado */
  center?: ReactNode
  /** Permite tocar/passar o mouse nas fatias para ver os detalhes */
  interactive?: boolean
  ariaLabel: string
}

const SIZE = 200
const C = SIZE / 2
const RADIUS = 76
const STROKE = 24
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Espaço entre as cores (as pontas são arredondadas)
const GAP = 7

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  })}%`
}

/**
 * Gráfico de rosca em "vidro líquido": gradiente em cada fatia, brilho de
 * vidro por cima do anel, bordas iluminadas e um disco de vidro no centro.
 * Desenhado em SVG puro (leve no celular, sem biblioteca de gráficos).
 */
export default function GlassDonut({
  segments,
  total,
  formatValue,
  center,
  interactive = true,
  ariaLabel,
}: GlassDonutProps) {
  const id = useId().replace(/:/g, '')
  const [active, setActive] = useState<number | null>(null)

  const sum = segments.reduce((acc, item) => acc + item.value, 0)
  const whole = Math.max(total ?? sum, sum, 0.000001)
  const single = segments.length === 1
  const fullCircle = single && segments[0].value >= whole

  let offset = 0
  const arcs = segments.map((segment, index) => {
    const length = (segment.value / whole) * CIRCUMFERENCE
    // Ponta redonda avança meia espessura para cada lado: desconta isso
    // e o espaço, para cada cor ficar separada da outra
    const rounded = !(single && segment.value >= whole)
    const trim = rounded ? STROKE + (segments.length > 1 ? GAP : 0) : 0
    const dash = Math.max(0.001, length - trim)
    const arc = {
      segment,
      index,
      dash,
      offset: -(offset + (rounded ? (length - dash) / 2 : 0)),
      percent: (segment.value / whole) * 100,
    }
    offset += length
    return arc
  })

  const activeArc = active !== null ? arcs[active] : null

  return (
    <div
      className={`pf-donut ${activeArc ? 'has-active' : ''}`}
      style={{ '--donut-glow': activeArc?.segment.color ?? segments[0]?.color ?? '#8b5cf6' } as React.CSSProperties}
      onPointerLeave={() => setActive(null)}
    >
      <span className="pf-donut-glow" aria-hidden="true" />

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel}>
        <defs>
          {arcs.map(({ segment, index }) => (
            <linearGradient key={segment.key} id={`${id}-g${index}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${segment.color} 55%, #ffffff)` }} />
              <stop offset="55%" style={{ stopColor: segment.color }} />
              <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${segment.color} 75%, #000000)` }} />
            </linearGradient>
          ))}

          {/* Brilho de vidro: claro em cima, some no meio, reflexo embaixo */}
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.06" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
          </linearGradient>

          <radialGradient id={`${id}-disc`} cx="35%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Disco de vidro no centro */}
        <circle className="pf-donut-disc" cx={C} cy={C} r={RADIUS - STROKE / 2 - 9} fill={`url(#${id}-disc)`} />

        {/* Trilho (parte vazia do círculo) */}
        <circle className="pf-donut-track" cx={C} cy={C} r={RADIUS} strokeWidth={STROKE} fill="none" />

        <g transform={`rotate(-90 ${C} ${C})`}>
          {arcs.map(arc => (
            <circle
              key={arc.segment.key}
              className={`pf-donut-arc ${active === arc.index ? 'is-active' : ''}`}
              cx={C}
              cy={C}
              r={RADIUS}
              fill="none"
              stroke={`url(#${id}-g${arc.index})`}
              strokeWidth={STROKE}
              strokeLinecap={fullCircle ? 'butt' : 'round'}
              style={
                {
                  strokeDasharray: fullCircle
                    ? `${CIRCUMFERENCE} 0`
                    : `${arc.dash} ${CIRCUMFERENCE}`,
                  strokeDashoffset: arc.offset,
                  // Cor lisa usada no modo Clássico (sem degradê de vidro)
                  '--arc-color': arc.segment.color,
                  '--i': arc.index,
                  '--circ': CIRCUMFERENCE,
                } as React.CSSProperties
              }
              onPointerEnter={interactive ? () => setActive(arc.index) : undefined}
              onClick={interactive ? () => setActive(previous => (previous === arc.index ? null : arc.index)) : undefined}
            />
          ))}
        </g>

        {/* Camadas de vidro por cima do anel */}
        <circle className="pf-donut-sheen" cx={C} cy={C} r={RADIUS} strokeWidth={STROKE} fill="none" stroke={`url(#${id}-sheen)`} />
        <circle className="pf-donut-rim" cx={C} cy={C} r={RADIUS + STROKE / 2 - 0.6} fill="none" />
        <circle className="pf-donut-rim is-inner" cx={C} cy={C} r={RADIUS - STROKE / 2 + 0.6} fill="none" />
      </svg>

      <div className="pf-donut-center" aria-live="polite">
        {activeArc ? (
          <div key={activeArc.index} className="pf-donut-center-content">
            {activeArc.segment.icon && (
              <span className="pf-donut-center-icon" style={{ color: activeArc.segment.color }}>
                <CategoryIcon icon={activeArc.segment.icon} size={18} />
              </span>
            )}
            <strong>{formatPercent(activeArc.percent)}</strong>
            <span>{activeArc.segment.label}</span>
            <small>{formatValue(activeArc.segment.value)}</small>
          </div>
        ) : (
          <div className="pf-donut-center-content">{center}</div>
        )}
      </div>
    </div>
  )
}
