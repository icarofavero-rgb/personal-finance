/**
 * Animação dos gráficos (biblioteca recharts).
 *
 * A animação de "crescer" das barras/linhas da recharts é feita quadro a
 * quadro pelo processador. Em telas de toque (celular/tablet) isso
 * disputava o processador com a troca de páginas e causava travadas; lá
 * os gráficos aparecem com um esmaecer leve (feito pela placa de vídeo,
 * via CSS) em vez dessa animação.
 */

const isTouch =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

const reduceMotion =
  typeof document !== 'undefined' &&
  (document.documentElement.getAttribute('data-pf-animations') !== 'normal' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

export const chartAnimation = {
  isAnimationActive: !isTouch && !reduceMotion,
  animationDuration: 700,
} as const
