/**
 * Importar extrato do banco: lê arquivos OFX ou CSV (os formatos que os
 * apps de banco exportam), sugere a categoria de cada lançamento e
 * aponta os que provavelmente já estão cadastrados.
 */

import { CATEGORY_GROUPS, INCOME_CATEGORY_META } from './categories'
import { normalizeSearch } from './transactionSearch'

export type StatementEntry = {
  /** id estável: o mesmo extrato importado de novo não duplica */
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

type Tx = { id: string; date: string; description: string; amount: number; type: 'income' | 'expense'; category: string }

// ---------- utilidades ----------

function hash(text: string): string {
  let h = 2166136261
  for (let index = 0; index < text.length; index++) {
    h ^= text.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

/** "1.234,56", "-1234.56", "R$ 45,90", "(45,90)" → número com sinal. */
export function parseAmount(raw: string): number | null {
  let text = raw.trim().replace(/R\$|\s| /g, '')
  if (!text) return null

  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  if (text.startsWith('-')) {
    negative = !negative
    text = text.slice(1)
  } else if (text.endsWith('-')) {
    negative = !negative
    text = text.slice(0, -1)
  }
  if (text.startsWith('+')) text = text.slice(1)

  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')

  if (lastComma > lastDot) {
    // formato brasileiro: 1.234,56
    text = text.replace(/\./g, '').replace(',', '.')
  } else {
    // formato americano: 1,234.56
    text = text.replace(/,/g, '')
  }

  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return negative ? -value : value
}

/** "18/11/2026", "18/11/26", "2026-11-18", "20261118" → "2026-11-18". */
export function parseDate(raw: string): string | null {
  const text = raw.trim()
  let match = text.match(/^(\d{4})-?(\d{2})-?(\d{2})/)
  if (match) return valid(match[1], match[2], match[3])

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    return valid(year, match[2].padStart(2, '0'), match[1].padStart(2, '0'))
  }

  return null
}

function valid(year: string, month: string, day: string): string | null {
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null
  return `${year}-${month}-${day}`
}

function entry(date: string, description: string, signed: number, key: string): StatementEntry {
  return {
    id: `imp-${hash(key)}`,
    date,
    description: description.replace(/\s+/g, ' ').trim() || 'Lançamento importado',
    amount: Math.round(Math.abs(signed) * 100) / 100,
    type: signed < 0 ? 'expense' : 'income',
  }
}

// ---------- OFX ----------

export function parseOfx(text: string): StatementEntry[] {
  const blocks = text.split(/<STMTTRN>/i).slice(1)
  const entries: StatementEntry[] = []

  for (const block of blocks) {
    const body = block.split(/<\/STMTTRN>/i)[0]
    const field = (tag: string) => body.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))?.[1]?.trim() ?? ''

    const date = parseDate(field('DTPOSTED'))
    const amount = parseAmount(field('TRNAMT'))
    if (!date || amount === null || amount === 0) continue

    const description = field('MEMO') || field('NAME') || field('PAYEE')
    const fitid = field('FITID')
    entries.push(entry(date, description, amount, fitid ? `ofx:${fitid}:${date}:${amount}` : `ofx:${date}:${amount}:${description}`))
  }

  return entries
}

// ---------- CSV ----------

function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index++
      } else {
        quoted = !quoted
      }
    } else if (char === separator && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells.map(cell => cell.trim())
}

function detectSeparator(lines: string[]): string {
  const candidates = [';', ',', '\t']
  const score = (separator: string) => lines.slice(0, 5).reduce((sum, line) => sum + splitCsvLine(line, separator).length, 0)
  return candidates.sort((a, b) => score(b) - score(a))[0]
}

export function parseCsv(text: string): StatementEntry[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return []

  const separator = detectSeparator(lines)
  const rows = lines.map(line => splitCsvLine(line, separator))

  // Acha a linha de títulos (pode haver linhas de informação antes)
  const headerIndex = rows.findIndex(row => {
    const names = row.map(cell => normalizeSearch(cell))
    return names.some(name => name.startsWith('data') || name === 'date') && names.some(name => /valor|amount|quantia|credito|debito/.test(name))
  })

  let dateColumn = 0
  let descriptionColumns: number[] = [1]
  let amountColumn = 2
  let creditColumn = -1
  let debitColumn = -1
  let start = 0
  let invert = false

  if (headerIndex >= 0) {
    const names = rows[headerIndex].map(cell => normalizeSearch(cell))
    const find = (pattern: RegExp) => names.findIndex(name => pattern.test(name))

    dateColumn = find(/^data|^date/)
    amountColumn = find(/^valor|amount|quantia/)
    creditColumn = find(/credito|entrada/)
    debitColumn = find(/debito|saida/)
    descriptionColumns = names
      .map((name, index) => (/descri|historico|lancamento|estabelecimento|title|titulo|detalhe|memo/.test(name) ? index : -1))
      .filter(index => index >= 0 && index !== dateColumn && index !== amountColumn)
    if (descriptionColumns.length === 0) descriptionColumns = [names.findIndex((_, index) => index !== dateColumn && index !== amountColumn)]
    // Fatura do Nubank (date,title,amount): valores positivos são gastos
    invert = names.includes('title') && names.includes('amount')
    start = headerIndex + 1
  }

  const entries: StatementEntry[] = []

  for (const row of rows.slice(start)) {
    const date = parseDate(row[dateColumn] ?? '')
    if (!date) continue

    let amount: number | null = null
    if (creditColumn >= 0 || debitColumn >= 0) {
      const credit = parseAmount(row[creditColumn] ?? '') ?? 0
      const debit = parseAmount(row[debitColumn] ?? '') ?? 0
      amount = credit ? Math.abs(credit) : debit ? -Math.abs(debit) : null
    }
    if (amount === null && amountColumn >= 0) amount = parseAmount(row[amountColumn] ?? '')
    if (amount === null || amount === 0) continue
    if (invert) amount = -amount

    const description = descriptionColumns.map(index => row[index] ?? '').filter(Boolean).join(' - ')
    entries.push(entry(date, description, amount, `csv:${date}:${amount}:${description}`))
  }

  return entries
}

export function parseStatement(fileName: string, text: string): StatementEntry[] {
  return /<OFX>|<STMTTRN>/i.test(text) || /\.ofx$/i.test(fileName) ? parseOfx(text) : parseCsv(text)
}

// ---------- categorias e repetidas ----------

export const EXPENSE_CATEGORIES = CATEGORY_GROUPS.flatMap(group => group.subcategories.map(sub => `${group.name} / ${sub}`))
export const INCOME_CATEGORIES = Object.keys(INCOME_CATEGORY_META)

const KEYWORDS: [RegExp, string][] = [
  [/uber|99 ?app|99pop|cabify|indriver/, 'Transporte / Aplicativos de transporte'],
  [/posto|shell|ipiranga|petrobras|br mania|combustivel|gasolina/, 'Transporte / Combustível'],
  [/estacionamento|estapar|zona azul|sem parar|veloe|conectcar/, 'Transporte / Estacionamento'],
  [/metro|cptm|onibus|bilhete unico|sptrans|riocard/, 'Transporte / Transporte público'],
  [/ifood|rappi|ze delivery|aiqfome|delivery/, 'Alimentação / Delivery'],
  [/mercado|supermerc|atacad|assai|carrefour|pao de acucar|extra |hortifruti|sacolao/, 'Alimentação / Supermercado'],
  [/restaurante|churrascaria|pizzaria|burger|mc ?donald|outback|habib|lanchonete|padaria/, 'Alimentação / Restaurante'],
  [/cafe|starbucks|cafeteria/, 'Alimentação / Cafeteria'],
  [/farmacia|drogaria|droga ?raia|drogasil|pague menos|panvel/, 'Saúde / Farmácia'],
  [/unimed|amil|bradesco saude|sulamerica|hapvida|plano de saude/, 'Saúde / Plano de saúde'],
  [/laboratorio|exame|fleury|dasa/, 'Saúde / Exames'],
  [/netflix|spotify|disney|prime video|amazon prime|hbo|max |youtube|deezer|globoplay|apple\.com|icloud/, 'Lazer / Assinaturas'],
  [/cinema|cinemark|ingresso/, 'Lazer / Cinema'],
  [/steam|playstation|xbox|nintendo|epic games/, 'Lazer / Jogos'],
  [/aluguel/, 'Moradia / Aluguel'],
  [/condominio/, 'Moradia / Condomínio'],
  [/sabesp|copasa|cedae|sanepar|agua/, 'Moradia / Água'],
  [/enel|cemig|light|copel|celesc|energia|eletropaulo|coelba|cpfl/, 'Moradia / Energia'],
  [/vivo|claro|tim |oi |net |internet|fibra/, 'Moradia / Internet'],
  [/tarifa|anuidade|pacote de servicos/, 'Finanças / Tarifas'],
  [/juros|iof|mora/, 'Finanças / Juros'],
  [/curso|udemy|alura|faculdade|escola|mensalidade/, 'Educação / Cursos'],
  [/livraria|amazon livro|saraiva/, 'Educação / Livros'],
  [/renner|riachuelo|c&a|zara|shein|centauro|netshoes/, 'Compras / Roupas'],
  [/magalu|magazine|americanas|casas bahia|kabum|mercado ?livre|shopee|aliexpress|amazon/, 'Compras / Outras compras'],
]

/**
 * Sugere a categoria: primeiro pelo que você já usou para o mesmo nome,
 * depois por palavras conhecidas (uber, ifood, farmácia...).
 */
export function suggestCategory(item: Pick<StatementEntry, 'description' | 'type'>, history: Tx[]): string {
  const name = normalizeSearch(item.description)
  const fallback = item.type === 'income' ? (INCOME_CATEGORIES.includes('Outros recebimentos') ? 'Outros recebimentos' : INCOME_CATEGORIES[0]) : 'Outros / Geral'

  const same = history.find(tx => tx.type === item.type && normalizeSearch(tx.description) === name)
  if (same) return same.category

  if (item.type === 'income') {
    if (/salario|folha|pagamento de salario|vencimento/.test(name)) return 'Salário'
    if (/rendimento|juros|dividendo|cdb|tesouro/.test(name)) return 'Rendimentos'
    if (/estorno|reembolso|devolucao/.test(name)) return 'Reembolsos'
    return fallback
  }

  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(name) && EXPENSE_CATEGORIES.includes(category)) return category
  }

  return fallback
}

/** Já cadastrado? (importado antes, ou lançado à mão com mesma data, valor e tipo) */
export function findDuplicate(item: StatementEntry, history: Tx[]): 'imported' | 'similar' | null {
  if (history.some(tx => tx.id === item.id)) return 'imported'
  if (history.some(tx => tx.date === item.date && tx.type === item.type && Math.abs(tx.amount - item.amount) < 0.005)) return 'similar'
  return null
}
