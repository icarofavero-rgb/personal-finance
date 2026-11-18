import { describe, expect, it } from 'vitest'
import { icons } from 'lucide-react'

import {
  CATEGORY_GROUPS,
  INCOME_CATEGORY_META,
  SUBCATEGORY_ICONS,
  getTransactionVisual,
} from './categories'

const toComponentName = (name: string) =>
  name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

describe('ícones das categorias', () => {
  it('toda subcategoria tem um ícone', () => {
    const missing = CATEGORY_GROUPS.flatMap(group => group.subcategories).filter(
      subcategory => !SUBCATEGORY_ICONS[subcategory]
    )

    expect(missing).toEqual([])
  })

  it('todos os ícones usados existem na biblioteca', () => {
    const names = [
      ...Object.values(SUBCATEGORY_ICONS),
      ...Object.values(INCOME_CATEGORY_META).map(item => item.icon),
      ...CATEGORY_GROUPS.map(group => group.icon),
    ]

    const missing = names.filter(name => !(toComponentName(name) in icons))

    expect(missing).toEqual([])
  })

  it('usa o ícone da subcategoria, ou o da categoria quando não há', () => {
    expect(getTransactionVisual('Alimentação / Cafeteria', 'expense')).toMatchObject({
      icon: 'coffee',
      color: '#A78BFA',
      label: 'Cafeteria',
    })

    expect(getTransactionVisual('Alimentação', 'expense').icon).toBe('utensils')
    expect(getTransactionVisual('Salário', 'income').icon).toBe('briefcase-business')
    expect(getTransactionVisual('Categoria antiga', 'expense').icon).toBe('ellipsis')
  })
})
