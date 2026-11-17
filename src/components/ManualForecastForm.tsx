
import { useState } from 'react'
import DatePicker from './DatePicker'
import type { ManualForecast } from '../services/manualForecastStorage'
import SelectField from './SelectField'

type ManualForecastFormProps = {
  initialValue?: ManualForecast | null
  onSave: (forecast: ManualForecast) => void
  onCancel: () => void
}

export default function ManualForecastForm({
  initialValue,
  onSave,
}: ManualForecastFormProps) {
  const [description, setDescription] = useState(
    initialValue?.description ?? ''
  )

  const [type, setType] = useState<'income' | 'expense'>(
    initialValue?.type ?? 'expense'
  )

  const [amount, setAmount] = useState(
    initialValue ? String(initialValue.amount) : ''
  )

  const [date, setDate] = useState(
    initialValue?.date ?? ''
  )

  const [error, setError] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const numericAmount = Number(amount)
    const cents = Math.round(numericAmount * 100)

    if (!description.trim()) {
      setError('Informe uma descrição.')
      return
    }

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isSafeInteger(cents) ||
      Math.abs(numericAmount * 100 - cents) > 0.000001
    ) {
      setError('Informe um valor válido com até duas casas decimais.')
      return
    }

    if (!date) {
      setError('Selecione uma data prevista.')
      return
    }

    setError('')

    onSave({
      id: initialValue?.id ?? crypto.randomUUID(),
      description: description.trim(),
      type,
      amount: cents / 100,
      date,
    })
  }

  return (
    <form className="manual-forecast-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="forecast-description">
          Descrição
        </label>

        <input
          id="forecast-description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Ex.: Conta de energia"
          maxLength={120}
          required
        />
      </div>

    
<div className="form-group">
  <label htmlFor="forecast-type">
    Tipo de previsão
  </label>

  <SelectField
    id="forecast-type"
    value={type}
    onChange={value =>
      setType(value as 'income' | 'expense')
    }
    options={[
      {
        value: 'income',
        label: 'Entrada prevista',
      },
      {
        value: 'expense',
        label: 'Saída prevista',
      },
    ]}
  />
</div>


      <div className="form-group">
        <label htmlFor="forecast-amount">
          Valor (R$)
        </label>

        <input
          id="forecast-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          placeholder="0,00"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="forecast-date">
          Data prevista
        </label>

        <DatePicker
          id="forecast-date"
          value={date}
          onChange={setDate}
          required
        />
      </div>

      {error && (
        <p role="alert" className="manual-forecast-error">
          {error}
        </p>
      )}

      <div className="manual-forecast-actions">

        <button type="submit" className="primary-button">
          {initialValue ? 'Salvar alterações' : 'Adicionar previsão'}
        </button>
      </div>
    </form>
  )
}
