import { icons, Ellipsis, type LucideIcon } from 'lucide-react'

/** Converte "shopping-cart" → "ShoppingCart" (nome do componente lucide). */
export function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return Ellipsis

  const key = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') as keyof typeof icons

  return (icons[key] as LucideIcon | undefined) ?? Ellipsis
}

type CategoryIconProps = {
  icon?: string
  color?: string
  size?: number
  strokeWidth?: number
}

/** Ícone de categoria/subcategoria a partir do nome (ex.: "coffee"). */
export default function CategoryIcon({ icon, color, size = 18, strokeWidth = 2 }: CategoryIconProps) {
  const Icon = resolveIcon(icon)

  return <Icon size={size} color={color} strokeWidth={strokeWidth} aria-hidden="true" />
}
