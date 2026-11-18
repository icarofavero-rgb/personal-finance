import { Baby, Briefcase, GraduationCap, Heart, House, Plane, Store, UserRound } from 'lucide-react'

/** Ícones que o usuário pode escolher para cada perfil financeiro. */
export const PROFILE_ICON_OPTIONS = [
  { id: 'user', label: 'Pessoa', icon: UserRound },
  { id: 'briefcase', label: 'Trabalho', icon: Briefcase },
  { id: 'house', label: 'Casa', icon: House },
  { id: 'heart', label: 'Casal', icon: Heart },
  { id: 'store', label: 'Negócio', icon: Store },
  { id: 'graduation-cap', label: 'Estudos', icon: GraduationCap },
  { id: 'baby', label: 'Filhos', icon: Baby },
  { id: 'plane', label: 'Viagem', icon: Plane },
] as const

export default function ProfileIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const Icon = PROFILE_ICON_OPTIONS.find(option => option.id === icon)?.icon ?? UserRound
  return <Icon size={size} strokeWidth={1.9} />
}
