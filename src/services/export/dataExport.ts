/**
 * Exporta os dados de TODOS os perfis em tabelas, para abrir em outros
 * programas: planilha (.xlsx) ou banco de dados SQLite (.db).
 * (O backup em JSON continua sendo o formato para restaurar no app.)
 */

import { getFinancialProfiles, getFinancialProfilesState } from '../financialProfilesStorage'
import { withProfileView } from '../profileScope'
import type { CellValue, ExportTable } from './sqliteWriter'

type Dataset = {
  key: string
  field?: string
  table: string
  sheet: string
}

const DATASETS: Dataset[] = [
  { key: 'personal-finance-transactions', table: 'transacoes', sheet: 'Transações' },
  { key: 'personal-finance-credit-cards', table: 'cartoes', sheet: 'Cartões' },
  { key: 'personal-finance-card-purchases', table: 'compras_cartao', sheet: 'Compras no cartão' },
  { key: 'personal-finance-card-payments', table: 'pagamentos_fatura', sheet: 'Pagamentos de fatura' },
  { key: 'personal-finance-debtors-v1', field: 'debtors', table: 'devedores', sheet: 'Devedores' },
  { key: 'personal-finance-debtors-v1', field: 'debts', table: 'dividas', sheet: 'Dívidas' },
  { key: 'personal-finance-debtors-v1', field: 'payments', table: 'recebimentos', sheet: 'Recebimentos' },
  { key: 'personal-finance-goals', table: 'metas', sheet: 'Metas' },
  { key: 'personal-finance-budgets-v1', table: 'orcamentos', sheet: 'Orçamentos' },
  { key: 'personal-finance-manual-forecasts', table: 'previsoes', sheet: 'Previsões' },
  { key: 'personal-finance-savings-v1', table: 'guardado', sheet: 'Guardado' },
  { key: 'personal-finance-reminders-v1', table: 'lembretes', sheet: 'Lembretes' },
]

/** Títulos das colunas na planilha (o SQLite usa os nomes originais). */
const LABELS: Record<string, string> = {
  perfil: 'Perfil',
  id: 'ID',
  description: 'Descrição',
  amount: 'Valor',
  type: 'Tipo',
  category: 'Categoria',
  date: 'Data',
  name: 'Nome',
  bank: 'Banco',
  limit: 'Limite',
  closingDay: 'Dia de fechamento',
  dueDay: 'Dia de vencimento',
  cardId: 'Cartão (ID)',
  installments: 'Parcelas',
  month: 'Mês',
  title: 'Título',
  notes: 'Observações',
  note: 'Observação',
  createdAt: 'Criado em',
  updatedAt: 'Atualizado em',
  dueDate: 'Vencimento',
  status: 'Situação',
  color: 'Cor',
  icon: 'Ícone',
}

const TYPE_LABELS: Record<string, string> = { income: 'Entrada', expense: 'Saída' }

function readList(dataset: Dataset): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(dataset.key)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    const list = dataset.field ? (parsed as Record<string, unknown>)?.[dataset.field] : parsed

    return Array.isArray(list)
      ? list.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : []
  } catch {
    return []
  }
}

function toCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return JSON.stringify(value)
}

/** Monta as tabelas com os dados de todos os perfis (coluna "perfil"). */
export function collectExportTables(mode: 'sqlite' | 'xlsx'): ExportTable[] {
  const profiles = getFinancialProfiles()
  const tables: ExportTable[] = []

  const profileTable: ExportTable = {
    name: mode === 'xlsx' ? 'Perfis' : 'perfis',
    columns: mode === 'xlsx' ? ['ID', 'Nome', 'Cor', 'Ícone', 'Aberto agora'] : ['id', 'nome', 'cor', 'icone', 'aberto_agora'],
    rows: profiles.map(profile => [
      profile.id,
      profile.name,
      profile.color,
      profile.icon,
      profile.id === getFinancialProfilesState().activeProfileId,
    ]),
  }

  for (const dataset of DATASETS) {
    const records: { profile: string; item: Record<string, unknown> }[] = []

    for (const profile of profiles) {
      for (const item of withProfileView(profile.id, () => readList(dataset))) {
        records.push({ profile: profile.name, item })
      }
    }

    // Colunas = todos os campos que aparecem, na ordem em que surgem.
    const keys: string[] = []
    for (const { item } of records) {
      for (const key of Object.keys(item)) if (!keys.includes(key)) keys.push(key)
    }

    const columns = ['perfil', ...keys]

    tables.push({
      name: mode === 'xlsx' ? dataset.sheet : dataset.table,
      columns: mode === 'xlsx' ? columns.map(key => LABELS[key] ?? key) : columns,
      rows: records.map(({ profile, item }) => [
        profile,
        ...keys.map(key => {
          const value = item[key]
          if (mode === 'xlsx' && key === 'type' && typeof value === 'string') return TYPE_LABELS[value] ?? value
          return toCell(value)
        }),
      ]),
    })
  }

  return [profileTable, ...tables]
}
