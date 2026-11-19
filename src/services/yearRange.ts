/** Anos disponíveis nos seletores do app (de 2026 até 2040). */
export const MIN_YEAR = 2026
export const MAX_YEAR = 2040

export const YEAR_OPTIONS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => MIN_YEAR + index)

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))
}
