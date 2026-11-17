
import { useState } from 'react'
import DatePicker from './DatePicker'

type CardPaymentFormProps = {
  remaining: number
  onSubmit: (amount: number, date: string) => void
}

export default function CardPaymentForm({
  remaining,
  onSubmit,
}: CardPaymentFormProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const numericAmount = Number(amount)
    const cents = Math.round(numericAmount * 100)

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isSafeInteger(cents) ||
      Math.abs(numericAmount * 100 - cents) > 0.000001 ||
      numericAmount > remaining ||
      !date
    ) {
      alert('Confira o valor e a data do pagamento.')
      return
    }

    onSubmit(numericAmount, date)
  }

  return (
    <form onSubmit={handleSubmit} className="cards-form">
      <label>
        Valor do pagamento (R$)
        <input
          type="number"
          min="0.01"
          max={remaining}
          step="0.01"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          required
        />
      </label>

      
<div className="form-group">
  <label htmlFor="card-payment-date">
    Data do pagamento
  </label>

  <DatePicker
    id="card-payment-date"
    value={date}
    onChange={setDate}
    required
  />
</div>


      <button
        type="submit"
        className="primary-button"
        disabled={remaining <= 0}
      >
        Registrar pagamento
      </button>
    </form>
  )
}
