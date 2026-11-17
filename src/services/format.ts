/** Formata um número decimal no padrão brasileiro (ex.: 12.5 → "12,5"). */
export function formatDecimal(value: number, fractionDigits = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}
