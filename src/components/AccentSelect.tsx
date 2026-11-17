
import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './AccentSelect.css'

type Option<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}

export default function AccentSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  const selected = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="accent-select" ref={containerRef}>
      <span className="accent-select-label" id={labelId}>
        {label}
      </span>

      <button
        type="button"
        className={`accent-select-trigger ${open ? 'is-open' : ''}`}
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(current => !current)}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="accent-select-menu">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              className={`accent-select-option ${
                option.value === value ? 'is-selected' : ''
              }`}
              aria-pressed={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <Check size={15} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
