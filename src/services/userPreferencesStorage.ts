export type UserPreferences = {
  name: string
  avatar: string
  avatarColor1: string
  avatarColor2: string
  /** Foto escolhida pelo usuário (já recortada pelo app), em data URL. */
  avatarImage?: string
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
  'photo',
]

function isValidColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(value)
  )
}

/** Aceita só imagens pequenas, já recortadas pelo app (até ~300 KB). */
export function isValidAvatarImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length < 400_000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
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

    const avatarImage =
      'avatarImage' in parsed && isValidAvatarImage(parsed.avatarImage)
        ? parsed.avatarImage
        : undefined

    const avatar =
      'avatar' in parsed &&
      typeof parsed.avatar === 'string' &&
      VALID_AVATARS.includes(parsed.avatar) &&
      // "Foto" sem uma imagem válida volta para a inicial do nome
      (parsed.avatar !== 'photo' || avatarImage !== undefined)
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
      ...(avatarImage ? { avatarImage } : {}),
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
