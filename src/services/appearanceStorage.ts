
export type AppTheme = 'dark' | 'light' | 'system'

export type VisualStyle =
  | 'classic'
  | 'apple-glass'
  | 'neon-glass'
  | 'christmas'

export type AnimationPreference =
  | 'normal'
  | 'reduced'
  | 'off'

export type AccentColor =
  | 'purple'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'pink'
  | 'white'

/** Fundo da tela (sempre parado, na cor de destaque escolhida). */
export type BackgroundPattern =
  | 'style'
  | 'aurora'
  | 'mesh'
  | 'waves'
  | 'geometric'
  | 'lines'
  | 'dots'
  | 'rings'
  | 'plain'

export const BACKGROUND_PATTERNS: BackgroundPattern[] = ['style', 'aurora', 'mesh', 'waves', 'geometric', 'lines', 'dots', 'rings', 'plain']

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge'

export const FONT_SIZES: { id: FontSize; label: string; scale: number }[] = [
  { id: 'small', label: 'Pequena', scale: 0.92 },
  { id: 'normal', label: 'Normal', scale: 1 },
  { id: 'large', label: 'Grande', scale: 1.1 },
  { id: 'xlarge', label: 'Muito grande', scale: 1.22 },
]

export type NeonIntensity =
  | 'off'
  | 'subtle'
  | 'intense'

export type AppearancePreferences = {
  theme: AppTheme
  visualStyle: VisualStyle
  accentColor: AccentColor
  neonIntensity: NeonIntensity
  animations: AnimationPreference
  background: BackgroundPattern
  fontSize: FontSize
}

const STORAGE_KEY = 'personal-finance-appearance'

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: 'dark',
  visualStyle: 'classic',
  accentColor: 'purple',
  neonIntensity: 'subtle',
  animations: 'normal',
  background: 'style',
  fontSize: 'normal',
}

export function getAppearancePreferences(): AppearancePreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return { ...DEFAULT_APPEARANCE }
    }

    const parsed: unknown = JSON.parse(saved)

    if (
      typeof parsed !== 'object' ||
      parsed === null
    ) {
      return { ...DEFAULT_APPEARANCE }
    }

    const data = parsed as Partial<AppearancePreferences>

    const validThemes: AppTheme[] = [
      'dark', 'light', 'system',
    ]

const validAnimations: AnimationPreference[] = [
  'normal',
  'reduced',
  'off',
]
    
const validVisualStyles: VisualStyle[] = [
  'classic',
  'apple-glass',
  'neon-glass',
  'christmas',
]

const validColors: AccentColor[] = [
  'purple',
  'blue',
  'cyan',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'white',
]


    const validNeon: NeonIntensity[] = [
      'off', 'subtle', 'intense',
    ]

    return {

animations: validAnimations.includes(
  data.animations as AnimationPreference
)
  ? (data.animations as AnimationPreference)
  : DEFAULT_APPEARANCE.animations,

visualStyle: validVisualStyles.includes(
  data.visualStyle as VisualStyle
)
  ? (data.visualStyle as VisualStyle)
  : DEFAULT_APPEARANCE.visualStyle,

      theme: validThemes.includes(data.theme as AppTheme)
        ? data.theme as AppTheme
        : DEFAULT_APPEARANCE.theme,

      accentColor: validColors.includes(data.accentColor as AccentColor)
        ? data.accentColor as AccentColor
        : DEFAULT_APPEARANCE.accentColor,

      background: BACKGROUND_PATTERNS.includes(data.background as BackgroundPattern)
        ? (data.background as BackgroundPattern)
        : DEFAULT_APPEARANCE.background,

      fontSize: FONT_SIZES.some(item => item.id === data.fontSize)
        ? (data.fontSize as FontSize)
        : DEFAULT_APPEARANCE.fontSize,

      neonIntensity: validNeon.includes(
        data.neonIntensity as NeonIntensity
      )
        ? data.neonIntensity as NeonIntensity
        : DEFAULT_APPEARANCE.neonIntensity,
    }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export function saveAppearancePreferences(
  preferences: AppearancePreferences
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(preferences)
  )
}


const ACCENT_COLORS: Record<
  AccentColor,
  { hex: string; rgb: string; text: string }
> = {
  purple: {
    hex: '#8b5cf6',
    rgb: '139, 92, 246',
    text: '#c4b5fd',
  },
  blue: {
    hex: '#3b82f6',
    rgb: '59, 130, 246',
    text: '#93c5fd',
  },
  cyan: {
    hex: '#22d3ee',
    rgb: '34, 211, 238',
    text: '#67e8f9',
  },
  green: {
    hex: '#22c55e',
    rgb: '34, 197, 94',
    text: '#86efac',
  },
  yellow: {
    hex: '#eab308',
    rgb: '234, 179, 8',
    text: '#fde047',
  },
  orange: {
    hex: '#f97316',
    rgb: '249, 115, 22',
    text: '#fdba74',
  },
  red: {
    hex: '#ef4444',
    rgb: '239, 68, 68',
    text: '#fca5a5',
  },
  pink: {
    hex: '#ec4899',
    rgb: '236, 72, 153',
    text: '#f9a8d4',
  },
  white: {
    hex: '#ffffff',
    rgb: '255, 255, 255',
    text: '#ffffff',
  },
}

export function applyAccentColor(color: AccentColor): void {
  const selected = ACCENT_COLORS[color]

  const root = document.documentElement

  root.style.setProperty('--pf-accent', selected.hex)
  root.style.setProperty('--pf-accent-rgb', selected.rgb)
  root.style.setProperty('--pf-accent-text', selected.text)

  // Cor do texto SOBRE a cor de destaque: cores claras (branco, amarelo)
  // precisam de texto escuro para continuarem legíveis.
  root.style.setProperty(
    '--pf-accent-contrast',
    color === 'white' || color === 'yellow' || color === 'cyan' ? '#15121f' : '#ffffff'
  )
}


export function applyNeonIntensity(
  intensity: NeonIntensity
): void {
  const root = document.documentElement

  const levels: Record<NeonIntensity, string> = {
    off: '0',
    subtle: '0.15',
    intense: '0.40',
  }

  root.style.setProperty(
    '--pf-neon-strength',
    levels[intensity]
  )
}

export function applyAppTheme(theme: AppTheme): void {
  const root = document.documentElement

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  root.setAttribute('data-pf-theme', resolvedTheme)
}

export function applyVisualStyle(
  style: VisualStyle
): void {
  const root = document.documentElement

  root.setAttribute('data-pf-style', style)

  // Estilos com vidro e fundo em gradiente (todos menos o Clássico).
  if (style === 'classic') {
    root.removeAttribute('data-pf-glass')
  } else {
    root.setAttribute('data-pf-glass', '')
  }
}

export function applyAnimationPreference(
  preference: AnimationPreference
): void {
  document.documentElement.setAttribute(
    'data-pf-animations',
    preference
  )
}

/** Aplica o fundo escolhido (o desenho em si fica no AppBackdrop). */
export function applyBackground(pattern: BackgroundPattern): void {
  document.documentElement.setAttribute('data-pf-bg', pattern)
}

/** Tamanho da letra do app inteiro (os estilos usam --pf-font-scale). */
export function applyFontSize(size: FontSize): void {
  const scale = FONT_SIZES.find(item => item.id === size)?.scale ?? 1
  document.documentElement.style.setProperty('--pf-font-scale', String(scale))
  document.documentElement.setAttribute('data-pf-font', size)
}
