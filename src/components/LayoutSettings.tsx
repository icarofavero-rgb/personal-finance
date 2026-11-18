import { useLayoutEffect, useRef, useState } from 'react'
import { GripVertical, LayoutGrid, Plus, RotateCcw } from 'lucide-react'
import { findNavItem } from './AppNavigation'
import {
  assignPhoneTab,
  defaultLayout,
  getLayoutPreferences,
  moveItem,
  PHONE_TAB_CHOICES,
  saveLayoutPreferences,
  type LayoutPreferences,
} from '../services/layoutPreferencesStorage'

type LayoutSettingsProps = {
  onSaved: (message: string, type?: 'success' | 'error') => void
}

/** Anima os itens deslizando até a nova posição quando a ordem muda. */
function useReorderAnimation(order: string[], skip: React.RefObject<string | null>) {
  const items = useRef(new Map<string, HTMLElement>())
  const positions = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const reduced = document.documentElement.dataset.pfAnimations === 'off'

    items.current.forEach((element, key) => {
      const top = element.getBoundingClientRect().top
      const before = positions.current.get(key)
      positions.current.set(key, top)

      // O item sendo arrastado acompanha o dedo; só os outros deslizam
      if (key === skip.current) return
      if (reduced || before === undefined || before === top) return

      element.animate(
        [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
        { duration: 320, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' }
      )
    })
  }, [order])

  const register = (key: string) => (element: HTMLElement | null) => {
    if (element) items.current.set(key, element)
    else items.current.delete(key)
  }

  return { register, items }
}

const GAP = 8

export default function LayoutSettings({ onSaved }: LayoutSettingsProps) {
  const [layout, setLayout] = useState<LayoutPreferences>(getLayoutPreferences)
  const [slot, setSlot] = useState(0)
  const [dragging, setDragging] = useState<string | null>(null)
  const draggingRef = useRef<string | null>(null)
  const drag = useRef<{ pointerId: number; startY: number } | null>(null)
  const orderRef = useRef(layout.mainOrder)
  orderRef.current = layout.mainOrder
  const { register, items } = useReorderAnimation(layout.mainOrder, draggingRef)

  function move(index: number, to: number) {
    setLayout(current => ({ ...current, mainOrder: moveItem(current.mainOrder, index, to) }))
  }

  // ---------- arrastar pela alça ----------

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, page: string) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, startY: event.clientY }
    draggingRef.current = page
    setDragging(page)
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    const page = draggingRef.current
    if (!state || !page || state.pointerId !== event.pointerId) return

    const order = orderRef.current
    const index = order.indexOf(page)
    const row = items.current.get(page)
    if (!row) return

    let offset = event.clientY - state.startY
    const height = row.offsetHeight + GAP

    // Passou da metade do vizinho: troca de lugar com ele
    if (offset < -height / 2 && index > 0) {
      state.startY -= height
      offset += height
      orderRef.current = moveItem(order, index, index - 1)
      move(index, index - 1)
    } else if (offset > height / 2 && index < order.length - 1) {
      state.startY += height
      offset -= height
      orderRef.current = moveItem(order, index, index + 1)
      move(index, index + 1)
    }

    row.style.transform = `translateY(${offset}px)`
  }

  function endDrag() {
    const page = draggingRef.current
    const row = page ? items.current.get(page) : null

    if (row) {
      // Volta suavemente para o lugar certo
      row.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
      row.style.transform = ''
      window.setTimeout(() => {
        row.style.transition = ''
      }, 240)
    }

    drag.current = null
    draggingRef.current = null
    setDragging(null)
  }

  /** Teclado: setas para cima/baixo na alça também movem. */
  function keyMove(event: React.KeyboardEvent, index: number) {
    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault()
      move(index, index - 1)
    } else if (event.key === 'ArrowDown' && index < layout.mainOrder.length - 1) {
      event.preventDefault()
      move(index, index + 1)
    }
  }

  function choose(page: string) {
    setLayout(current => ({ ...current, phoneTabs: assignPhoneTab(current.phoneTabs, slot, page) }))
  }

  function save() {
    try {
      saveLayoutPreferences(layout)
      onSaved('Layout salvo! O menu já foi atualizado.')
    } catch {
      onSaved('Não foi possível salvar o layout.', 'error')
    }
  }

  function restore() {
    setLayout(defaultLayout())
    setSlot(0)
  }

  // Barra do celular: 2 botões, o "+", 1 botão e o "Mais"
  const slotButton = (index: number) => {
    const item = findNavItem(layout.phoneTabs[index])
    if (!item) return null
    const Icon = item.icon

    return (
      <button
        type="button"
        className={`pf-layout-slot ${slot === index ? 'is-selected' : ''}`}
        onClick={() => setSlot(index)}
        aria-pressed={slot === index}
        aria-label={`Espaço ${index + 1} da barra: ${item.label}`}
      >
        <Icon size={20} strokeWidth={1.9} />
        <span>{item.shortLabel ?? item.label}</span>
      </button>
    )
  }

  return (
    <div className="settings-appearance pf-layout-settings">
      <div className="settings-appearance-group">
        <h3>Ordem do menu principal</h3>
        <p>Segure a alça (⋮⋮) e arraste para mudar a posição das seções no menu (e no painel “Mais” do celular).</p>

        <ol className={`pf-layout-list ${dragging ? 'is-dragging' : ''}`}>
          {layout.mainOrder.map((page, index) => {
            const item = findNavItem(page)
            if (!item) return null
            const Icon = item.icon

            return (
              <li key={page} ref={register(page)} className={`pf-layout-row ${dragging === page ? 'is-dragged' : ''}`}>
                <span className="pf-layout-position">{index + 1}</span>
                <span className="pf-layout-icon">
                  <Icon size={19} strokeWidth={1.9} />
                </span>
                <span className="pf-layout-name">{item.label}</span>

                <button
                  type="button"
                  className="pf-layout-handle"
                  aria-label={`Arrastar ${item.label} (ou use as setas do teclado)`}
                  title="Segure e arraste"
                  onPointerDown={event => startDrag(event, page)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={event => keyMove(event, index)}
                >
                  <GripVertical size={20} />
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="settings-appearance-group">
        <h3>Barra inferior do celular</h3>
        <p>
          Toque em um dos espaços da barra e depois escolha a página que deve aparecer nele. O botão “+” e o
          “Mais” ficam sempre no lugar.
        </p>

        <div className="pf-layout-phonebar" aria-label="Prévia da barra do celular">
          {slotButton(0)}
          {slotButton(1)}
          <span className="pf-layout-fab" aria-hidden="true">
            <Plus size={22} strokeWidth={2.4} />
          </span>
          {slotButton(2)}
          <span className="pf-layout-more" aria-hidden="true">
            <LayoutGrid size={20} strokeWidth={1.9} />
            <span>Mais</span>
          </span>
        </div>

        <div className="pf-layout-choices" role="radiogroup" aria-label={`Página do espaço ${slot + 1}`}>
          {PHONE_TAB_CHOICES.map(page => {
            const item = findNavItem(page)
            if (!item) return null
            const Icon = item.icon
            const position = layout.phoneTabs.indexOf(page)
            const selected = position === slot

            return (
              <button
                key={page}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`pf-layout-choice ${selected ? 'is-selected' : ''} ${
                  position >= 0 && !selected ? 'is-used' : ''
                }`}
                onClick={() => choose(page)}
              >
                <Icon size={17} strokeWidth={1.9} />
                <span>{item.shortLabel ?? item.label}</span>
                {position >= 0 && <small>{position + 1}</small>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="settings-form-actions pf-layout-actions">
        <button type="button" className="pf-ghost-button" onClick={restore}>
          <RotateCcw size={16} />
          Restaurar padrão
        </button>
        <button type="button" className="primary-button" onClick={save}>
          Salvar layout
        </button>
      </div>
    </div>
  )
}
