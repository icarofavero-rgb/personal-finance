
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import './form-controls.css'

import {
  icons,
  type LucideIcon,
} from 'lucide-react'


export type SelectOption = {
  value: string
  label: string
  icon?: string
  color?: string
}

type SelectFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

function OptionIcon({
  icon,
  color,
}: {
  icon?: string
  color?: string
}) {
  if (!icon) return null

  const iconName = icon
    .split('-')
    .map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('') as keyof typeof icons

  const Icon = icons[iconName] as LucideIcon | undefined

  if (!Icon) return null

  return (
    <Icon
      size={17}
      color={color}
      strokeWidth={2}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    />
  )
}

const GAP = 7
const VIEWPORT_MARGIN = 12
const MAX_MENU_HEIGHT = 240

export default function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção',
  disabled = false,
}: SelectFieldProps) {
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const listId = `${generatedId}-options`

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 200,
    maxHeight: MAX_MENU_HEIGHT,
  })

  const selected = options.find(
    option => option.value === value
  )

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()

    const width = Math.min(
      rect.width,
      window.innerWidth - VIEWPORT_MARGIN * 2
    )

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        rect.left,
        window.innerWidth - width - VIEWPORT_MARGIN
      )
    )

    const availableBelow =
      window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN

    const availableAbove =
      rect.top - GAP - VIEWPORT_MARGIN

    const openAbove =
      availableBelow < 160 &&
      availableAbove > availableBelow

    const maxHeight = Math.max(
      60,
      Math.min(
        MAX_MENU_HEIGHT,
        openAbove ? availableAbove : availableBelow
      )
    )

    const top = openAbove
      ? rect.top - GAP - maxHeight
      : rect.bottom + GAP

    setPosition({
      top,
      left,
      width,
      maxHeight,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    updatePosition()

    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node

      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
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
        menuRef.current?.contains(target)
      ) {
        return
      }

      setOpen(false)
    }

    document.addEventListener(
      'pointerdown',
      handlePointerDown
    )
    document.addEventListener(
      'keydown',
      handleKeyDown
    )
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown
      )
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
      window.removeEventListener(
        'scroll',
        handleScroll,
        true
      )
    }
  }, [open])

  const menu = (
    <div
      id={listId}
      ref={menuRef}
      className="pf-select-options pf-select-options-portal"
      role="listbox"
      aria-label={placeholder}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        zIndex: 9999,
      }}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={`pf-select-option ${
            option.value === value ? 'selected' : ''
          }`}
          onClick={() => {
            onChange(option.value)
            setOpen(false)
            triggerRef.current?.focus()
          }}
        >
          
<span className="pf-select-option-content">
  <OptionIcon
    icon={option.icon}
    color={option.color}
  />
  <span>{option.label}</span>
</span>


          {option.value === value && (
            <Check size={15} />
          )}
        </button>
      ))}
    </div>
  )

  return (
    <div className="pf-select">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="pf-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => setOpen(previous => !previous)}
      >
        
<span className="pf-select-option-content">
  <OptionIcon
    icon={selected?.icon}
    color={selected?.color}
  />
  <span>{selected?.label ?? placeholder}</span>
</span>


        <ChevronDown
          size={17}
          className={open ? 'is-open' : ''}
        />
      </button>

      {open && createPortal(menu, document.body)}
    </div>
  )
}
