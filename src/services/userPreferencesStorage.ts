
export type UserPreferences = {
  name: string
  avatar: string
  avatarColor1: string
  avatarColor2: string
}

const STORAGE_KEY = 'personal-finance-user-preferences'

const DEFAULT_PREFERENCES: UserPreferences = {
  name: '',
  avatar: 'initial',
  avatarColor1: '#3b82f6',
  avatarColor2: '#ec4899',
}

const VALID_AVATARS = [
  'initial',
  'user',
  'cat',
  'dog',
  'robot',
  'ghost',
  'gamer',
  'rocket',
  'star',
]

function isValidColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(value)
  )
}

export function getUserPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return { ...DEFAULT_PREFERENCES }
    }

    const parsed: unknown = JSON.parse(saved)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('name' in parsed) ||
      typeof parsed.name !== 'string'
    ) {
      return { ...DEFAULT_PREFERENCES }
    }

    const avatar =
      'avatar' in parsed &&
      typeof parsed.avatar === 'string' &&
      VALID_AVATARS.includes(parsed.avatar)
        ? parsed.avatar
        : DEFAULT_PREFERENCES.avatar

    const avatarColor1 =
      'avatarColor1' in parsed &&
      isValidColor(parsed.avatarColor1)
        ? parsed.avatarColor1
        : DEFAULT_PREFERENCES.avatarColor1

    const avatarColor2 =
      'avatarColor2' in parsed &&
      isValidColor(parsed.avatarColor2)
        ? parsed.avatarColor2
        : DEFAULT_PREFERENCES.avatarColor2

    return {
      name: parsed.name,
      avatar,
      avatarColor1,
      avatarColor2,
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function saveUserPreferences(
  preferences: UserPreferences
): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(preferences)
  )
}
