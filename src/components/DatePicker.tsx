
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import './calendar.css'

type DatePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const POPUP_WIDTH = 290
const POPUP_ESTIMATED_HEIGHT = 340
const GAP = 8
const VIEWPORT_MARGIN = 12

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function DatePicker({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const popupId = `${generatedId}-calendar`

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const selectedDate = parseDate(value)

  const [open, setOpen] = useState(false)
  const [calendarAnimation, setCalendarAnimation] = useState(0)
  const [viewDate, setViewDate] = useState(
    () => selectedDate ?? new Date()
  )

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: POPUP_WIDTH,
  })


const updatePosition = useCallback(() => {
  const trigger = triggerRef.current
  if (!trigger) return

  const rect = trigger.getBoundingClientRect()

  const availableWidth = Math.max(
    0,
    window.innerWidth - VIEWPORT_MARGIN * 2
  )

  const width = Math.min(
    POPUP_WIDTH,
    availableWidth
  )

  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(
      rect.right - width,
      window.innerWidth - width - VIEWPORT_MARGIN
    )
  )

  const popupHeight =
    popupRef.current?.getBoundingClientRect().height ??
    POPUP_ESTIMATED_HEIGHT

  const spaceBelow =
    window.innerHeight - rect.bottom - VIEWPORT_MARGIN

  const spaceAbove =
    rect.top - VIEWPORT_MARGIN

  const openAbove =
    spaceBelow < popupHeight + GAP &&
    spaceAbove > spaceBelow

  const preferredTop = openAbove
    ? rect.top - popupHeight - GAP
    : rect.bottom + GAP

  const maxTop = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - popupHeight - VIEWPORT_MARGIN
  )

  const top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(preferredTop, maxTop)
  )

  setPosition({ top, left, width })
}, [])


  useLayoutEffect(() => {
    if (!open) return

    updatePosition()

    const handleResize = () => updatePosition()

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node

      if (
        !triggerRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    function handleScroll(event: Event) {
      const target = event.target

      if (
        target instanceof Node &&
        popupRef.current?.contains(target)
      ) {
        return
      }

      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown
      )
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
function changeMonth(direction: number) {
  setViewDate(previous => {
    return new Date(
      previous.getFullYear(),
      previous.getMonth() + direction,
      1
    )
  })

  setCalendarAnimation(previous => previous + 1)
}
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(viewDate)

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat('pt-BR').format(selectedDate)
    : 'Selecione uma data'

  const calendar = (
    <div
      id={popupId}
      ref={popupRef}
      className="pf-date-popup pf-date-popup-portal"
      role="dialog"
      aria-label="Selecionar data"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
    >
      <div className="pf-date-header">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={18} />
        </button>

        <strong>{monthLabel}</strong>

        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
  key={calendarAnimation}
  className="pf-date-grid pf-date-grid-animated"
>
        {weekdays.map((day, index) => (
          <span key={index} className="pf-date-weekday">
            {day}
          </span>
        ))}

        {Array.from(
          { length: firstWeekday },
          (_, index) => (
            <span key={`empty-${index}`} />
          )
        )}

        {Array.from(
          { length: daysInMonth },
          (_, index) => {
            const day = index + 1
            const currentDate = new Date(year, month, day)
            const dateValue = formatDate(currentDate)

            return (
              <button
                key={dateValue}
                type="button"
                className={
                  dateValue === value ? 'selected' : ''
                }
                aria-pressed={dateValue === value}
                onClick={() => {
                  onChange(dateValue)
                  setOpen(false)
                }}
              >
                {day}
              </button>
            )
          }
        )}
      </div>

      <div className="pf-date-footer">
        <button
          type="button"
          onClick={() => {
            onChange(formatDate(new Date()))
            setOpen(false)
          }}
        >
          Hoje
        </button>
      </div>
    </div>
  )

  return (
    <div className="pf-date-picker">
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="pf-date-trigger"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-haspopup="dialog"
        onClick={() => {
          if (!open) {
            setViewDate(selectedDate ?? new Date())
            updatePosition()
          }

          setOpen(previous => !previous)
        }}
      >
        <span>{displayValue}</span>
        <CalendarDays size={18} />
      </button>

      {open && createPortal(calendar, document.body)}

      {required && (
        <input
          type="text"
          value={value}
          required
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="pf-date-validation"
        />
      )}
    </div>
  )
}
