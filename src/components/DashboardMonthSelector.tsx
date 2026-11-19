import { YEAR_OPTIONS } from '../services/yearRange'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'

type MenuType = 'month' | 'year'

type DashboardMonthSelectorProps = {
  value: string
  onChange: (value: string) => void
}

const ANIMATION_DURATION = 220

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function DashboardMonthSelector({
  value,
  onChange,
}: DashboardMonthSelectorProps) {
  const [year, month] = value.split('-')
  // Só de 2026 até 2040
  const years = YEAR_OPTIONS

  const [openMenu, setOpenMenu] = useState<MenuType | null>(null)
  const [closingMenu, setClosingMenu] = useState<MenuType | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function closeMenu() {
    if (!openMenu) return

    clearCloseTimer()
    const menuToClose = openMenu

    setClosingMenu(menuToClose)

    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(null)
      setClosingMenu(null)
      closeTimerRef.current = null
    }, ANIMATION_DURATION)
  }

  function toggleMenu(menu: MenuType) {
    clearCloseTimer()
    setClosingMenu(null)

    if (openMenu === menu) {
      closeMenu()
    } else {
      setOpenMenu(menu)
    }
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  })

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  function selectMonth(number: string) {
    onChange(`${year}-${number}`)
    closeMenu()
  }

  function selectYear(selectedYear: number) {
    onChange(`${selectedYear}-${month}`)
    closeMenu()
  }

  return (
    <div className="dashboard-month-selector" ref={containerRef}>
      <CalendarDays size={18} />

      <span className="dashboard-month-label">Período</span>

      <div className="dashboard-dropdown">
        <button
          type="button"
          className="dashboard-dropdown-trigger"
          aria-expanded={openMenu === 'month' && closingMenu !== 'month'}
          onClick={() => toggleMenu('month')}
        >
          {months[Number(month) - 1]}
          <ChevronDown size={15} />
        </button>

        {openMenu === 'month' && (
          <div
            className={`dashboard-dropdown-menu ${
              closingMenu === 'month' ? 'is-closing' : ''
            }`}
            role="group"
            aria-label="Escolher mês"
          >
            {months.map((name, index) => {
              const number = String(index + 1).padStart(2, '0')
              const selected = month === number

              return (
                <button
                  key={number}
                  type="button"
                  className={`dashboard-dropdown-option ${
                    selected ? 'selected' : ''
                  }`}
                  aria-pressed={selected}
                  onClick={() => selectMonth(number)}
                >
                  {name}
                  {selected && <Check size={15} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="dashboard-dropdown">
        <button
          type="button"
          className="dashboard-dropdown-trigger"
          aria-expanded={openMenu === 'year' && closingMenu !== 'year'}
          onClick={() => toggleMenu('year')}
        >
          {year}
          <ChevronDown size={15} />
        </button>

        {openMenu === 'year' && (
          <div
            className={`dashboard-dropdown-menu dashboard-year-menu ${
              closingMenu === 'year' ? 'is-closing' : ''
            }`}
            role="group"
            aria-label="Escolher ano"
          >
            {years.map(item => {
              const selected = String(item) === year

              return (
                <button
                  key={item}
                  type="button"
                  className={`dashboard-dropdown-option ${
                    selected ? 'selected' : ''
                  }`}
                  aria-pressed={selected}
                  onClick={() => selectYear(item)}
                >
                  {item}
                  {selected && <Check size={15} />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
