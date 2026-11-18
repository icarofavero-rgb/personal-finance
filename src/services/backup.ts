import { localDateStamp, saveBinaryFile, saveTextFile } from './fileExport'

import {
  getTransactions,
  saveTransactions,
  type Transaction,
} from './storage'

import {
  getCards,
  saveCards,
  type CreditCard,
} from './cardsStorage'

import {
  getCardPurchases,
  saveCardPurchases,
  type CardPurchase,
} from './cardPurchasesStorage'

import {
  getCardPayments,
  saveCardPayments,
  type CardPayment,
} from './cardPaymentsStorage'

import { getCardInvoices } from './cardInvoices'

import { validateBackupPayments } from './backupPaymentsValidation'

import { getPendingPaymentOperation } from './cardPaymentRecovery'

import { inspectPaymentLinks } from './backupPaymentLinks'

import { inspectBackupPaymentAmounts } from './backupPaymentAmounts'

import { checkBackupRestoreSafety } from './backupRestoreSafety'

import { executeBackupRestore } from './backupRestoreExecutor'

import { createBackupV5 } from './backupV5Builder'

import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

import { hasValidRestoreStructure } from './backupRestoreStructure'

import {
  collectBackupModules,
  restoreBackupModules,
  validateBackupModules,
} from './backupModules'

import { DEFAULT_PROFILE_ID, getViewProfileId, withProfileView } from './profileScope'
import { exportAttachments, importAttachments } from './attachments'
import { markBackupDone } from './backupReminder'
import {
  ensureProfilesFromBackup,
  getFinancialProfiles,
  getFinancialProfilesState,
} from './financialProfilesStorage'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
}

function isValidTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.description === 'string' &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    (value.type === 'income' || value.type === 'expense') &&
    typeof value.category === 'string' &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date)
  )
}

function isValidCard(value: unknown): value is CreditCard {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.bank === 'string' &&
    value.bank.trim().length > 0 &&
    typeof value.limit === 'number' &&
    Number.isFinite(value.limit) &&
    value.limit > 0 &&
    typeof value.closingDay === 'number' &&
    Number.isInteger(value.closingDay) &&
    value.closingDay >= 1 &&
    value.closingDay <= 31 &&
    typeof value.dueDay === 'number' &&
    Number.isInteger(value.dueDay) &&
    value.dueDay >= 1 &&
    value.dueDay <= 31
  )
}


function isValidPurchase(value: unknown): value is CardPurchase {
  if (!isRecord(value)) return false

  if (
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.cardId !== 'string' ||
    value.cardId.trim().length === 0 ||
    typeof value.description !== 'string' ||
    value.description.trim().length === 0 ||
    typeof value.category !== 'string' ||
    typeof value.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    typeof value.amount !== 'number' ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    typeof value.installments !== 'number' ||
    !Number.isInteger(value.installments) ||
    value.installments < 1 ||
    value.installments > 120
  ) {
    return false
  }

  const [year, month, day] = value.date.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day &&
    Number.isSafeInteger(Math.round(value.amount * 100)) &&
    Math.round(value.amount * 100) >= value.installments
  )
}

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map(item => item.id)).size === items.length
}

type BackupV4 = {
  version: 4
  createdAt: string
  transactions: Transaction[]
  cards: CreditCard[]
  purchases: CardPurchase[]
  payments: CardPayment[]
}

export function createBackupV4(): BackupV4 {
  return {
    version: 4,
    createdAt: new Date().toISOString(),
    transactions: getTransactions(),
    cards: getCards(),
    purchases: getCardPurchases(),
    payments: getCardPayments(),
  }
}

/** Backup de UM perfil (o que está sendo visto). */
function buildProfileBackup() {
  return {
    ...createBackupV5(),
    // Metas, Orçamentos, Previsões e preferências (campo opcional).
    modules: collectBackupModules(),
  }
}

/**
 * Backup completo: o perfil principal fica no topo (como sempre foi, então
 * versões antigas do app continuam conseguindo ler) e os outros perfis
 * vão em "profiles".
 */
export function createFullBackup() {
  const main = withProfileView(DEFAULT_PROFILE_ID, buildProfileBackup)
  const others = getFinancialProfiles().filter(profile => profile.id !== DEFAULT_PROFILE_ID)

  if (others.length === 0) return main

  return {
    ...main,
    profiles: {
      list: getFinancialProfilesState().profiles.filter(profile => !profile.deleted),
      data: Object.fromEntries(
        others.map(profile => [profile.id, withProfileView(profile.id, buildProfileBackup)])
      ),
    },
  }
}

export type BackupFormat = 'json' | 'xlsx' | 'sqlite'

/**
 * Exporta no formato escolhido:
 *  - json:   backup completo, o único que pode ser restaurado no app;
 *  - xlsx:   planilha (uma aba por tipo de dado, todos os perfis);
 *  - sqlite: banco de dados .db (uma tabela por tipo de dado).
 */
export async function exportBackupAs(format: BackupFormat): Promise<'web' | 'android'> {
  if (format === 'json') return exportBackup()

  const { collectExportTables } = await import('./export/dataExport')
  const share = {
    title: 'Dados do Personal Finance',
    text: 'Exportação dos dados do Personal Finance',
    dialogTitle: 'Salvar ou compartilhar arquivo',
  }

  if (format === 'xlsx') {
    const { buildXlsxWorkbook } = await import('./export/xlsxWriter')
    return saveBinaryFile(
      `personal-finance-planilha-${localDateStamp()}.xlsx`,
      buildXlsxWorkbook(collectExportTables('xlsx')),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      share
    )
  }

  const { buildSqliteDatabase } = await import('./export/sqliteWriter')
  return saveBinaryFile(
    `personal-finance-${localDateStamp()}.db`,
    buildSqliteDatabase(collectExportTables('sqlite')),
    'application/vnd.sqlite3',
    share
  )
}

export async function exportBackup(): Promise<'web' | 'android'> {
  const backup: Record<string, unknown> = createFullBackup()

  // Fotos dos comprovantes (de todos os perfis)
  try {
    const attachments = await exportAttachments(getFinancialProfiles().map(profile => profile.id))
    if (Object.keys(attachments).length > 0) backup.attachments = attachments
  } catch {
    // sem IndexedDB: o backup sai sem as fotos
  }

  const json = JSON.stringify(backup, null, 2)

  const filename = `personal-finance-backup-v5-${localDateStamp()}.json`

  const result = await saveTextFile(filename, json, {
    title: 'Backup Personal Finance',
    text: 'Cópia de segurança do Personal Finance',
    dialogTitle: 'Salvar ou compartilhar backup',
  })

  // Lembrete de backup volta a contar a partir de agora
  markBackupDone()
  return result
}


/** Confere um backup V5 de um perfil. Retorna os módulos já validados. */
function validateV5(parsed: unknown, label = '') {
  const prefix = label ? `Perfil "${label}": ` : ''

  if (!isRecord(parsed) || parsed.version !== 5 || !hasValidRestoreStructure(parsed)) {
    throw new Error(prefix + 'A estrutura do Backup V5 é inválida.')
  }

  const audit = safelyAuditBackupRestore(parsed)

  if (!audit.valid) {
    throw new Error(prefix + (audit.errors.join('\n') || 'O Backup V5 contém dados inválidos.'))
  }

  // Valida os módulos complementares ANTES de alterar qualquer dado.
  return validateBackupModules((parsed as Record<string, unknown>).modules)
}

/**
 * Restaura um backup com vários perfis. Tudo é conferido antes; depois
 * cada perfil é restaurado no próprio espaço, com a proteção de sempre.
 */
function importMultiProfileBackup(parsed: Record<string, unknown>): Transaction[] {
  const section = parsed.profiles as Record<string, unknown>
  const list = Array.isArray(section.list) ? section.list : []
  const data = isRecord(section.data) ? section.data : {}

  const names = new Map<string, string>()
  for (const item of list) {
    if (isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string') {
      names.set(item.id, item.name)
    }
  }

  // 1. Confere tudo antes de mudar qualquer coisa.
  const jobs: { id: string; backup: Record<string, unknown>; modules: ReturnType<typeof validateV5> }[] = [
    { id: DEFAULT_PROFILE_ID, backup: parsed, modules: validateV5(parsed, names.get(DEFAULT_PROFILE_ID) ?? 'Principal') },
  ]

  for (const [id, backup] of Object.entries(data)) {
    if (id === DEFAULT_PROFILE_ID || !names.has(id) || !isRecord(backup)) continue
    jobs.push({ id, backup, modules: validateV5(backup, names.get(id)) })
  }

  for (const job of jobs) {
    withProfileView(job.id, () => {
      const safety = checkBackupRestoreSafety()
      if (!safety.safe) throw new Error(`Perfil "${names.get(job.id) ?? job.id}": ${safety.message}`)
    })
  }

  // 2. Garante que os perfis do backup existam neste aparelho.
  ensureProfilesFromBackup(list)

  // 3. Restaura cada perfil no próprio espaço.
  for (const job of jobs) {
    withProfileView(job.id, () => {
      executeBackupRestore(job.backup as Parameters<typeof executeBackupRestore>[0])
      if (job.modules !== null) restoreBackupModules(job.modules)
    })
  }

  return getTransactions()
}

export async function importBackup(
  file: File
): Promise<Transaction[]> {
  const restoreSafety = checkBackupRestoreSafety()

  if (!restoreSafety.safe) {
    throw new Error(restoreSafety.message)
  }

  const content = await file.text()


  let parsed: unknown

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('O arquivo não contém um JSON válido.')
  }

  if (!isRecord(parsed)) {
    throw new Error('Estrutura do backup inválida.')
  }


if (parsed.version === 5) {
  // Backup com vários perfis: principal no topo + "profiles".
  if (isRecord(parsed.profiles)) {
    const restored = importMultiProfileBackup(parsed)
    if (isRecord(parsed.attachments)) await importAttachments(parsed.attachments).catch(() => 0)
    return restored
  }

  // Backup de um perfil só: vai para o perfil aberto agora.
  const modules = validateV5(parsed)

  // O executor realiza novamente as verificações
  // de segurança e cria o snapshot antes da gravação.
  executeBackupRestore(parsed as Parameters<typeof executeBackupRestore>[0])

  if (modules !== null) {
    restoreBackupModules(modules)
  }

  // Fotos do backup de um perfil só vão para o perfil aberto
  const files = isRecord(parsed.attachments) ? parsed.attachments[DEFAULT_PROFILE_ID] : null
  if (isRecord(files)) await importAttachments({ [getViewProfileId()]: files }).catch(() => 0)

  return (parsed as { transactions: Transaction[] }).transactions
}

if (
  parsed.version !== 1 &&
  parsed.version !== 2 &&
  parsed.version !== 3 &&
  parsed.version !== 4
) {
  throw new Error('Versão do backup não suportada.')
}

  if (
    !Array.isArray(parsed.transactions) ||
    !parsed.transactions.every(isValidTransaction)
  ) {
    throw new Error('O backup contém transações inválidas.')
  }

  const transactions: Transaction[] = parsed.transactions

  if (!hasUniqueIds(transactions)) {
    throw new Error('O backup contém transações duplicadas.')
  }

  let cards: CreditCard[] | undefined

if (
  parsed.version === 2 ||
  parsed.version === 3 ||
  parsed.version === 4
) {

    if (
      !Array.isArray(parsed.cards) ||
      !parsed.cards.every(isValidCard)
    ) {
      throw new Error('O backup contém cartões inválidos.')
    }

    cards = parsed.cards

    if (!hasUniqueIds(cards)) {
      throw new Error('O backup contém cartões duplicados.')
    }
  }

  
let purchases: CardPurchase[] | undefined

if (parsed.version === 3 || parsed.version === 4) {
  if (
    !Array.isArray(parsed.purchases) ||
    !parsed.purchases.every(isValidPurchase)
  ) {
    throw new Error('O backup contém compras inválidas.')
  }

  purchases = parsed.purchases

  if (!hasUniqueIds(purchases)) {
    throw new Error('O backup contém compras duplicadas.')
  }

  if (!cards) {
    throw new Error('O backup não contém cartões válidos.')
  }

  const cardIds = new Set(cards.map(card => card.id))

  if (purchases.some(purchase => !cardIds.has(purchase.cardId))) {
    throw new Error(
      'O backup contém compras vinculadas a cartões inexistentes.'
    )
  }
}

let payments: CardPayment[] | undefined

if (parsed.version === 4) {
  const backupPayments = parsed.payments

  if (!Array.isArray(backupPayments)) {
    throw new Error(
      'O backup v4 não contém uma lista válida de pagamentos.'
    )
  }

  if (!cards || !purchases) {
    throw new Error(
      'O backup v4 não contém cartões ou compras válidos.'
    )
  }

  const invoices = getCardInvoices(purchases, cards)

  validateBackupPayments(
    backupPayments as CardPayment[],
    cards,
    transactions,
    invoices
  )


const amountReport = inspectBackupPaymentAmounts(
  invoices,
  backupPayments as CardPayment[]
)

if (amountReport.paymentCount !== backupPayments.length) {
  throw new Error(
    'A quantidade de pagamentos do backup é inconsistente.'
  )
}


const linkReport = inspectPaymentLinks(
  backupPayments as CardPayment[]
)

if (linkReport.unlinked > 0) {
  throw new Error(
    `O backup contém ${linkReport.unlinked} pagamento(s) ` +
    'sem vínculo com uma despesa. ' +
    'A importação foi bloqueada para evitar inconsistências.'
  )
}

  payments = backupPayments as CardPayment[]
}

  // Validamos todos os dados antes de iniciar a restauração.
  // Se uma gravação falhar, tentamos recuperar os dados anteriores.
  const pendingPaymentRaw = localStorage.getItem(
  'personal-finance-pending-payment'
)

if (
  pendingPaymentRaw !== null &&
  getPendingPaymentOperation() === null
) {
  throw new Error(
    'Existe um registro de recuperação inválido. ' +
    'A importação foi bloqueada para proteger seus dados.'
  )
}
  
  const pendingOperation = getPendingPaymentOperation()

if (pendingOperation !== null) {
  throw new Error(
    'Existe uma operação de pagamento pendente. ' +
    'Resolva essa operação antes de importar um backup.'
  )
}
  
  const existingPayments = getCardPayments()

if (existingPayments.length > 0) {
  throw new Error(
    'A importação está temporariamente bloqueada porque existem ' +
    'pagamentos registrados. Precisamos concluir a proteção desses dados.'
  )
}

if (parsed.version === 4 && payments === undefined) {
  throw new Error(
    'Não foi possível validar os pagamentos do backup v4.'
  )
}

if (parsed.version === 4) {
  if (!cards || !purchases || !payments) {
    throw new Error('O backup V4 está incompleto.')
  }

  executeBackupRestore({
    version: 4,
    transactions,
    cards,
    purchases,
    payments,
  })

  return transactions
}


if (parsed.version === 1 || parsed.version === 2 || parsed.version === 3) {
  const hasExistingData =
    getTransactions().length > 0 ||
    getCards().length > 0 ||
    getCardPurchases().length > 0 ||
    getCardPayments().length > 0

  if (hasExistingData) {
    throw new Error(
      'A importação de backups antigos está bloqueada ' +
      'enquanto existem dados financeiros no aplicativo. ' +
      'Nenhuma informação foi alterada.'
    )
  }
}


  const previousTransactions = getTransactions()
  const previousCards = getCards()
  const previousPurchases = getCardPurchases()
  const previousPayments = getCardPayments()

  try {
    saveTransactions(transactions)

    if (cards !== undefined) {
      saveCards(cards)
    }

    if (purchases !== undefined) {
      saveCardPurchases(purchases)
    }    

if (payments !== undefined) {
  saveCardPayments(payments)
}

  } catch {
    try {
      saveTransactions(previousTransactions)
      saveCards(previousCards)
      saveCardPurchases(previousPurchases)
      saveCardPayments(previousPayments)
    } catch {
      throw new Error(
        'Falha ao restaurar o backup e recuperar os dados anteriores. Não feche a página antes de verificar seus dados.'
      )
    }

    throw new Error('Falha ao salvar o backup. Os dados anteriores foram preservados.')
  }

  return transactions
}
