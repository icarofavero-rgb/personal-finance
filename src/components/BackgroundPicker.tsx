import type { BackgroundPattern } from '../services/appearanceStorage'

const OPTIONS: { id: BackgroundPattern; label: string }[] = [
  { id: 'style', label: 'Do estilo' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'mesh', label: 'Malha' },
  { id: 'waves', label: 'Ondas' },
  { id: 'geometric', label: 'Geométrico' },
  { id: 'lines', label: 'Linhas' },
  { id: 'dots', label: 'Pontos' },
  { id: 'rings', label: 'Anéis' },
  { id: 'plain', label: 'Liso' },
]

type Props = {
  value: BackgroundPattern
  onChange: (value: BackgroundPattern) => void
}

/** Escolha do fundo (miniaturas na cor de destaque). Todos ficam parados. */
export default function BackgroundPicker({ value, onChange }: Props) {
  return (
    <div className="pf-bg-picker" role="radiogroup" aria-label="Fundo da tela">
      {OPTIONS.map(option => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={`pf-bg-option ${value === option.id ? 'is-selected' : ''}`}
          onClick={() => onChange(option.id)}
        >
          <span className={`pf-bg-thumb pf-bg-thumb-${option.id}`} aria-hidden="true" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
