import { findBrand } from '../services/brandIcons'

type Props = {
  /** descrição da transação/compra: o ícone aparece se reconhecer o serviço */
  description: string
  size?: number
}

/** Selo do serviço (Uber, Spotify, Netflix…) ao lado da descrição. */
export default function BrandIcon({ description, size = 18 }: Props) {
  const brand = findBrand(description)
  if (!brand) return null

  return (
    <span
      className="pf-brand-icon"
      style={{ '--brand-color': brand.color, width: size, height: size } as React.CSSProperties}
      title={brand.name}
      aria-label={brand.name}
      role="img"
    >
      {brand.path ? (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden="true">
          <path d={brand.path} fill={brand.ink ?? '#ffffff'} />
        </svg>
      ) : (
        <span className="pf-brand-letters" style={{ color: brand.ink ?? '#ffffff', fontSize: Math.max(7, size * (brand.letters && brand.letters.length > 2 ? 0.34 : 0.46)) }}>
          {brand.letters}
        </span>
      )}
    </span>
  )
}
