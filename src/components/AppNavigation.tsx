import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import {
  ArrowLeftRight,
  CalendarDays,
  PiggyBank,
  ChartNoAxesCombined,
  CreditCard,
  DatabaseBackup,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Target,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'

import type { DeviceClass } from '../hooks/useDeviceClass'
import { Capacitor } from '@capacitor/core'
import { exitApp } from '../services/appExit'

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>

type NavItem = {
  page: string
  label: string
  shortLabel?: string
  icon: IconType
}

export const MAIN_NAV: NavItem[] = [
  { page: 'Dashboard', label: 'Dashboard', shortLabel: 'Início', icon: LayoutDashboard },
  { page: 'Transações', label: 'Transações', icon: ArrowLeftRight },
  { page: 'Cartões', label: 'Cartões', icon: CreditCard },
  { page: 'Calendário', label: 'Calendário', icon: CalendarDays },
  { page: 'Guardado', label: 'Guardado', icon: PiggyBank },
  { page: 'Devedores', label: 'Devedores', icon: UsersRound },
  { page: 'Orçamentos', label: 'Orçamentos', icon: Wallet },
  { page: 'Metas', label: 'Metas', icon: Target },
  { page: 'Relatórios', label: 'Relatórios', icon: ChartNoAxesCombined },
]

export const SECONDARY_NAV: NavItem[] = [
  { page: 'Sincronização', label: 'Sincronização', shortLabel: 'Sincronizar', icon: RefreshCw },
  { page: 'Backup e restauração', label: 'Backup', icon: DatabaseBackup },
  { page: 'Central de ajuda', label: 'Central de ajuda', shortLabel: 'Ajuda', icon: LifeBuoy },
  { page: 'Configurações', label: 'Configurações', shortLabel: 'Ajustes', icon: SettingsIcon },
]

/** Tablet deitado (paisagem): mais largo que alto. */
function useLandscape(): boolean {
  const [landscape, setLandscape] = useState(() => window.innerWidth > window.innerHeight)

  useEffect(() => {
    const update = () => setLandscape(window.innerWidth > window.innerHeight)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return landscape
}

/** Ordem de todas as páginas — usada para saber a direção da transição. */
export const PAGE_ORDER = [...MAIN_NAV, ...SECONDARY_NAV].map(item => item.page)

/** No celular, estas ficam na barra; o resto vai para "Mais". */
const PHONE_TABS = ['Dashboard', 'Transações', 'Cartões']

type AppNavigationProps = {
  device: DeviceClass
  activePage: string
  onNavigate: (page: string) => void
  onNewTransaction: () => void
  profileName: string
  profileAvatar: ReactNode
  profileBackground: string
}

/** Pílula que desliza até o item ativo. */
function useIndicator(
  containerRef: React.RefObject<HTMLElement | null>,
  activeKey: string | null,
  axis: 'x' | 'y'
) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 })

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const active = activeKey
      ? container.querySelector<HTMLElement>(`[data-nav-key="${CSS.escape(activeKey)}"]`)
      : null

    if (!active) {
      setStyle(previous => ({ ...previous, opacity: 0 }))
      return
    }

    // Posição relativa ao contêiner, medida na tela (não depende de qual
    // elemento o navegador considera "pai" para o offsetLeft/offsetTop).
    const box = container.getBoundingClientRect()
    const item = active.getBoundingClientRect()

    setStyle(
      axis === 'y'
        ? {
            opacity: 1,
            transform: `translateY(${item.top - box.top + container.scrollTop - container.clientTop}px)`,
            height: item.height,
          }
        : {
            opacity: 1,
            transform: `translateX(${item.left - box.left - container.clientLeft}px)`,
            width: item.width,
          }
    )
  }, [containerRef, activeKey, axis])

  useLayoutEffect(measure, [measure])

  // Mede de novo sempre que o tamanho da barra mudar (rotação, fontes
  // carregando, o WebView do Android ajustando a largura no início...).
  useEffect(() => {
    const container = containerRef.current
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    if (container && observer) {
      observer.observe(container)
      container.querySelectorAll('[data-nav-key]').forEach(item => observer.observe(item))
    }

    window.addEventListener('resize', schedule)
    void document.fonts?.ready.then(schedule)

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [containerRef, measure])

  return style
}

function NavButton({
  item,
  active,
  compact,
  onClick,
}: {
  item: NavItem
  active: boolean
  compact: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  const label = compact ? item.shortLabel ?? item.label : item.label

  return (
    <button
      type="button"
      className={`pf-nav-item ${active ? 'is-active' : ''}`}
      data-nav-key={item.page}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={item.label}
    >
      <span className="pf-nav-icon">
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="pf-nav-label">{label}</span>
    </button>
  )
}

/** Computador (menu completo) e tablet (trilho compacto). */
function SideNavigation({
  device,
  activePage,
  onNavigate,
  onNewTransaction,
  profileName,
  profileAvatar,
  profileBackground,
}: AppNavigationProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const compact = device === 'tablet'
  const landscape = useLandscape()

  // Computador (e tablet deitado): Configurações sai do menu lateral e
  // fica só no botão do perfil, lá embaixo. Celular e tablet em pé mantêm.
  const showSettings = device === 'tablet' && !landscape
  const secondaryItems = SECONDARY_NAV.filter(item => item.page !== 'Configurações' || showSettings)

  // Com Configurações aberta pelo perfil, a pílula some do menu.
  const indicator = useIndicator(
    listRef,
    activePage === 'Configurações' && !showSettings ? null : activePage,
    'y'
  )

  return (
    <aside className={`pf-sidenav ${compact ? 'is-rail' : ''}`} aria-label="Navegação principal">
      <div className="pf-sidenav-brand">
        <div className="pf-sidenav-logo">
          <Wallet size={22} />
        </div>
        {!compact && (
          <span>
            personal<span className="brand-light">finance</span>
          </span>
        )}
      </div>

      <button
        type="button"
        className="pf-sidenav-new"
        onClick={onNewTransaction}
        title="Nova transação"
      >
        <Plus size={20} />
        <span className="pf-nav-label">{compact ? 'Nova' : 'Nova transação'}</span>
      </button>

      <div className="pf-sidenav-list" ref={listRef}>
        <span className="pf-nav-indicator" style={indicator} aria-hidden="true" />

        {!compact && <span className="pf-sidenav-section">Menu principal</span>}
        {MAIN_NAV.map(item => (
          <NavButton
            key={item.page}
            item={item}
            compact={compact}
            active={activePage === item.page}
            onClick={() => onNavigate(item.page)}
          />
        ))}

        {!compact && <span className="pf-sidenav-section">Seus dados</span>}
        {compact && <span className="pf-sidenav-divider" aria-hidden="true" />}
        {secondaryItems.map(item => (
          <NavButton
            key={item.page}
            item={item}
            compact={compact}
            active={activePage === item.page}
            onClick={() => onNavigate(item.page)}
          />
        ))}
      </div>

      <button
        type="button"
        className={`pf-sidenav-profile ${activePage === 'Configurações' ? 'is-active' : ''}`}
        onClick={() => onNavigate('Configurações')}
        aria-label="Abrir meu perfil"
        title="Abrir meu perfil"
      >
        <span className="pf-sidenav-avatar" style={{ background: profileBackground }}>
          {profileAvatar}
        </span>
        {!compact && (
          <span className="pf-sidenav-profile-info">
            <strong>{profileName || 'Meu perfil'}</strong>
            <small>Ver perfil</small>
          </span>
        )}
      </button>
    </aside>
  )
}

/** Celular: barra inferior + painel "Mais". */
function PhoneNavigation({ activePage, onNavigate, onNewTransaction }: AppNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const inMore = !PHONE_TABS.includes(activePage)
  const activeKey = moreOpen ? 'more' : inMore ? 'more' : activePage
  const indicator = useIndicator(barRef, activeKey, 'x')

  const closeMore = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => {
      setMoreOpen(false)
      setClosing(false)
    }, 260)
  }, [])

  useEffect(() => {
    if (!moreOpen) return

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMore()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen, closeMore])

  const tabs = MAIN_NAV.filter(item => PHONE_TABS.includes(item.page))
  const moreItems = [...MAIN_NAV.filter(item => !PHONE_TABS.includes(item.page)), ...SECONDARY_NAV]
  const isNative = Capacitor.isNativePlatform()

  function go(page: string) {
    onNavigate(page)
    if (moreOpen) closeMore()
  }

  return (
    <>
      <nav className="pf-tabbar" aria-label="Navegação principal">
        <div className="pf-tabbar-inner" ref={barRef}>
          <span className="pf-nav-indicator" style={indicator} aria-hidden="true" />

          {tabs.slice(0, 2).map(item => (
            <NavButton
              key={item.page}
              item={item}
              compact
              active={!moreOpen && activePage === item.page}
              onClick={() => go(item.page)}
            />
          ))}

          <button
            type="button"
            className="pf-tabbar-fab"
            onClick={() => {
              if (moreOpen) closeMore()
              onNewTransaction()
            }}
            aria-label="Nova transação"
            title="Nova transação"
          >
            <Plus size={26} strokeWidth={2.4} />
          </button>

          {tabs.slice(2).map(item => (
            <NavButton
              key={item.page}
              item={item}
              compact
              active={!moreOpen && activePage === item.page}
              onClick={() => go(item.page)}
            />
          ))}

          <button
            type="button"
            className={`pf-nav-item ${inMore || moreOpen ? 'is-active' : ''}`}
            data-nav-key="more"
            onClick={() => (moreOpen ? closeMore() : setMoreOpen(true))}
            aria-expanded={moreOpen}
            aria-controls="pf-more-sheet"
          >
            <span className="pf-nav-icon">
              {moreOpen ? <X size={20} strokeWidth={2.2} /> : <LayoutGrid size={20} strokeWidth={inMore ? 2.2 : 1.8} />}
            </span>
            <span className="pf-nav-label">{moreOpen ? 'Fechar' : 'Mais'}</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className={`pf-sheet-overlay ${closing ? 'is-closing' : ''}`}
          onClick={closeMore}
        >
          <div
            id="pf-more-sheet"
            className="pf-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            onClick={event => event.stopPropagation()}
          >
            <span className="pf-sheet-handle" aria-hidden="true" />
            <div className="pf-sheet-grid">
              {moreItems.map((item, index) => {
                const Icon = item.icon
                const active = activePage === item.page

                return (
                  <button
                    key={item.page}
                    type="button"
                    className={`pf-sheet-item ${active ? 'is-active' : ''}`}
                    style={{ '--pf-stagger': index } as React.CSSProperties}
                    onClick={() => go(item.page)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="pf-sheet-icon">
                      <Icon size={22} />
                    </span>
                    <span>{item.shortLabel ?? item.label}</span>
                  </button>
                )
              })}

              {/* Sair do app (só no Android; no navegador basta fechar a aba) */}
              {isNative && (
                <button
                  type="button"
                  className="pf-sheet-item pf-sheet-exit"
                  style={{ '--pf-stagger': moreItems.length } as React.CSSProperties}
                  onClick={() => void exitApp()}
                >
                  <span className="pf-sheet-icon">
                    <LogOut size={22} />
                  </span>
                  <span>Sair</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function AppNavigation(props: AppNavigationProps) {
  return props.device === 'phone' ? (
    <PhoneNavigation {...props} />
  ) : (
    <SideNavigation {...props} />
  )
}
