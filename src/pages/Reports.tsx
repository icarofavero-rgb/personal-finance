
import { useMemo, useState } from 'react'
import { calculateFinancialProjection } from '../services/financialProjection'
import { getTransactions } from '../services/storage'
import { getCards } from '../services/cardsStorage'
import { getCardPurchases } from '../services/cardPurchasesStorage'
import { getCardPayments } from '../services/cardPaymentsStorage'
import { getCardInvoices } from '../services/cardInvoices'
import { FinanceCharts } from '../components/FinanceCharts'
import type { Transaction } from '../services/storage'
import MonthPicker from '../components/MonthPicker'
import SelectField from '../components/SelectField'
import FinancialComparisonCharts from '../components/FinancialComparisonCharts'
import Deferred from '../components/Deferred'
import CardSpendingChart from '../components/CardSpendingChart'

type ReportsProps = {
  transactions: Transaction[]
}

type Period = 'all' | 'month' | 'year'

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export default function Reports({ transactions }: ReportsProps) {
  const [period, setPeriod] = useState<Period>('all')

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  )

  // Fluxo financeiro projetado: o mesmo cálculo do Dashboard (8 meses,
  // com as faturas dos cartões), começando no mês escolhido.
  const projectionStart = period === 'month' ? selectedMonth : new Date().toLocaleDateString('en-CA').slice(0, 7)
  const projection = useMemo(() => {
    void transactions
    const [year, month] = projectionStart.split('-').map(Number)
    const cards = getCards()
    return calculateFinancialProjection({
      transactions: getTransactions(),
      invoices: getCardInvoices(getCardPurchases(), cards),
      payments: getCardPayments(),
      referenceDate: new Date(year, month - 1, 1),
      months: 8,
    })
  }, [projectionStart, transactions])

  const filteredTransactions = transactions.filter(item => {
    if (period === 'month') {
      return item.date.startsWith(selectedMonth)
    }

    if (period === 'year') {
      return item.date.startsWith(`${selectedYear}-`)
    }

    return true
  })

  const income = filteredTransactions
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)

  const expenses = filteredTransactions
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)

  const balance = income - expenses

  return (
    <div className="reports-page">

<header className="reports-header">
  <div className="reports-heading-content">
    <span className="reports-eyebrow">
      ANÁLISE FINANCEIRA
    </span>

    <h1>
      Meus relatórios<span className="neon-dot">.</span>
    </h1>

    <p>
      Acompanhe seus resultados e entenda suas finanças.
    </p>
  </div>
</header>

      <section className="reports-filters">
        <div className="reports-filter-heading">
          <h3>Período de análise</h3>
          <p>Escolha quais movimentações deseja visualizar.</p>
        </div>

        <div className="reports-filter-controls">
          <div className="reports-filter-field">
            <label htmlFor="report-period">Visualização</label>
           <SelectField
  id="report-period"
  value={period}
  onChange={value => setPeriod(value as Period)}
  options={[
    { value: 'all', label: 'Todo o período' },
    { value: 'month', label: 'Mensal' },
    { value: 'year', label: 'Anual' },
  ]}
  placeholder="Selecione o período"
/>
          </div>

         {period === 'month' && (
  <div className="reports-filter-field">
    <label htmlFor="report-month">Mês</label>

    <MonthPicker
      id="report-month"
      value={selectedMonth}
      onChange={setSelectedMonth}
    />
  </div>
)}

          {period === 'year' && (
            <div className="reports-filter-field">
              <label htmlFor="report-year">Ano</label>
              <input
                id="report-year"
                type="number"
                min="2026"
                max="2040"
                value={selectedYear}
                onChange={event =>
                  setSelectedYear(event.target.value)
                }
              />
            </div>
          )}
        </div>
      </section>

      <div className="reports-summary">
        <div className="reports-summary-card">
          <span>Total de entradas</span>
          <strong>{formatMoney(income)}</strong>
        </div>

        <div className="reports-summary-card">
          <span>Total de saídas</span>
          <strong>{formatMoney(expenses)}</strong>
        </div>

        <div className="reports-summary-card">
          <span>Resultado financeiro</span>
          <strong>{formatMoney(balance)}</strong>
        </div>
      </div>

      <Deferred minHeight={760}>
      <FinanceCharts
        transactions={filteredTransactions}
        projection={projection}
        extraChart={<CardSpendingChart month={period === 'month' ? selectedMonth : new Date().toLocaleDateString('en-CA').slice(0, 7)} />}
      />

<FinancialComparisonCharts
  transactions={filteredTransactions}
  categoryTransactions={
    period === 'month'
      ? transactions.filter(transaction => {
          const [year, month] = selectedMonth
            .split('-')
            .map(Number)

          const start = new Date(year, month - 6, 1)

          const startMonth = [
            start.getFullYear(),
            String(start.getMonth() + 1).padStart(2, '0'),
          ].join('-')

          const transactionMonth = transaction.date.slice(0, 7)

          return (
            transactionMonth >= startMonth &&
            transactionMonth <= selectedMonth
          )
        })
      : filteredTransactions
  }
  
categoryEndMonth={
  period === 'month'
    ? selectedMonth
    : period === 'year'
      ? `${selectedYear}-12`
      : (() => {
          const months = transactions
            .map(item => item.date.slice(0, 7))
            .filter(month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
            .sort()

          return months.length > 0
            ? months[months.length - 1]
            : undefined
        })()
}

/>
      </Deferred>

    </div>
  )
}
