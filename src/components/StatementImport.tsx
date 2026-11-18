import { useMemo, useRef, useState } from 'react'
import { FileUp, Repeat2, Upload } from 'lucide-react'

import PfModal from './PfModal'
import {
  EXPENSE_CATEGORIES,
  findDuplicate,
  INCOME_CATEGORIES,
  parseStatement,
  suggestCategory,
  type StatementEntry,
} from '../services/statementImport'
import { getTransactions, saveTransactions, type Transaction } from '../services/storage'

type Row = StatementEntry & { category: string; selected: boolean; duplicate: 'imported' | 'similar' | null }

type Props = {
  onImported: (count: number) => void
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`

/** Lê o arquivo em UTF-8 ou, se não der, no padrão antigo do Windows (bancos). */
async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

export default function StatementImport({ onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  function close() {
    setOpen(false)
    window.setTimeout(() => {
      setRows(null)
      setError('')
    }, 250)
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setFileName(file.name)

    try {
      const entries = parseStatement(file.name, await readText(file))

      if (entries.length === 0) {
        setRows(null)
        setError('Não encontramos lançamentos nesse arquivo. Use o extrato em OFX ou CSV exportado pelo seu banco.')
        return
      }

      const history = getTransactions()
      setRows(
        entries.map(item => {
          const duplicate = findDuplicate(item, history)
          return { ...item, category: suggestCategory(item, history), duplicate, selected: duplicate === null }
        })
      )
    } catch {
      setRows(null)
      setError('Não foi possível ler esse arquivo.')
    }
  }

  function update(id: string, changes: Partial<Row>) {
    setRows(current => current?.map(row => (row.id === id ? { ...row, ...changes } : row)) ?? null)
  }

  /** Fatura de cartão costuma vir com os sinais trocados. */
  function invertTypes() {
    const history = getTransactions()
    setRows(
      current =>
        current?.map(row => {
          const type = row.type === 'income' ? 'expense' : 'income'
          return { ...row, type, category: suggestCategory({ ...row, type }, history) }
        }) ?? null
    )
  }

  const selected = useMemo(() => rows?.filter(row => row.selected && row.duplicate !== 'imported') ?? [], [rows])
  const totals = selected.reduce(
    (sum, row) => {
      if (row.type === 'income') sum.income += row.amount
      else sum.expense += row.amount
      return sum
    },
    { income: 0, expense: 0 }
  )

  function confirm() {
    if (selected.length === 0) return

    const current = getTransactions()
    const ids = new Set(current.map(item => item.id))
    const added: Transaction[] = selected
      .filter(row => !ids.has(row.id))
      .map(row => ({ id: row.id, description: row.description, amount: row.amount, type: row.type, category: row.category, date: row.date }))

    saveTransactions([...current, ...added])
    onImported(added.length)
    close()
  }

  return (
    <>
      <button type="button" className="pf-recurring-button" onClick={() => setOpen(true)}>
        <FileUp size={16} />
        Importar extrato
      </button>

      <input ref={input} type="file" accept=".ofx,.csv,.txt,text/csv,application/x-ofx" hidden onChange={handleFile} />

      <PfModal
        open={open}
        className="is-wide"
        title="Importar extrato do banco"
        subtitle="No app ou site do seu banco, exporte o extrato em OFX ou CSV e escolha o arquivo aqui."
        onClose={close}
      >
        {!rows ? (
          <div className="pf-import-start">
            <button type="button" className="pf-import-drop" onClick={() => input.current?.click()}>
              <Upload size={30} />
              <strong>Escolher arquivo do extrato</strong>
              <small>OFX (recomendado) ou CSV · Nubank, Inter, Itaú, Bradesco, BB, Caixa, Santander...</small>
            </button>
            {error && <p className="pf-import-error" role="alert">{error}</p>}
          </div>
        ) : (
          <div className="pf-import-review">
            <div className="pf-import-toolbar">
              <span>
                <strong>{fileName}</strong> · {rows.length} lançamentos
              </span>
              <button type="button" className="pf-import-small" onClick={invertTypes} title="Use se as entradas vierem como saídas (fatura de cartão)">
                <Repeat2 size={15} /> Inverter entradas/saídas
              </button>
              <button type="button" className="pf-import-small" onClick={() => input.current?.click()}>
                Outro arquivo
              </button>
            </div>

            <ul className="pf-import-list">
              {rows.map(row => (
                <li key={row.id} className={`pf-import-row ${row.selected && row.duplicate !== 'imported' ? '' : 'is-off'}`}>
                  <input
                    type="checkbox"
                    aria-label={`Importar ${row.description}`}
                    checked={row.selected && row.duplicate !== 'imported'}
                    disabled={row.duplicate === 'imported'}
                    onChange={event => update(row.id, { selected: event.target.checked })}
                  />
                  <span className="pf-import-main">
                    <strong>{row.description}</strong>
                    <small>
                      {shortDate(row.date)}
                      {row.duplicate === 'imported' && <em className="pf-import-tag">já importado</em>}
                      {row.duplicate === 'similar' && <em className="pf-import-tag is-warn">parece já cadastrado</em>}
                    </small>
                  </span>
                  <select
                    aria-label={`Categoria de ${row.description}`}
                    value={row.category}
                    onChange={event => update(row.id, { category: event.target.value })}
                  >
                    {(row.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <strong className={`pf-import-amount ${row.type}`}>
                    {row.type === 'income' ? '+' : '-'} {money(row.amount)}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="pf-import-footer">
              <span>
                {selected.length} selecionados
                {totals.income > 0 && <b className="income"> + {money(totals.income)}</b>}
                {totals.expense > 0 && <b className="expense"> - {money(totals.expense)}</b>}
              </span>
              <button type="button" className="primary-button" onClick={confirm} disabled={selected.length === 0}>
                Importar {selected.length}
              </button>
            </div>
          </div>
        )}
      </PfModal>
    </>
  )
}
