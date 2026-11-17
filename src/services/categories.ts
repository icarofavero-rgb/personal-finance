
export type CategoryGroup = {
  id: string
  name: string
  icon: string
  color: string
  subcategories: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'food',
    name: 'Alimentação',
    icon: 'utensils',
    color: '#A78BFA',
    subcategories: [
      'Supermercado',
      'Delivery',
      'Restaurante',
      'Cafeteria',
      'Lanches',
      'Outros alimentos',
    ],
  },
  {
    id: 'housing',
    name: 'Moradia',
    icon: 'house',
    color: '#35D9FF',
    subcategories: [
      'Aluguel',
      'Condomínio',
      'Água',
      'Energia',
      'Internet',
      'Manutenção',
    ],
  },
  {
    id: 'transport',
    name: 'Transporte',
    icon: 'car-front',
    color: '#64E6A5',
    subcategories: [
      'Combustível',
      'Aplicativos de transporte',
      'Transporte público',
      'Estacionamento',
      'Manutenção do veículo',
    ],
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: 'heart-pulse',
    color: '#FF789A',
    subcategories: [
      'Farmácia',
      'Consultas',
      'Exames',
      'Plano de saúde',
    ],
  },
  {
    id: 'leisure',
    name: 'Lazer',
    icon: 'gamepad-2',
    color: '#FFB86B',
    subcategories: [
      'Jogos',
      'Cinema',
      'Passeios',
      'Assinaturas',
      'Viagens',
    ],
  },
  {
    id: 'shopping',
    name: 'Compras',
    icon: 'shopping-bag',
    color: '#7C91FF',
    subcategories: [
      'Roupas',
      'Eletrônicos',
      'Casa',
      'Presentes',
      'Outras compras',
    ],
  },
  {
    id: 'education',
    name: 'Educação',
    icon: 'graduation-cap',
    color: '#F0B85D',
    subcategories: [
      'Cursos',
      'Livros',
      'Mensalidades',
      'Materiais',
    ],
  },
  {
    id: 'finance',
    name: 'Finanças',
    icon: 'wallet',
    color: '#C4A5FF',
    subcategories: [
      'Tarifas',
      'Juros',
      'Impostos',
      'Outras despesas financeiras',
    ],
  },
  {
    id: 'other',
    name: 'Outros',
    icon: 'ellipsis',
    color: '#8993A5',
    subcategories: ['Geral'],
  },
]

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  assinaturas: 'Lazer',
}

const LEGACY_CATEGORY_COLORS = {
  income: '#64E6A5',
  unknown: '#8993A5',
}

function normalizeCategory(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function findKnownCategory(
  category: string
): CategoryGroup | undefined {
  const normalized = normalizeCategory(category)

  const alias = LEGACY_CATEGORY_ALIASES[normalized]

  if (alias) {
    return CATEGORY_GROUPS.find(
      group => group.name === alias
    )
  }

  return CATEGORY_GROUPS.find(group =>
    normalizeCategory(group.name) === normalized ||
    group.subcategories.some(
      subcategory =>
        normalizeCategory(subcategory) === normalized
    )
  )
}

function createLegacyCategory(
  category: string
): CategoryGroup {
  const name = category.trim() || 'Outros'

  const isIncome =
    normalizeCategory(name) === 'salário'

  return {
    id: `legacy:${name}`,
    name,
    icon: isIncome ? 'wallet' : 'ellipsis',
    color: isIncome
      ? LEGACY_CATEGORY_COLORS.income
      : LEGACY_CATEGORY_COLORS.unknown,
    subcategories: [],
  }
}


export function getCategoryGroup(
  category: string
): CategoryGroup {
  const normalized = category.trim()

  return (
    findKnownCategory(normalized) ??
    createLegacyCategory(normalized)
  )
}


export function getCategoryLabel(
  group: CategoryGroup,
  subcategory: string
): string {
  return `${group.name} / ${subcategory}`
}


export function getMainCategory(
  category: string
): CategoryGroup {
  const separator = ' / '
  const separatorIndex = category.indexOf(separator)

  if (separatorIndex >= 0) {
    const mainName = category
      .slice(0, separatorIndex)
      .trim()

    const knownGroup = findKnownCategory(mainName)

    return knownGroup ?? createLegacyCategory(mainName)
  }

  return getCategoryGroup(category)
}



export function getCategorySelection(
  category: string
): {
  group: CategoryGroup
  subcategory: string
} {
  const separator = ' / '
  const separatorIndex = category.indexOf(separator)

  if (separatorIndex >= 0) {
    const mainName = category
      .slice(0, separatorIndex)
      .trim()

    const subcategory = category
      .slice(separatorIndex + separator.length)
      .trim()

    const group = getMainCategory(mainName)

    return {
      group,
      subcategory,
    }
  }

  const group = getMainCategory(category)

  const isKnownSubcategory =
    group.subcategories.some(
      item =>
        normalizeCategory(item) ===
        normalizeCategory(category)
    )

  return {
    group,
    subcategory: isKnownSubcategory
      ? category
      : '',
  }
}


export function buildCategoryValue(
  groupName: string,
  subcategory: string
): string {
  if (!subcategory) return groupName

  return `${groupName} / ${subcategory}`
}
