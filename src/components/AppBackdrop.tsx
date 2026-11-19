import { useEffect, useState } from 'react'

/** Acompanha um atributo do <html> (estilo visual e fundo escolhido). */
function useRootAttribute(name: string, fallback: string): string {
  const [value, setValue] = useState(() => document.documentElement.getAttribute(name) ?? fallback)

  useEffect(() => {
    const observer = new MutationObserver(() => setValue(document.documentElement.getAttribute(name) ?? fallback))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [name] })
    return () => observer.disconnect()
  }, [name, fallback])

  return value
}

const ORNAMENTS = ['#ef4444', '#facc15', '#38bdf8', '#f472b6', '#22c55e']

/** Festões de Natal (parados): guirlanda com laços e bolinhas. */
function ChristmasGarland() {
  const swags = 6
  const width = 1440 / swags

  return (
    <svg className="pf-garland" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="pf-garland-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
      </defs>
      {Array.from({ length: swags }, (_, index) => {
        const x0 = index * width
        const x1 = x0 + width
        const mid = x0 + width / 2
        return (
          <g key={index}>
            {/* folhagem: duas curvas grossas sobrepostas */}
            <path d={`M${x0} 8 Q ${mid} 92 ${x1} 8`} fill="none" stroke="url(#pf-garland-green)" strokeWidth="16" strokeLinecap="round" />
            <path d={`M${x0} 8 Q ${mid} 86 ${x1} 8`} fill="none" stroke="#166534" strokeWidth="6" strokeDasharray="3 9" strokeLinecap="round" opacity="0.8" />
            {/* bolinhas penduradas */}
            {[0.3, 0.5, 0.7].map((t, bead) => {
              const x = x0 + width * t
              const y = 8 + (1 - Math.pow(2 * t - 1, 2)) * 42 + 10
              return <circle key={bead} cx={x} cy={y} r="7" fill={ORNAMENTS[(index + bead) % ORNAMENTS.length]} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
            })}
            {/* laço vermelho no ponto de apoio */}
            <g transform={`translate(${x0} 10)`}>
              <path d="M0 0 L-16 -9 L-16 9 Z M0 0 L16 -9 L16 9 Z" fill="#dc2626" />
              <circle r="5" fill="#b91c1c" />
            </g>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Fundo da tela — sempre PARADO (nada se mexe: mais leve e não esquenta
 * o celular), nas cores do estilo e da cor de destaque escolhida.
 *
 * - "Do estilo": ondas de luz do Liquid Glass / Neon; no Natal, céu
 *   noturno com festões decorados.
 * - Fundos abstratos (Aurora, Malha, Ondas, Geométrico, Linhas, Pontos,
 *   Anéis): escolhidos em Configurações → Aparência.
 */
export default function AppBackdrop() {
  const style = useRootAttribute('data-pf-style', 'classic')
  const pattern = useRootAttribute('data-pf-bg', 'style')
  const christmas = style === 'christmas'

  return (
    <>
      <div className="pf-backdrop" data-pattern={pattern} aria-hidden="true">
        {pattern === 'style' && (
          <>
            <span className="pf-blob pf-blob-1" />
            <span className="pf-blob pf-blob-2" />
            <span className="pf-blob pf-blob-3" />
            <span className="pf-blob pf-blob-4" />

            <svg className="pf-waves" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="pf-wave-a" x1="0" y1="0" x2="1" y2="0.3">
                  <stop offset="0" style={{ stopColor: 'var(--pf-wave-1)' }} stopOpacity="0" />
                  <stop offset="0.45" style={{ stopColor: 'var(--pf-wave-1)' }} />
                  <stop offset="1" style={{ stopColor: 'var(--pf-wave-3)' }} />
                </linearGradient>
                <linearGradient id="pf-wave-b" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: 'var(--pf-wave-2)' }} />
                  <stop offset="0.6" style={{ stopColor: 'var(--pf-wave-3)' }} />
                  <stop offset="1" style={{ stopColor: 'var(--pf-wave-2)' }} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pf-wave-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: 'var(--pf-wave-line)' }} stopOpacity="0" />
                  <stop offset="0.5" style={{ stopColor: 'var(--pf-wave-line)' }} />
                  <stop offset="1" style={{ stopColor: 'var(--pf-wave-line)' }} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M-120 640 C 180 520 420 780 760 650 S 1260 420 1580 560 L 1580 760 C 1260 600 980 860 700 800 S 180 690 -120 800 Z" fill="url(#pf-wave-a)" />
              <path d="M-120 230 C 220 110 520 360 860 250 S 1320 60 1580 170 L 1580 300 C 1300 200 1020 420 760 380 S 200 250 -120 360 Z" fill="url(#pf-wave-b)" />
              <path d="M-120 700 C 180 590 420 840 760 715 S 1260 480 1580 620" fill="none" stroke="url(#pf-wave-line)" strokeWidth="2.5" />
              <path d="M-120 300 C 220 180 520 430 860 320 S 1320 130 1580 240" fill="none" stroke="url(#pf-wave-line)" strokeWidth="1.6" opacity="0.7" />
            </svg>
          </>
        )}

        {pattern === 'waves' && (
          <svg className="pf-bgp-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            {[0, 1, 2, 3, 4].map(index => (
              <path
                key={index}
                d={`M-100 ${520 + index * 70} C 260 ${420 + index * 60} 560 ${700 + index * 40} 900 ${560 + index * 55} S 1380 ${420 + index * 50} 1560 ${520 + index * 60} L 1560 1000 L -100 1000 Z`}
                fill={`rgba(var(--pf-accent-rgb), ${0.07 + index * 0.03})`}
              />
            ))}
          </svg>
        )}

        {pattern === 'geometric' && (
          <svg className="pf-bgp-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            {[
              'M0 0 L520 0 L260 380 Z',
              'M1440 0 L1440 420 L980 140 Z',
              'M1440 900 L860 900 L1180 520 Z',
              'M0 900 L0 500 L420 760 Z',
              'M620 260 L900 120 L860 470 Z',
              'M300 520 L560 600 L380 820 Z',
            ].map((d, index) => (
              <path key={index} d={d} fill={`rgba(var(--pf-accent-rgb), ${0.05 + (index % 3) * 0.04})`} stroke="rgba(var(--pf-accent-rgb), 0.25)" strokeWidth="1.5" />
            ))}
          </svg>
        )}

        {pattern === 'lines' && (
          <svg className="pf-bgp-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 16 }, (_, index) => (
              <path
                key={index}
                d={`M-100 ${120 + index * 48} C 400 ${20 + index * 52} 900 ${320 + index * 40} 1560 ${140 + index * 50}`}
                fill="none"
                stroke={`rgba(var(--pf-accent-rgb), ${0.08 + (index % 4) * 0.035})`}
                strokeWidth={index % 4 === 0 ? 2.4 : 1.2}
              />
            ))}
          </svg>
        )}

        {pattern === 'rings' && (
          <svg className="pf-bgp-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 9 }, (_, index) => (
              <circle key={`a${index}`} cx="1260" cy="120" r={90 + index * 85} fill="none" stroke={`rgba(var(--pf-accent-rgb), ${0.2 - index * 0.018})`} strokeWidth="1.6" />
            ))}
            {Array.from({ length: 6 }, (_, index) => (
              <circle key={`b${index}`} cx="120" cy="860" r={70 + index * 80} fill="none" stroke={`rgba(var(--pf-accent-rgb), ${0.16 - index * 0.02})`} strokeWidth="1.4" />
            ))}
          </svg>
        )}
      </div>

      {christmas && pattern === 'style' && <ChristmasGarland />}
    </>
  )
}
