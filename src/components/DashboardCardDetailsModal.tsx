
import { useEffect, useState } from 'react'
import { CreditCard, X } from 'lucide-react'

type CardDetails = {
  id: string
  name: string
  bank: string
  color?: string
  image?: string
  closingDay: number
  dueDay: number
  financial: {
    limit: number
    usedLimit: number
    availableLimit: number
    pendingInvoice: number
  }
}

type Props = {
  card: CardDetails | null
  onClose: () => void
  onViewInvoices: (cardId: string) => void
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export default function DashboardCardDetailsModal({
  card,
  onClose,
  onViewInvoices,
}: Props) {
    
const [isClosing, setIsClosing] = useState(false)
useEffect(() => {
  if (card) {
    setIsClosing(false)
  }
}, [card])

useEffect(() => {
  if (!card || !isClosing) return

  const timeout = window.setTimeout(() => {
    onClose()
  }, 250)

  return () => window.clearTimeout(timeout)
}, [card, isClosing, onClose])

useEffect(() => {
  if (!card) return

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setIsClosing(true)
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}, [card])

function handleCloseAnimated() {
  if (isClosing) return
  setIsClosing(true)
}


  if (!card) return null

  return (
    <div
      className={`dashboard-card-modal-overlay ${
  isClosing ? 'is-closing' : ''
}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          handleCloseAnimated()
        }
      }}
    >
      <section
        className="dashboard-card-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-card-modal-title"
      >
        <div className="dashboard-card-modal-heading">
          <div>
            <span>MEUS CARTÕES</span>
            <h2 id="dashboard-card-modal-title">
              Detalhes do cartão
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCloseAnimated}
            aria-label="Fechar detalhes"
            className="dashboard-card-modal-close"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="dashboard-card-modal-preview"
          style={{
            backgroundColor: card.color || '#7044b9',
            ...(card.image
              ? {
                  backgroundImage: `
                    linear-gradient(
                      rgba(8, 12, 22, 0.25),
                      rgba(8, 12, 22, 0.7)
                    ),
                    url("${card.image}")
                  `,
                }
              : {}),
          }}
        >
          <div className="dashboard-card-modal-preview-top">
            <strong>{card.bank}</strong>
            <CreditCard size={24} />
          </div>

          <strong>{card.name}</strong>
        </div>

        <div className="dashboard-card-modal-grid">
          <div>
            <span>Limite total</span>
            <strong>{formatMoney(card.financial.limit)}</strong>
          </div>

          <div>
            <span>Limite disponível</span>
            <strong>
              {formatMoney(card.financial.availableLimit)}
            </strong>
          </div>

          <div>
            <span>Limite utilizado</span>
            <strong>
              {formatMoney(card.financial.usedLimit)}
            </strong>
          </div>

          <div>
            <span>Fatura pendente</span>
            <strong>
              {formatMoney(card.financial.pendingInvoice)}
            </strong>
          </div>

          <div>
            <span>Fechamento</span>
            <strong>Dia {card.closingDay}</strong>
          </div>

          <div>
            <span>Vencimento</span>
            <strong>Dia {card.dueDay}</strong>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-card-modal-action"
          onClick={() => onViewInvoices(card.id)}
        >
          Visualizar faturas
        </button>
      </section>
    </div>
  )
}
