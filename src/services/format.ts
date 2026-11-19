/** Formata um número decimal no padrão brasileiro (ex.: 12.5 → "12,5"). */
export function formatDecimal(value: number, fractionDigits = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

/**
 * Números curtos para os eixos dos gráficos: 950 · 12 mil · 1,2 mi.
 * Assim valores grandes não ficam cortados na lateral do gráfico.
 */
export function formatAxisValue(value: number): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return number.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
}
