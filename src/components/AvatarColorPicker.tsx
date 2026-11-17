
import { useEffect, useState } from 'react'

type AvatarColorPickerProps = {
  value: string
  onChange: (color: string) => void
}

const DEFAULT_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#ffffff',
]

type HslColor = {
  h: number
  s: number
  l: number
}

function hexToHsl(hex: string): HslColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6
        break
      case g:
        h = (b - r) / delta + 2
        break
      default:
        h = (r - g) / delta + 4
    }

    h *= 60
  }

  return {
    h: Math.round((h + 360) % 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToHex({ h, s, l }: HslColor): string {
  const saturation = s / 100
  const lightness = l / 100

  const a =
    saturation * Math.min(lightness, 1 - lightness)

  const channel = (n: number) => {
    const k = (n + h / 30) % 12

    const value =
      lightness -
      a * Math.max(
        -1,
        Math.min(k - 3, 9 - k, 1)
      )

    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0')
  }

  return `#${channel(0)}${channel(8)}${channel(4)}`
}

export default function AvatarColorPicker({
  value,
  onChange,
}: AvatarColorPickerProps) {
  const [hexInput, setHexInput] = useState(value)
useEffect(() => {
  setHexInput(value)
}, [value])
const currentHsl = hexToHsl(value)

function updateHsl(
  property: keyof HslColor,
  nextValue: number
) {
  const nextColor = {
    ...currentHsl,
    [property]: nextValue,
  }

  const hex = hslToHex(nextColor)

  setHexInput(hex)
  onChange(hex)
}

  function handleHexChange(input: string) {
    setHexInput(input)

    if (/^#[0-9a-fA-F]{6}$/.test(input)) {
      onChange(input)
    }
  }

  return (
    <div className="avatar-color-picker">
      <div className="avatar-color-picker-header">
        <strong>Personalizar cor</strong>

        <div
          className="avatar-color-picker-preview"
          style={{ backgroundColor: value }}
          aria-label="Prévia da cor selecionada"
        />
      </div>

<div className="avatar-color-picker-sliders">
  <label>
    <span>
      Tonalidade
      <small>{currentHsl.h}°</small>
    </span>

    <input
      type="range"
      min="0"
      max="360"
      value={currentHsl.h}
      onChange={event =>
        updateHsl('h', Number(event.target.value))
      }
      className="avatar-hue-slider"
    />
  </label>

  <label>
    <span>
      Saturação
      <small>{currentHsl.s}%</small>
    </span>

    <input
      type="range"
      min="0"
      max="100"
      value={currentHsl.s}
      onChange={event =>
        updateHsl('s', Number(event.target.value))
      }
    />
  </label>

  <label>
    <span>
      Luminosidade
      <small>{currentHsl.l}%</small>
    </span>

    <input
      type="range"
      min="0"
      max="100"
      value={currentHsl.l}
      onChange={event =>
        updateHsl('l', Number(event.target.value))
      }
    />
  </label>
</div>

      <div className="avatar-color-picker-presets">
        {DEFAULT_COLORS.map(color => (
          <button
            key={color}
            type="button"
            className={`avatar-color-picker-preset ${
              value.toLowerCase() === color
                ? 'selected'
                : ''
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Selecionar cor ${color}`}
            aria-pressed={value.toLowerCase() === color}
            onClick={() => {
              setHexInput(color)
              onChange(color)
            }}
          />
        ))}
      </div>

      <label className="avatar-color-picker-hex">
        Código HEX
        <input
          type="text"
          value={hexInput}
          maxLength={7}
          placeholder="#8B5CF6"
          onChange={event =>
            handleHexChange(event.target.value)
          }
        />
      </label>
    </div>
  )
}
