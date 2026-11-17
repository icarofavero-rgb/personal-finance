
import { useState } from 'react'
import { CreditCard } from 'lucide-react'

type StackCard = {
  id: string
  name: string
  bank: string
  color?: string
  image?: string
}

type DashboardCardStackProps = {
  cards: StackCard[]
  onOpenCard: (cardId: string) => void
}

export default function DashboardCardStack({
  cards,
  onOpenCard,
}: DashboardCardStackProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    null
  )

  if (cards.length === 0) {
    return (
      <div className="dashboard-cards-placeholder">
        <CreditCard size={34} />
        <strong>Nenhum cartão cadastrado</strong>
        <p>
          Cadastre um cartão na seção Cartões para
          visualizá-lo aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-card-stack">
      <div className="dashboard-card-stack-stage">
        {cards.map((card, index) => {
          const isSelected = selectedId === card.id
          const selectedIndex = cards.findIndex(
            item => item.id === selectedId
          )

          const position =
  selectedIndex === -1
    ? index
    : isSelected
      ? 0
      : index < selectedIndex
        ? index + 1
        : index

          return (
            <button
              key={card.id}
              type="button"
              className={`dashboard-stack-card ${
                isSelected ? 'is-selected' : ''
              }`}
              style={{
                '--stack-position': position,
                '--stack-color': card.color || '#6d5dfc',
                zIndex: isSelected
                  ? cards.length + 1
                  : position + 1,
                ...(card.image
                  ? {
                      backgroundImage: `
                        linear-gradient(
                          rgba(10, 14, 25, 0.3),
                          rgba(10, 14, 25, 0.75)
                        ),
                        url("${card.image}")
                      `,
                    }
                  : {}),
              } as React.CSSProperties}
              onClick={() => {
                if (selectedId === card.id) {
                  onOpenCard(card.id)
                } else {
                  setSelectedId(card.id)
                }
              }}
              aria-label={`Selecionar cartão ${card.name}`}
            >
              <div className="dashboard-stack-card-top">
                <span>{card.bank}</span>
                <CreditCard size={22} />
              </div>

              <div className="dashboard-stack-card-bottom">
                <strong>{card.name}</strong>
                <span>PERSONAL FINANCE</span>
              </div>
            </button>
          )
        })}
      </div>

      <p className="dashboard-card-stack-hint">
        Clique para selecionar. Clique novamente para
        visualizar os detalhes.
      </p>
    </div>
  )
}
