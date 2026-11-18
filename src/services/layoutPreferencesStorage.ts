/**
 * Preferências de layout: ordem das seções do menu principal e quais
 * páginas ficam na barra de baixo do celular.
 */

export const LAYOUT_STORAGE_KEY = 'personal-finance-layout-v1'
export const LAYOUT_CHANGED_EVENT = 'personal-finance-layout-changed'

/** Seções do menu principal, na ordem original. */
export const DEFAULT_MAIN_ORDER = [
  'Dashboard',
  'Transações',
  'Cartões',
  'Calendário',
  'Guardado',
  'Devedores',
  'Orçamentos',
  'Metas',
  'Relatórios',
]

/** Páginas que podem ir para a barra do celular (todas, menos "Configurações"). */
export const PHONE_TAB_CHOICES = [
  ...DEFAULT_MAIN_ORDER,
  'Sincronização',
  'Backup e restauração',
  'Central de ajuda',
]

/** Barra do celular: 2 botões antes do "+" e 1 depois (o "Mais" é fixo). */
export const PHONE_TAB_COUNT = 3
export const DEFAULT_PHONE_TABS = ['Dashboard', 'Transações', 'Cartões']

export type LayoutPreferences = {
  mainOrder: string[]
  phoneTabs: string[]
}

export function defaultLayout(): LayoutPreferences {
  return { mainOrder: [...DEFAULT_MAIN_ORDER], phoneTabs: [...DEFAULT_PHONE_TABS] }
}

/** Mantém só seções conhecidas, sem repetir, e devolve as que faltarem no fim. */
export function normalizeMainOrder(value: unknown): string[] {
  const list = Array.isArray(value) ? value : []
  const known = list.filter(
    (page, index): page is string =>
      typeof page === 'string' && DEFAULT_MAIN_ORDER.includes(page) && list.indexOf(page) === index
  )

  return [...known, ...DEFAULT_MAIN_ORDER.filter(page => !known.includes(page))]
}

/** Sempre 3 páginas válidas e diferentes; completa com as padrão. */
export function normalizePhoneTabs(value: unknown): string[] {
  const list = Array.isArray(value) ? value : []
  const tabs = list
    .filter(
      (page, index): page is string =>
        typeof page === 'string' && PHONE_TAB_CHOICES.includes(page) && list.indexOf(page) === index
    )
    .slice(0, PHONE_TAB_COUNT)

  for (const fallback of [...DEFAULT_PHONE_TABS, ...PHONE_TAB_CHOICES]) {
    if (tabs.length >= PHONE_TAB_COUNT) break
    if (!tabs.includes(fallback)) tabs.push(fallback)
  }

  return tabs
}

export function getLayoutPreferences(): LayoutPreferences {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return defaultLayout()

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return defaultLayout()

    const data = parsed as Record<string, unknown>
    return {
      mainOrder: normalizeMainOrder(data.mainOrder),
      phoneTabs: normalizePhoneTabs(data.phoneTabs),
    }
  } catch {
    return defaultLayout()
  }
}

export function saveLayoutPreferences(preferences: LayoutPreferences): void {
  const clean = {
    mainOrder: normalizeMainOrder(preferences.mainOrder),
    phoneTabs: normalizePhoneTabs(preferences.phoneTabs),
  }

  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(clean))
  window.dispatchEvent(new Event(LAYOUT_CHANGED_EVENT))
}

/** Move um item da lista de `from` para `to` (usado nas setas da tela). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list

  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Coloca `page` no espaço `slot` da barra. Se ela já estiver em outro
 * espaço, os dois trocam de lugar (nunca fica repetida).
 */
export function assignPhoneTab(tabs: string[], slot: number, page: string): string[] {
  const next = [...tabs]
  const current = next.indexOf(page)

  if (current === slot) return next
  if (current >= 0) next[current] = next[slot]
  next[slot] = page
  return next
}
