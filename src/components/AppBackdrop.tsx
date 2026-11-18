import { useEffect, useState } from 'react'

/** Acompanha o estilo visual atual (atributo data-pf-style do <html>). */
function useVisualStyle(): string {
  const [style, setStyle] = useState(
    () => document.documentElement.getAttribute('data-pf-style') ?? 'classic'
  )

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setStyle(document.documentElement.getAttribute('data-pf-style') ?? 'classic')
    )

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pf-style'] })
    return () => observer.disconnect()
  }, [])

  return style
}

// Flocos com tamanhos, posições e velocidades variados (valores fixos:
// o resultado é o mesmo a cada abertura e não pesa no carregamento).
const SNOWFLAKES = Array.from({ length: 26 }, (_, index) => ({
  left: (index * 37) % 100,
  size: 3 + ((index * 7) % 5),
  duration: 10 + ((index * 13) % 12),
  delay: -((index * 29) % 20),
  drift: ((index % 2 === 0 ? 1 : -1) * (12 + ((index * 11) % 26))),
  opacity: 0.45 + ((index * 17) % 50) / 100,
}))

const LIGHT_COLORS = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#f472b6']

// Show de luzes do Neon: focos que acendem e desvanecem em lugares e
// tempos diferentes (a cor de destaque escolhida participa do show).
const ACCENT = 'rgba(var(--pf-accent-rgb), 0.9)'

const LIGHTS = [
  { x: 12, y: 18, color: ACCENT, duration: 11, delay: 0 },
  { x: 78, y: 12, color: 'rgba(236, 72, 153, 0.85)', duration: 13, delay: -4 },
  { x: 55, y: 62, color: 'rgba(34, 211, 238, 0.8)', duration: 12, delay: -8 },
  { x: 22, y: 78, color: 'rgba(168, 85, 247, 0.85)', duration: 15, delay: -2 },
  { x: 88, y: 70, color: ACCENT, duration: 14, delay: -10 },
  { x: 40, y: 30, color: 'rgba(59, 130, 246, 0.8)', duration: 16, delay: -6 },
]

// Fachos de luz, como em um palco, varrendo devagar.
const BEAMS = [
  { x: 18, color: ACCENT, from: -28, to: 18, duration: 14, delay: 0 },
  { x: 62, color: 'rgba(236, 72, 153, 0.8)', from: 24, to: -16, duration: 17, delay: -6 },
  { x: 86, color: 'rgba(34, 211, 238, 0.75)', from: -12, to: 26, duration: 19, delay: -11 },
]

/**
 * Fundo dos estilos de vidro e do tema de Natal.
 *
 * - Neon Liquid Glass: luzes coloridas e ondas que se movem devagar.
 * - Liquid Glass (iPhone): gradiente prateado com ondas de luz paradas.
 * - Natal: noite estrelada, neve caindo e pisca-pisca no topo.
 * - Clássico: nada é exibido.
 *
 * Tudo usa só transform/opacity (rápido na placa de vídeo) e pausa
 * enquanto a tela rola (atributo data-pf-busy).
 */
export default function AppBackdrop() {
  const style = useVisualStyle()
  const christmas = style === 'christmas'

  return (
    <>
      <div className="pf-backdrop" aria-hidden="true">
        <span className="pf-blob pf-blob-1" />
        <span className="pf-blob pf-blob-2" />
        <span className="pf-blob pf-blob-3" />
        <span className="pf-blob pf-blob-4" />

        {/* Neon: show de luzes que acendem, brilham e desvanecem */}
        {style === 'neon-glass' && (
          <div className="pf-lightshow">
            {LIGHTS.map((light, index) => (
              <span
                key={`light-${index}`}
                className="pf-light"
                style={
                  {
                    left: `${light.x}%`,
                    top: `${light.y}%`,
                    '--light': light.color,
                    animationDuration: `${light.duration}s`,
                    animationDelay: `${light.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
            {BEAMS.map((beam, index) => (
              <span
                key={`beam-${index}`}
                className="pf-beam"
                style={
                  {
                    left: `${beam.x}%`,
                    '--light': beam.color,
                    '--from': `${beam.from}deg`,
                    '--to': `${beam.to}deg`,
                    animationDuration: `${beam.duration}s`,
                    animationDelay: `${beam.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

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

          {/* Faixa larga de luz */}
          <path
            d="M-120 640 C 180 520 420 780 760 650 S 1260 420 1580 560 L 1580 760 C 1260 600 980 860 700 800 S 180 690 -120 800 Z"
            fill="url(#pf-wave-a)"
          />
          {/* Faixa superior */}
          <path
            d="M-120 230 C 220 110 520 360 860 250 S 1320 60 1580 170 L 1580 300 C 1300 200 1020 420 760 380 S 200 250 -120 360 Z"
            fill="url(#pf-wave-b)"
          />
          {/* Riscos de luz (imitam o brilho do vidro) */}
          <path
            d="M-120 700 C 180 590 420 840 760 715 S 1260 480 1580 620"
            fill="none"
            stroke="url(#pf-wave-line)"
            strokeWidth="2.5"
          />
          <path
            d="M-120 300 C 220 180 520 430 860 320 S 1320 130 1580 240"
            fill="none"
            stroke="url(#pf-wave-line)"
            strokeWidth="1.6"
            opacity="0.7"
          />
        </svg>

        <span className="pf-backdrop-sheen" />

        {christmas && (
          <div className="pf-snow">
            {SNOWFLAKES.map((flake, index) => (
              <span
                key={index}
                className="pf-snowflake"
                style={
                  {
                    left: `${flake.left}%`,
                    width: flake.size,
                    height: flake.size,
                    opacity: flake.opacity,
                    animationDuration: `${flake.duration}s`,
                    animationDelay: `${flake.delay}s`,
                    '--drift': `${flake.drift}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>

      {christmas && (
        <div className="pf-xmas-lights" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <span
              key={index}
              className="pf-xmas-light"
              style={
                {
                  '--bulb': LIGHT_COLORS[index % LIGHT_COLORS.length],
                  animationDelay: `${-((index * 0.37) % 2.4)}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
