
export type AppTheme = 'dark' | 'light' | 'system'

export type VisualStyle =
  | 'classic'
  | 'apple-glass'
  | 'neon-glass'

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
}

const STORAGE_KEY = 'personal-finance-appearance'

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: 'dark',
  visualStyle: 'classic',
  accentColor: 'purple',
  neonIntensity: 'subtle',
  animations: 'normal',
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
  document.documentElement.setAttribute(
    'data-pf-style',
    style
  )
}

export function applyAnimationPreference(
  preference: AnimationPreference
): void {
  document.documentElement.setAttribute(
    'data-pf-animations',
    preference
  )
}
