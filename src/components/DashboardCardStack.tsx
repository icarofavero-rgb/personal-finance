import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'

type StackCard = {
  id: string
  name: string
  bank: string
  color?: string
  image?: string
  /** fatura "da vez" (a que ainda vai vencer) */
  invoiceMonth?: string
  invoiceDueDate?: string
  monthInvoice?: number
  monthPaid?: number
}

type DashboardCardStackProps = {
  cards: StackCard[]
  onOpenCard: (cardId: string) => void
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const monthName = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
const formatDay = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

/**
 * Cartões no Dashboard: um por vez, com setas, pontinhos e arrastar
 * (funciona com qualquer quantidade de cartões). Mesmo visual da página
 * Cartões: fundo preto com borda, ícone e textos na cor do cartão.
 */
export default function DashboardCardStack({ cards, onOpenCard }: DashboardCardStackProps) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const touchStart = useRef<number | null>(null)

  if (cards.length === 0) {
    return (
      <div className="dashboard-cards-placeholder">
        <CreditCard size={34} />
        <strong>Nenhum cartão cadastrado</strong>
        <p>Cadastre um cartão na seção Cartões para visualizá-lo aqui.</p>
      </div>
    )
  }

  const safeIndex = Math.min(index, cards.length - 1)
  const card = cards[safeIndex]
  const go = (step: number) => {
    setDirection(step > 0 ? 'next' : 'prev')
    setIndex((safeIndex + step + cards.length) % cards.length)
  }
  const invoice = card.monthInvoice ?? 0
  const paid = Math.min(invoice, card.monthPaid ?? 0)

  return (
    <div className="dashboard-card-stack pf-dash-cards">
      <div className="pf-dash-cards-row">
        <button type="button" className="card-carousel-arrow" onClick={() => go(-1)} disabled={cards.length <= 1} aria-label="Cartão anterior">
          <ChevronLeft size={20} />
        </button>

        <button
          key={card.id}
          type="button"
          className={`pf-dash-card is-${direction} ${card.image ? 'has-custom-image' : ''}`}
          style={
            {
              '--credit-card-color': card.color || '#6d5dfc',
              ...(card.image
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.75) 100%), url("${card.image}")`,
                  }
                : {}),
            } as React.CSSProperties
          }
          onClick={() => onOpenCard(card.id)}
          onTouchStart={event => {
            touchStart.current = event.touches[0].clientX
          }}
          onTouchEnd={event => {
            const start = touchStart.current
            touchStart.current = null
            if (start === null) return
            const dx = event.changedTouches[0].clientX - start
            if (Math.abs(dx) > 45 && cards.length > 1) {
              event.preventDefault()
              go(dx < 0 ? 1 : -1)
            }
          }}
          aria-label={`Ver detalhes do cartão ${card.name}`}
        >
          <span className="pf-dash-card-top">
            <strong>{card.name}</strong>
            <CreditCard size={24} />
          </span>
          <span className="pf-dash-card-bank">{card.bank}</span>
        </button>

        <button type="button" className="card-carousel-arrow" onClick={() => go(1)} disabled={cards.length <= 1} aria-label="Próximo cartão">
          <ChevronRight size={20} />
        </button>
      </div>

      {cards.length > 1 && (
        <div className="card-carousel-indicators">
          {cards.map((item, dot) => (
            <button
              key={item.id}
              type="button"
              className={`card-carousel-dot ${dot === safeIndex ? 'active' : ''}`}
              onClick={() => {
                setDirection(dot > safeIndex ? 'next' : 'prev')
                setIndex(dot)
              }}
              aria-label={`Mostrar cartão ${dot + 1}`}
              aria-current={dot === safeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}

      <div className="pf-dash-card-invoice" style={{ '--credit-card-color': card.color || '#6d5dfc' } as React.CSSProperties}>
        <span>Fatura de {card.invoiceMonth ? monthName(card.invoiceMonth) : 'este mês'}</span>
        <strong>{money(invoice)}</strong>
        <small>{card.invoiceDueDate && <>Vence em {formatDay(card.invoiceDueDate)} · </>}{invoice <= 0 ? 'Sem compras nesta fatura' : paid >= invoice ? 'Paga' : paid > 0 ? `Falta ${money(invoice - paid)}` : 'Em aberto'}</small>
      </div>

      <p className="dashboard-card-stack-hint">Toque no cartão para ver os detalhes e pagar a fatura.</p>
    </div>
  )
}
