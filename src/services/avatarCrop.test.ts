import { describe, expect, it } from 'vitest'
import { clampCrop, cropDrawRect } from './avatarCrop'
import { getUserPreferences, saveUserPreferences } from './userPreferencesStorage'

describe('ajuste da foto de perfil', () => {
  it('foto deitada: no zoom 1 só dá para arrastar para os lados', () => {
    // 400x200 num círculo de 200 → vira 400x200, sobra 100 de cada lado
    const crop = clampCrop({ zoom: 1, x: 500, y: 80 }, 400, 200, 200)

    expect(crop).toEqual({ zoom: 1, x: 100, y: 0 })
  })

  it('o zoom fica entre 1x e 4x', () => {
    expect(clampCrop({ zoom: 9, x: 0, y: 0 }, 100, 100, 200).zoom).toBe(4)
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, 100, 100, 200).zoom).toBe(1)
  })

  it('a imagem final corresponde ao que aparece no círculo', () => {
    // Foto quadrada, zoom 2, arrastada 50 px para a direita no círculo de 200
    const rect = cropDrawRect({ zoom: 2, x: 50, y: 0 }, 100, 100, 200, 256)

    expect(rect.width).toBeCloseTo(512)
    expect(rect.x).toBeCloseTo(-128 + 64)
    expect(rect.y).toBeCloseTo(-128)
  })
})

describe('preferências com foto', () => {
  const store = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  })

  it('guarda e lê a foto', () => {
    const image = 'data:image/jpeg;base64,AAAA'
    saveUserPreferences({ name: 'Ana', avatar: 'photo', avatarColor1: '#111111', avatarColor2: '#222222', avatarImage: image })

    expect(getUserPreferences()).toMatchObject({ avatar: 'photo', avatarImage: image })
  })

  it('"foto" sem imagem válida volta para a inicial', () => {
    store.set('personal-finance-user-preferences', JSON.stringify({ name: 'Ana', avatar: 'photo', avatarImage: 'javascript:alert(1)' }))

    const prefs = getUserPreferences()
    expect(prefs.avatar).toBe('initial')
    expect(prefs.avatarImage).toBeUndefined()
  })
})
