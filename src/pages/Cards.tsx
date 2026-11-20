import BrandIcon from '../components/BrandIcon'
import { useEffect, useRef, useState } from 'react'
import { getDebtorsData } from '../services/debtors/debtorsStorage'
import ConfirmDialog from '../components/ConfirmDialog'
import MonthPicker from '../components/MonthPicker'
import SelectField from '../components/SelectField'
import CardSpendingChart from '../components/CardSpendingChart'
import { getCardInvoiceDueDate } from '../services/cardInvoiceDueDate'
import {
  Palette,
  X,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
} from 'lucide-react'

import {
  getCards,
  saveCards,
  DEFAULT_CARD_COLOR,
  CARD_COLORS,
  type CreditCard,
} from '../services/cardsStorage'

import {
  getCardPurchases,
  saveCardPurchases,
  type CardPurchase,
} from '../services/cardPurchasesStorage'

import {
  calculateInstallments,
  getCardInvoices,
} from '../services/cardInvoices'

import { getCardPayments } from '../services/cardPaymentsStorage'

import { calculateInvoicePayment } from '../services/cardPaymentsCalculations'

import CardPaymentForm from '../components/CardPaymentForm'

import { registerCardPayment } from '../services/cardPaymentOperations'

import { checkPaymentSafety } from '../services/cardPaymentSafety'

import { calculateCardUsedLimitCents } from '../services/cardDashboard'

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

type CardsProps = {
  onPaymentRegistered?: () => void
  onCardsChanged?: () => void
}

export default function Cards({
  onPaymentRegistered,
  onCardsChanged,
}: CardsProps) {
  const [cards, setCards] = useState<CreditCard[]>(getCards)
const [isCardFormOpen, setIsCardFormOpen] = useState(false)
const [editingCardId, setEditingCardId] = useState<string | null>(null)
const [cardToDelete, setCardToDelete] = useState<string | null>(null)
const [editName, setEditName] = useState('')
const [editBank, setEditBank] = useState('')
const [editLimit, setEditLimit] = useState('')
const [editClosingDay, setEditClosingDay] = useState('')
const [editDueDay, setEditDueDay] = useState('')

  const [customizingCardId, setCustomizingCardId] =
  useState<string | null>(null)

  const [closingCardModal, setClosingCardModal] = useState<
  'edit' | 'customize' | null
>(null)

const cardModalTimer = useRef<
  ReturnType<typeof setTimeout> | null
>(null)

  const [selectedCardColor, setSelectedCardColor] =
  useState(DEFAULT_CARD_COLOR)

  const [selectedCardImage, setSelectedCardImage] =
  useState<string | null>(null)

  const [activeCardIndex, setActiveCardIndex] = useState(0)

  const [newCardColor, setNewCardColor] =
  useState(DEFAULT_CARD_COLOR)

  // Mês mostrado em "Compras no cartão" e "Minhas faturas"
  const [cardsMonth, setCardsMonth] = useState(() => new Date().toLocaleDateString('en-CA').slice(0, 7))


const [, setExpandedInvoiceMonths] =
  useState<string[]>([])

  const [invoiceCardFilter, setInvoiceCardFilter] = useState('all')

  const [purchases, setPurchases] =
  useState<CardPurchase[]>(getCardPurchases)

  const invoices = getCardInvoices(purchases, cards)

// Compras no cartão do mês escolhido: as feitas no mês e também as
// parcelas de compras antigas que caem nas faturas deste mês.
const monthPurchaseRows = purchases
  .map(purchase => {
    const card = cards.find(item => item.id === purchase.cardId)
    let installments: ReturnType<typeof calculateInstallments> = []
    try {
      installments = card ? calculateInstallments(purchase, card) : []
    } catch {
      installments = []
    }
    const installment = installments.find(item => item.invoiceMonth === cardsMonth)
    return { purchase, card, installment, installments }
  })
  .filter(row => row.installment || row.purchase.date.slice(0, 7) === cardsMonth)
  .sort((a, b) => b.purchase.date.localeCompare(a.purchase.date))

// Minhas faturas: a fatura do mês de TODOS os cartões (mesmo sem compras),
// com filtro de cartão compartilhado com o gráfico "Despesas dos cartões"
const monthInvoiceList = cards
  .filter(card => invoiceCardFilter === 'all' || card.id === invoiceCardFilter)
  .map(
    card =>
      invoices.find(invoice => invoice.cardId === card.id && invoice.invoiceMonth === cardsMonth) ?? {
        cardId: card.id,
        invoiceMonth: cardsMonth,
        total: 0,
        installments: [],
      }
  )
  .sort((a, b) => b.total - a.total)


  const [payments, setPayments] = useState(getCardPayments)

function handleRegisterPayment(
  cardId: string,
  invoiceMonth: string,
  amount: number,
  date: string
) {
  const safety = checkPaymentSafety()

  if (!safety.safe) {
    alert(safety.message)
    return
  }

  try {
    registerCardPayment({
      id: crypto.randomUUID(),
      cardId,
      invoiceMonth,
      amount,
      date,
    })

   setPayments(getCardPayments())

onPaymentRegistered?.()

alert('Pagamento registrado com sucesso!')
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível registrar o pagamento.'

    alert(message)
  }
}

function getInvoicePaymentSummary(
  cardId: string,
  invoiceMonth: string,
  invoiceTotal: number
) {
  return calculateInvoicePayment(
    invoiceTotal,
    payments,
    cardId,
    invoiceMonth
  )
}

  const [purchaseCardId] = useState('')
  const [purchaseDescription, setPurchaseDescription] = useState('')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [purchaseCategory, setPurchaseCategory] = useState('Outros')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseInstallments, setPurchaseInstallments] = useState('1')

  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('10')
  const [dueDay, setDueDay] = useState('17')
  
function handleAddPurchase(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()

  const amount = Number(purchaseAmount)
  const installments = Number(purchaseInstallments)

  if (!cards.some(card => card.id === purchaseCardId)) {
    alert('Selecione um cartão válido.')
    return
  }

  if (
    !purchaseDescription.trim() ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 120 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)
  ) {
    alert('Confira os dados da compra.')
    return
  }

  const newPurchase: CardPurchase = {
    id: crypto.randomUUID(),
    cardId: purchaseCardId,
    description: purchaseDescription.trim(),
    amount,
    category: purchaseCategory,
    date: purchaseDate,
    installments,
  }

  try {
    const updated = [...purchases, newPurchase]

    saveCardPurchases(updated)
    setPurchases(updated)
    onCardsChanged?.()

    setPurchaseDescription('')
    setPurchaseAmount('')
    setPurchaseCategory('Outros')
    setPurchaseDate('')
    setPurchaseInstallments('1')

    alert('Compra cadastrada com sucesso!')
  } catch {
    alert('Não foi possível salvar a compra.')
  }
}
void handleAddPurchase

  function handleAddCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedLimit = Number(limit)
    const closing = Number(closingDay)
    const due = Number(dueDay)

    if (
      !name.trim() ||
      !bank.trim() ||
      !Number.isFinite(parsedLimit) ||
      parsedLimit <= 0 ||
      !Number.isInteger(closing) ||
      closing < 1 ||
      closing > 31 ||
      !Number.isInteger(due) ||
      due < 1 ||
      due > 31
    ) {
      alert('Confira os dados do cartão.')
      return
    }

 const newCard: CreditCard = {
  id: crypto.randomUUID(),
  name: name.trim(),
  bank: bank.trim(),
  limit: parsedLimit,
  closingDay: closing,
  dueDay: due,
  color: newCardColor,
}

    const updated = [...cards, newCard]

    setCards(updated)
    saveCards(updated)
    onCardsChanged?.()
    setName('')
    setBank('')
    setLimit('')
    setClosingDay('10')
    setDueDay('17')
    setNewCardColor(DEFAULT_CARD_COLOR)
  }



function handleDeleteCard(id: string) {
  try {
    const debtorsData = getDebtorsData()

    const cardPurchaseIds = new Set(
      purchases
        .filter(purchase => purchase.cardId === id)
        .map(purchase => purchase.id)
    )

    const hasLinkedDebts = debtorsData.debts.some(
      debt =>
        debt.cardPurchaseId !== undefined &&
        cardPurchaseIds.has(debt.cardPurchaseId)
    )

    if (hasLinkedDebts) {
      alert(
        'Este cartão possui compras vinculadas a devedores. ' +
        'Por segurança, não é possível excluí-lo enquanto ' +
        'existirem esses vínculos.'
      )
      return
    }

    // Abre o modal personalizado.
    // Nenhum cartão é excluído aqui.
    // Garante que a personalização esteja fechada
setCustomizingCardId(null)

// Abre a confirmação de exclusão
setCardToDelete(id)
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : 'Não foi possível verificar os vínculos do cartão.'
    )
  }
}


function handleConfirmDeleteCard() {
  const id = cardToDelete
  if (!id) return

  try {
    // Reconsulta os vínculos antes de excluir.
    const debtorsData = getDebtorsData()

    const cardPurchaseIds = new Set(
      purchases
        .filter(purchase => purchase.cardId === id)
        .map(purchase => purchase.id)
    )

    const hasLinkedDebts = debtorsData.debts.some(
      debt =>
        debt.cardPurchaseId !== undefined &&
        cardPurchaseIds.has(debt.cardPurchaseId)
    )

    if (hasLinkedDebts) {
      setCardToDelete(null)

      alert(
        'A exclusão foi cancelada porque este cartão ' +
        'possui compras vinculadas a devedores.'
      )
      return
    }

    // Preserva a lógica original de armazenamento.
    const updated = cards.filter(card => card.id !== id)

    saveCards(updated)
    setCards(updated)
    onCardsChanged?.()

    setCardToDelete(null)
  } catch (error) {
    setCardToDelete(null)

    alert(
      error instanceof Error
        ? error.message
        : 'Não foi possível excluir o cartão.'
    )
  }
}


  function goToPreviousCard() {
  if (cards.length <= 1) return

  setActiveCardIndex(current =>
    (current - 1 + cards.length) % cards.length
  )
}

function goToNextCard() {
  if (cards.length <= 1) return

  setActiveCardIndex(current =>
    (current + 1) % cards.length
  )
}

const safeActiveCardIndex =
  cards.length > 0
    ? Math.min(activeCardIndex, cards.length - 1)
    : 0

const activeCard = cards[safeActiveCardIndex]

function closeCardModal(mode: 'edit' | 'customize') {
  if (closingCardModal !== null) return

  if (mode === 'edit' && editingCardId === null) return
  if (mode === 'customize' && customizingCardId === null) return

  setClosingCardModal(mode)

  if (cardModalTimer.current !== null) {
    clearTimeout(cardModalTimer.current)
  }

  cardModalTimer.current = setTimeout(() => {
    if (mode === 'edit') {
      setEditingCardId(null)
    } else {
      setCustomizingCardId(null)
    }

    setClosingCardModal(null)
    cardModalTimer.current = null
  }, 250)
}

useEffect(() => {
  if (editingCardId === null && customizingCardId === null) {
    return
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

    event.preventDefault()

    if (editingCardId !== null) {
      closeCardModal('edit')
    } else if (customizingCardId !== null) {
      closeCardModal('customize')
    }
  }

  window.addEventListener('keydown', handleEscape)

  return () => {
    window.removeEventListener('keydown', handleEscape)
  }
})

useEffect(() => {
  return () => {
    if (cardModalTimer.current !== null) {
      clearTimeout(cardModalTimer.current)
    }
  }
}, [])

function openCardEditor(card: CreditCard) {
  setEditingCardId(card.id)
  setEditName(card.name)
  setEditBank(card.bank)
  setEditLimit(String(card.limit))
  setEditClosingDay(String(card.closingDay))
  setEditDueDay(String(card.dueDay))
}

function handleSaveCardEdit(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault()

  if (!editingCardId) return

  const originalCard = cards.find(
    card => card.id === editingCardId
  )

  if (!originalCard) {
    alert('Cartão não encontrado.')
    return
  }

  const parsedLimit = Number(editLimit)
  const closing = Number(editClosingDay)
  const due = Number(editDueDay)

  if (
    !editName.trim() ||
    !editBank.trim() ||
    !Number.isFinite(parsedLimit) ||
    parsedLimit <= 0 ||
    !Number.isInteger(closing) ||
    closing < 1 ||
    closing > 31 ||
    !Number.isInteger(due) ||
    due < 1 ||
    due > 31
  ) {
    alert('Confira os dados do cartão.')
    return
  }

  const hasPurchases = purchases.some(
    purchase => purchase.cardId === editingCardId
  )

  if (
    closing !== originalCard.closingDay &&
    hasPurchases
  ) {
    alert(
      'Este cartão já possui compras. Alterar o fechamento pode redistribuir parcelas entre faturas existentes. Por segurança, essa alteração está bloqueada.'
    )
    return
  }

  const updated = cards.map(card =>
    card.id === editingCardId
      ? {
          ...card,
          name: editName.trim(),
          bank: editBank.trim(),
          limit: parsedLimit,
          closingDay: closing,
          dueDay: due,
        }
      : card
  )

  try {
    saveCards(updated)
    setCards(updated)
    onCardsChanged?.()
    setEditingCardId(null)
  } catch {
    alert('Não foi possível salvar as alterações.')
  }
}

function openCardCustomization(card: CreditCard) {
  setCustomizingCardId(card.id)
  setSelectedCardColor(card.color ?? DEFAULT_CARD_COLOR)
  setSelectedCardImage(card.image ?? null)
}

function saveCardCustomization() {
  if (!customizingCardId) return

  try {
    const currentCards = getCards()

    const cardExists = currentCards.some(
      card => card.id === customizingCardId
    )

    if (!cardExists) {
      throw new Error('Cartão não encontrado.')
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(selectedCardColor)) {
      throw new Error('Cor inválida.')
    }

    const updatedCards = currentCards.map(card =>
      card.id === customizingCardId
        ? {
            ...card,
            color: selectedCardColor.toUpperCase(),
            image: selectedCardImage ?? undefined,
          }
        : card
    )

    saveCards(updatedCards)

    setCards(updatedCards)
    onCardsChanged?.()
    setCustomizingCardId(null)
  } catch (error) {
    alert(
      error instanceof Error &&
      error.name === 'QuotaExceededError'
        ? 'Espaço de armazenamento insuficiente para salvar a imagem.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível salvar a personalização.'
    )
  }
}

async function handleCardImageUpload(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0]

  if (!file) return

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    alert('Selecione uma imagem PNG, JPG ou WebP.')
    event.target.value = ''
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('A imagem deve ter no máximo 10 MB.')
    event.target.value = ''
    return
  }

  try {
    const image = await createImageBitmap(file)

    try {
      const canvas = document.createElement('canvas')

      const scale = Math.min(
        1,
        1000 / image.width,
        630 / image.height
      )

      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Não foi possível processar a imagem.')
      }

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const compressedImage = canvas.toDataURL(
        'image/webp',
        0.75
      )

      if (compressedImage.length > 400000) {
        throw new Error(
          'A imagem ainda ficou muito grande. Escolha outra.'
        )
      }

      setSelectedCardImage(compressedImage)
    } finally {
      image.close()
    }
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar a imagem.'
    )
  } finally {
    event.target.value = ''
  }
}

function toggleInvoiceMonth(month: string) {
  setExpandedInvoiceMonths(current =>
    current.includes(month)
      ? current.filter(item => item !== month)
      : [...current, month]
  )
}

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function shortMonth(month: string) {
  return new Date(`${month}-01T12:00:00`)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '')
    .replace(' de ', '/')
}

function formatMonth(month: string) {
  const date = new Date(`${month}-01T12:00:00`)

  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}


return (
  <div className="cards-page">
    <div className="cards-page-heading">
      <span className="eyebrow">
        CONTROLE DE CARTÕES
      </span>

      <h1>
        Meus cartões<span className="neon-dot">.</span>
      </h1>

      <p>
        Gerencie seus cartões, acompanhe suas compras
        e organize suas faturas.
      </p>
    </div>


<section
  className={`panel cards-register-section ${
    isCardFormOpen ? 'cards-register-expanded' : ''
  }`}
>
  <button
    type="button"
    className="cards-register-toggle"
    aria-expanded={isCardFormOpen}
    aria-controls="cards-register-form"
    onClick={() => setIsCardFormOpen(previous => !previous)}
  >
    <span>Cadastrar novo cartão</span>

    <span className="cards-register-chevron" aria-hidden="true">
      {isCardFormOpen ? '−' : '+'}
    </span>
  </button>

  <div
    id="cards-register-form"
    className="cards-register-content"
  >
    <form onSubmit={handleAddCard} className="cards-form">

    <label>
      Nome do cartão
      <input
        type="text"
        value={name}
        onChange={event => setName(event.target.value)}
        placeholder="Ex.: Nubank Platinum"
        required
      />
    </label>

    <label>
      Instituição financeira
      <input
        type="text"
        value={bank}
        onChange={event => setBank(event.target.value)}
        placeholder="Ex.: Nubank"
        required
      />
    </label>

    <label>
      Limite total (R$)
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={limit}
        onChange={event => setLimit(event.target.value)}
        required
      />
    </label>

    <label>
      Dia de fechamento
      <input
        type="number"
        min="1"
        max="31"
        value={closingDay}
        onChange={event => setClosingDay(event.target.value)}
        required
      />
    </label>

    <label>
      Dia de vencimento
      <input
        type="number"
        min="1"
        max="31"
        value={dueDay}
        onChange={event => setDueDay(event.target.value)}
        required
      />
    </label>

<div className="new-card-color-section">
  <span className="new-card-color-title">
    Cor do cartão
  </span>

  <div className="new-card-color-options">
    {CARD_COLORS.map(color => (
      <button
        key={color.value}
        type="button"
        className={`new-card-color-option ${
          newCardColor.toUpperCase() === color.value.toUpperCase()
            ? 'selected'
            : ''
        }`}
        style={{ backgroundColor: color.value }}
        title={color.name}
        aria-label={`Selecionar cor ${color.name}`}
        aria-pressed={
          newCardColor.toUpperCase() === color.value.toUpperCase()
        }
        onClick={() => setNewCardColor(color.value)}
      />
    ))}

    <label className="new-card-custom-hex">
  Cor personalizada

  <input
    type="text"
    value={newCardColor}
    maxLength={7}
    placeholder="#22D3EE"
    onChange={event => {
      const value = event.target.value

      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        setNewCardColor(value)
      }
    }}
  />
</label>
  </div>
</div>

    <button
  type="submit"
  className="primary-button new-card-submit"
>
  Salvar cartão
</button>
  </form>
    </div>
</section>
      <section className="panel cards-purchases-section">
  <div className="pf-cards-section-heading">
    <h3>Compras no cartão</h3>
    <div className="pf-cards-month">
      <MonthPicker id="cards-purchases-month" value={cardsMonth} onChange={value => value && setCardsMonth(value)} />
    </div>
  </div>

  {monthPurchaseRows.length === 0 ? (
    <p className="pf-cards-empty">Nenhuma compra ou parcela em {formatMonth(cardsMonth)}.</p>
  ) : (
    <div className="monthly-groups">
      <div className="monthly-group">
        <div className="monthly-group-header">
          <span>{formatMonth(cardsMonth)}</span>
          <span>
            {monthPurchaseRows.length} {monthPurchaseRows.length === 1 ? 'item' : 'itens'} · {formatMoney(monthPurchaseRows.reduce((sum, row) => sum + (row.installment?.amount ?? 0), 0))} nas faturas do mês
          </span>
        </div>

        <div className="cards-list monthly-group-content">
          {monthPurchaseRows.map(({ purchase, card, installment, installments }) => {
            const boughtThisMonth = purchase.date.slice(0, 7) === cardsMonth

            return (
              <div className="purchase-item" key={purchase.id}>
                <div className="pf-purchase-top">
                  <h3 className="pf-tx-title"><BrandIcon description={purchase.description} />{purchase.description}</h3>
                  <strong>{formatMoney(installment?.amount ?? purchase.amount)}</strong>
                </div>

                <p className="pf-purchase-meta">
                  <span className="pf-purchase-card" style={{ '--chip-color': card?.color ?? DEFAULT_CARD_COLOR } as React.CSSProperties}>
                    {card?.name ?? 'Cartão não encontrado'}
                  </span>
                  <span>{purchase.category}</span>
                </p>

                {purchase.notes && <p className="pf-tx-notes">{purchase.notes}</p>}

                <div className="pf-purchase-facts">
                  <span>
                    <small>Compra</small>
                    {formatDay(purchase.date)}
                  </span>
                  <span>
                    <small>Parcela</small>
                    {installment
                      ? `${installment.installmentNumber} de ${installment.totalInstallments}`
                      : purchase.installments === 1
                        ? 'À vista'
                        : `${purchase.installments}x`}
                  </span>
                  <span>
                    <small>Valor da parcela</small>
                    {formatMoney(installment?.amount ?? installments[0]?.amount ?? purchase.amount)}
                  </span>
                  <span>
                    <small>Total</small>
                    {formatMoney(purchase.amount)}
                  </span>
                </div>

                {!installment && boughtThisMonth && installments[0] && (
                  <p className="pf-purchase-once">
                    Comprada neste mês · a 1ª parcela entra na fatura de {formatMonth(installments[0].invoiceMonth)}
                  </p>
                )}

                {installments.length > 1 && (
                  <div className="pf-purchase-parcels">
                    {installments.map(item => (
                      <span
                        className={`pf-purchase-parcel ${item.invoiceMonth === cardsMonth ? 'is-current' : ''} ${item.invoiceMonth < cardsMonth ? 'is-past' : ''}`}
                        key={`${item.purchaseId}-${item.installmentNumber}`}
                        title={`Fatura de ${formatMonth(item.invoiceMonth)}`}
                      >
                        {item.installmentNumber}/{item.totalInstallments} · {shortMonth(item.invoiceMonth)} · {formatMoney(item.amount)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )}
</section>

<div className="pf-cards-invoices-row">
<section className="panel cards-invoices-section">
  <div className="pf-cards-section-heading">
    <h3>Minhas faturas</h3>
    <div className="pf-cards-filters">
      {cards.length > 1 && (
        <div className="pf-cards-card-filter">
          <SelectField
            id="cards-invoices-card"
            value={invoiceCardFilter}
            onChange={setInvoiceCardFilter}
            options={[{ value: 'all', label: 'Todos os cartões' }, ...cards.map(card => ({ value: card.id, label: card.name }))]}
            placeholder="Cartão"
          />
        </div>
      )}
      <div className="pf-cards-month">
        <MonthPicker id="cards-invoices-month" value={cardsMonth} onChange={value => value && setCardsMonth(value)} />
      </div>
    </div>
  </div>

  {monthInvoiceList.length === 0 ? (
    <p className="pf-cards-empty">Cadastre um cartão para ver as faturas.</p>
  ) : (
    <div className="monthly-groups">
      {([[cardsMonth, monthInvoiceList]] as const).map(([month, monthInvoices]) => {
        const expanded = true

        return (
          <div className="monthly-group" key={month}>
            <button
              type="button"
              className="monthly-group-header"
              aria-expanded={expanded}
              onClick={() => toggleInvoiceMonth(month)}
            >
              <span>{formatMonth(month)}</span>

              <span>
                {monthInvoices.length} {monthInvoices.length === 1 ? 'fatura' : 'faturas'}
                {' '}
                
              </span>
            </button>

            {expanded && (
              <div className="invoices-grid monthly-group-content">
                {monthInvoices.map(invoice => {
                  const card = cards.find(
                    item => item.id === invoice.cardId
                  )

                  const paymentSummary = getInvoicePaymentSummary(
                    invoice.cardId,
                    invoice.invoiceMonth,
                    invoice.total
                  )

                  return (
                    <article
                      className="invoice-item"
                      key={`${invoice.cardId}-${invoice.invoiceMonth}`}
                    >
                      <div className="invoice-header">
                        <div>
                          <small>
                            {card?.name ?? 'Cartão não encontrado'}
                          </small>
                          <h4>Fatura de {formatMonth(invoice.invoiceMonth)}</h4>
                        </div>

                        <strong>{formatMoney(invoice.total)}</strong>
                      </div>

                      <div className="invoice-installments">
                        {invoice.installments.map(installment => (
                          <div
                            className="invoice-installment-row"
                            key={`${installment.purchaseId}-${installment.installmentNumber}`}
                          >
                            <span>
                              <BrandIcon description={installment.description} size={16} />{installment.description}
                              {' ('}
                              {installment.installmentNumber}/
                              {installment.totalInstallments}
                              {')'}
                            </span>

                            <strong>
                              {formatMoney(installment.amount)}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div className="pf-invoice-status">
                        <span className={`pf-invoice-badge is-${invoice.total === 0 ? 'empty' : paymentSummary.status}`}>
                          {invoice.total === 0
                            ? 'Sem compras'
                            : paymentSummary.status === 'unpaid'
                            ? 'Não paga'
                            : paymentSummary.status === 'partial'
                              ? 'Parcialmente paga'
                              : paymentSummary.status === 'paid'
                                ? 'Paga'
                                : 'Pagamento excedente'}
                        </span>
                        {card && <span>Vence {formatDay(getCardInvoiceDueDate(invoice.invoiceMonth, card.dueDay, card.closingDay))}</span>}
                        <span>Pago {formatMoney(paymentSummary.totalPaid)}</span>
                        {paymentSummary.remaining > 0 && <span>Falta {formatMoney(paymentSummary.remaining)}</span>}
                        {paymentSummary.overpayment > 0 && <span>Crédito {formatMoney(paymentSummary.overpayment)}</span>}
                      </div>

                      {paymentSummary.remaining > 0 && (
                        <details className="pf-invoice-pay">
                          <summary>Registrar pagamento</summary>

                          <CardPaymentForm
                            remaining={paymentSummary.remaining}
                            onSubmit={(amount, date) => {
                              handleRegisterPayment(
                                invoice.cardId,
                                invoice.invoiceMonth,
                                amount,
                                date
                              )
                            }}
                          />
                        </details>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )}
</section>

<CardSpendingChart
  month={cardsMonth}
  revision={purchases.length * 1000 + payments.length + cards.length}
  selectedCardId={invoiceCardFilter}
  onSelectCard={setInvoiceCardFilter}
/>
</div>

      <section className="cards-list cards-owned-section">
<div className="card-carousel-heading">
  <h3>Cartões cadastrados</h3>

    <span>
      {cards.length > 0
        ? `${safeActiveCardIndex + 1} de ${cards.length}`
        : '0 cartões'}
    </span>
  </div>

  <p>Compras registradas: {purchases.length}</p>

  {!activeCard ? (
    <p>Nenhum cartão cadastrado ainda.</p>
  ) : (
    <div
      className="card-carousel"
      style={{
        '--credit-card-color':
          activeCard.color ?? DEFAULT_CARD_COLOR,
      } as React.CSSProperties}
    >
      <div className="card-carousel-navigation">
        <button
          type="button"
          className="card-carousel-arrow"
          onClick={goToPreviousCard}
          disabled={cards.length <= 1}
          aria-label="Cartão anterior"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="card-carousel-stage">
          <div
  key={activeCard.id}
  className={`card-carousel-visual ${
    activeCard.image ? 'has-custom-image' : ''
  }`}
  style={
    activeCard.image
      ? {
          backgroundImage: `
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.18) 0%,
              rgba(0, 0, 0, 0.35) 50%,
              rgba(0, 0, 0, 0.75) 100%
            ),
            url("${activeCard.image}")
          `,
        }
      : undefined
  }
>
            <div className="card-carousel-visual-top">
              <strong>{activeCard.name}</strong>
              <CreditCardIcon size={24} />
            </div>

            <span>{activeCard.bank}</span>
          </div>
        </div>

        <button
          type="button"
          className="card-carousel-arrow"
          onClick={goToNextCard}
          disabled={cards.length <= 1}
          aria-label="Próximo cartão"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="card-carousel-indicators">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            className={`card-carousel-dot ${
              index === safeActiveCardIndex ? 'active' : ''
            }`}
            onClick={() => setActiveCardIndex(index)}
            aria-label={`Mostrar cartão ${index + 1}`}
            aria-current={
              index === safeActiveCardIndex ? 'true' : undefined
            }
          />
        ))}
      </div>

      <div className="card-carousel-details">
        <h4>Informações do cartão</h4>

        <div className="card-carousel-info-grid">
          <div>
            <span>Limite total</span>
            <strong>{formatMoney(activeCard.limit)}</strong>
          </div>

          <div>
            <span>Limite utilizado</span>
            <strong>
              {formatMoney(
                calculateCardUsedLimitCents(activeCard.id, purchases, payments) / 100
              )}
            </strong>
          </div>

          <div>
            <span>Limite disponível</span>
            <strong>
              {formatMoney(
                Math.max(
                  0,
                  Math.round(activeCard.limit * 100) -
                    calculateCardUsedLimitCents(activeCard.id, purchases, payments)
                ) / 100
              )}
            </strong>
          </div>

          <div>
            <span>Fechamento / Vencimento</span>
            <strong>
              Dia {activeCard.closingDay} / Dia {activeCard.dueDay}
            </strong>
          </div>
        </div>

        <div className="card-carousel-actions">
          <button
            type="button"
            onClick={() => openCardEditor(activeCard)}
          >
            <Pencil size={16} />
            Editar
          </button>

<button
  type="button"
  className="card-personalize-button"
  onClick={() => openCardCustomization(activeCard)}
>
  <Palette size={16} />
  Personalizar
</button>

          <button
  type="button"
  className="card-delete-button"
  onClick={event => {
    event.preventDefault()
    event.stopPropagation()

    console.log('Clique no botão Excluir')

    handleDeleteCard(activeCard.id)
  }}
>
  Excluir
</button>
        </div>
      </div>
    </div>
  )}
</section>
      {editingCardId !== null && (
  <div
    className={`modal-overlay card-modal-overlay ${
  closingCardModal === 'edit' ? 'is-closing' : ''
}`}
onClick={() => closeCardModal('edit')}
  >
    <div
      className="modal card-customization-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-edit-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="card-edit-title">Editar cartão</h2>
          <p>Atualize as informações do seu cartão</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar edição"
          onClick={() => closeCardModal('edit')}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSaveCardEdit} className="card-edit-form">
        <label>
          Nome do cartão
          <input
            value={editName}
            onChange={event => setEditName(event.target.value)}
            required
          />
        </label>

        <label>
          Instituição financeira
          <input
            value={editBank}
            onChange={event => setEditBank(event.target.value)}
            required
          />
        </label>

        <label>
          Limite total (R$)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={editLimit}
            onChange={event => setEditLimit(event.target.value)}
            required
          />
        </label>

        <div className="card-edit-days">
          <label>
            Dia de fechamento
            <input
              type="number"
              min="1"
              max="31"
              value={editClosingDay}
              onChange={event => setEditClosingDay(event.target.value)}
              required
            />
          </label>

          <label>
            Dia de vencimento
            <input
              type="number"
              min="1"
              max="31"
              value={editDueDay}
              onChange={event => setEditDueDay(event.target.value)}
              required
            />
          </label>
        </div>

        <p className="card-edit-warning">
          Alterar o fechamento de um cartão com compras registradas
          está temporariamente bloqueado para proteger as faturas.
        </p>

        <button type="submit" className="primary-button">
          Salvar alterações
        </button>
      </form>
    </div>
    
  </div>
  
)}
      {customizingCardId !== null && (
  <div
    className={`modal-overlay card-modal-overlay ${
  closingCardModal === 'customize' ? 'is-closing' : ''
}`}
onClick={() => closeCardModal('customize')}
  >
    <div
      className="modal card-customization-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-customization-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="card-customization-title">
            Personalizar cartão
          </h2>
          <p>Escolha a cor do seu cartão</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar personalização"
          onClick={() => closeCardModal('customize')}
        >
          <X size={20} />
        </button>
      </div>

      <div
  className="card-customization-preview"
  style={{
    '--preview-color': selectedCardColor,
    backgroundImage: selectedCardImage
      ? `linear-gradient(
          rgba(0, 0, 0, 0.15),
          rgba(0, 0, 0, 0.55)
        ), url("${selectedCardImage}")`
      : undefined,
  } as React.CSSProperties}
>
  <Palette size={28} />

  <span>
    {selectedCardImage
      ? 'Prévia da imagem personalizada'
      : 'Prévia da cor selecionada'}
  </span>
</div>
      <div className="card-customization-colors">
        {CARD_COLORS.map(color => (
          <button
            key={color.value}
            type="button"
            className={`card-color-option ${
              selectedCardColor.toUpperCase() ===
              color.value.toUpperCase()
                ? 'selected'
                : ''
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
            aria-label={`Selecionar cor ${color.name}`}
            aria-pressed={
              selectedCardColor.toUpperCase() ===
              color.value.toUpperCase()
            }
            onClick={() => setSelectedCardColor(color.value)}
          />
        ))}
      </div>

      <label className="card-custom-color-label">
        Cor personalizada
        <input
          type="color"
          value={selectedCardColor}
          onChange={event =>
            setSelectedCardColor(event.target.value)
          }
        />
      </label>
<div className="card-customization-image-section">
  <div className="card-customization-image-heading">
    <strong>Imagem do cartão</strong>
    <span>PNG, JPG ou WebP</span>
  </div>

  <label className="card-image-upload-button">
    <Palette size={17} />
    Escolher imagem

    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      onChange={handleCardImageUpload}
    />
  </label>

  {selectedCardImage && (
    <button
      type="button"
      className="card-image-remove-button"
      onClick={() => setSelectedCardImage(null)}
    >
      <X size={16} />
      Remover imagem
    </button>
  )}

  <p className="card-image-help">
    A imagem será redimensionada automaticamente
    para economizar espaço no armazenamento.
  </p>
</div>

      <button
        type="button"
        className="card-customization-save"
        onClick={saveCardCustomization}
      >
        Salvar personalização
      </button>
    </div>
  </div>
)}
<ConfirmDialog
  open={cardToDelete !== null}
  title="Excluir cartão?"
  message="Deseja realmente excluir este cartão? Essa ação não poderá ser desfeita."
  confirmLabel="Excluir cartão"
  showCloseButton={false}
  onConfirm={handleConfirmDeleteCard}
  onCancel={() => setCardToDelete(null)}
/>
    </div>
  )
}
