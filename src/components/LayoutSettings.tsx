import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, LayoutGrid, Plus, RotateCcw } from 'lucide-react'
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
function useReorderAnimation(order: string[]) {
  const items = useRef(new Map<string, HTMLElement>())
  const positions = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const reduced = document.documentElement.dataset.pfAnimations === 'off'

    items.current.forEach((element, key) => {
      const top = element.getBoundingClientRect().top
      const before = positions.current.get(key)
      positions.current.set(key, top)

      if (reduced || before === undefined || before === top) return

      element.animate(
        [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
        { duration: 320, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' }
      )
    })
  }, [order])

  return (key: string) => (element: HTMLElement | null) => {
    if (element) items.current.set(key, element)
    else items.current.delete(key)
  }
}

export default function LayoutSettings({ onSaved }: LayoutSettingsProps) {
  const [layout, setLayout] = useState<LayoutPreferences>(getLayoutPreferences)
  const [slot, setSlot] = useState(0)
  const register = useReorderAnimation(layout.mainOrder)

  function move(index: number, to: number) {
    setLayout(current => ({ ...current, mainOrder: moveItem(current.mainOrder, index, to) }))
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
        <p>Use as setas para mudar a posição das seções no menu (e no painel “Mais” do celular).</p>

        <ol className="pf-layout-list">
          {layout.mainOrder.map((page, index) => {
            const item = findNavItem(page)
            if (!item) return null
            const Icon = item.icon

            return (
              <li key={page} ref={register(page)} className="pf-layout-row">
                <span className="pf-layout-position">{index + 1}</span>
                <span className="pf-layout-icon">
                  <Icon size={19} strokeWidth={1.9} />
                </span>
                <span className="pf-layout-name">{item.label}</span>

                <span className="pf-layout-arrows">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Subir ${item.label}`}
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === layout.mainOrder.length - 1}
                    aria-label={`Descer ${item.label}`}
                  >
                    <ChevronDown size={18} />
                  </button>
                </span>
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
