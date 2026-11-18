
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import './calendar.css'

type MonthPickerProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  clearable?: boolean
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function MonthPicker({
  value,
  onChange,
  id,
  clearable = false,
}: MonthPickerProps) {
  const initialYear = Number(value.slice(0, 4)) || new Date().getFullYear()
  const [year, setYear] = useState(initialYear)
  const [yearAnimation, setYearAnimation] = useState(0)
  const [open, setOpen] = useState(false)

const [renderPopup, setRenderPopup] = useState(false)
const [closing, setClosing] = useState(false)
const closeTimer = useRef<number | null>(null)

const ANIMATION_DURATION = 220

function closeCalendar() {
  setOpen(false)
  setClosing(true)

  if (closeTimer.current !== null) {
    window.clearTimeout(closeTimer.current)
  }

  closeTimer.current = window.setTimeout(() => {
    setRenderPopup(false)
    setClosing(false)
    closeTimer.current = null
  }, ANIMATION_DURATION)
}

// A janela "flutua" sobre a tela (portal), alinhada ao campo: assim
// nenhum bloco a corta e ela abre logo abaixo do campo (ou acima,
// quando não há espaço embaixo).
const triggerRef = useRef<HTMLButtonElement>(null)
const popupRef = useRef<HTMLDivElement>(null)
const [placement, setPlacement] = useState<React.CSSProperties>({})

const updatePlacement = useCallback(() => {
  const trigger = triggerRef.current
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()
  const width = Math.min(300, window.innerWidth - 24)
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceBelow < 340 && rect.top > spaceBelow

  setPlacement(
    openAbove
      ? { position: 'fixed', left, width, bottom: window.innerHeight - rect.top + 8, top: 'auto' }
      : { position: 'fixed', left, width, top: rect.bottom + 8, bottom: 'auto' }
  )
}, [])

function toggleCalendar() {
  if (open) {
    closeCalendar()
    return
  }

  if (closeTimer.current !== null) {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  updatePlacement()
  setYear(Number(value.slice(0, 4)) || new Date().getFullYear())
  setClosing(false)
  setRenderPopup(true)
  setOpen(true)
}

// Fecha ao tocar fora, com Esc ou ao rolar a página.
useEffect(() => {
  if (!open) return

  function onPointerDown(event: PointerEvent) {
    const target = event.target as Node
    if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) {
      closeCalendar()
    }
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') closeCalendar()
  }

  function onScroll(event: Event) {
    if (event.target instanceof Node && popupRef.current?.contains(event.target)) return
    closeCalendar()
  }

  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', updatePlacement)

  return () => {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', updatePlacement)
  }
  // closeCalendar só agenda estados; recriar o efeito a cada render não é necessário.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, updatePlacement])

useEffect(() => {
  return () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
    }
  }
}, [])

  const selectedMonth = Number(value.slice(5, 7)) - 1

function changeYear(direction: number) {
  setYear(previous => previous + direction)
  setYearAnimation(previous => previous + 1)
}

  function selectMonth(monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, '0')
  onChange(`${year}-${month}`)
  closeCalendar()
}

  const displayMonth =
    selectedMonth >= 0 && selectedMonth < 12
      ? `${months[selectedMonth]} de ${value.slice(0, 4)}`
      : 'Selecionar mês'

  return (
    <div className="pf-calendar" data-month-picker>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="pf-calendar-trigger"
        aria-expanded={open}
        onClick={toggleCalendar}
      >
        <span>{displayMonth}</span>
        <CalendarDays size={17} />
      </button>

{clearable && (
  <button
    type="button"
    className="pf-calendar-today"
    onClick={() => {
      onChange('')
      closeCalendar()
    }}
  >
    Todos os meses
  </button>
)}

      {renderPopup && createPortal(
  <div
    ref={popupRef}
    className={`pf-calendar-popup pf-calendar-popup-floating ${
      closing ? 'pf-calendar-popup-closing' : 'pf-calendar-popup-opening'
    } ${placement.bottom !== 'auto' && placement.bottom !== undefined ? 'pf-pop-up' : ''}`}
    style={{ ...placement, zIndex: 9999 }}
  >
          <div className="pf-calendar-header">
            <button
              type="button"
              aria-label="Ano anterior"
              onClick={() => changeYear(-1)}
            >
              <ChevronLeft size={18} />
            </button>

            <strong>{year}</strong>

            <button
              type="button"
              aria-label="Próximo ano"
              onClick={() => changeYear(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div
  key={yearAnimation}
  className="pf-month-grid"
>
            {months.map((month, index) => {
              const isSelected =
                year === Number(value.slice(0, 4)) &&
                index === selectedMonth

              return (
                <button
  key={month}
  type="button"
  aria-label={`${month} de ${year}`}
  className={isSelected ? 'selected' : ''}
  onClick={() => selectMonth(index)}
>
  {month.slice(0, 3)}
</button>
              )
            })}
          </div>

          <button
            type="button"
            className="pf-calendar-today"
            onClick={() => {
              const today = new Date()
              onChange(
                `${today.getFullYear()}-${String(
                  today.getMonth() + 1
                ).padStart(2, '0')}`
              )
              closeCalendar()
            }}
          >
            Este mês
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
