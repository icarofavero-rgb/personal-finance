
import { appAlert, appConfirm } from './services/appDialog'
import { getCardInvoiceDueDate, getCurrentInvoiceMonth } from './services/cardInvoiceDueDate'
import {
  CATEGORY_GROUPS,
  SUBCATEGORY_ICONS,
  getCategorySelection,
  getTransactionVisual,
  buildCategoryValue,
} from './services/categories'
import CategoryIcon from './components/CategoryIcon'
import TransactionsCategoryChart from './components/TransactionsCategoryChart'
import { createPortal } from 'react-dom'
import { useState, useMemo, useEffect, useRef, useCallback, useTransition } from 'react'
import Deferred from './components/Deferred'
import ProcessOverlay, { type ProcessState } from './components/ProcessOverlay'
import { installBackButton } from './services/appExit'
import HelpCenter from './pages/HelpCenter'
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Bell,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CalendarDays,
  X,
  Search,
  Repeat,
  Trash2,
  Pencil,
  Download,
  FileJson,
  FileSpreadsheet,
  Database,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown, 
  UserRound,
  Cat,
  Dog,
  Bot,
  Ghost,
  Gamepad2,
  Rocket,
  Star,
  Settings as SettingsIcon,
} from 'lucide-react'

import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  saveTransactions,
  type Transaction,
} from './services/storage'

import './App.css'
import './styles/liquid-glass.css'
import NotificationPanel from './components/NotificationPanel'
import { FinanceCharts } from './components/FinanceCharts'

import FinancialComparisonCharts from './components/FinancialComparisonCharts'

import {
  getReadNotificationIds,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
} from './services/notificationReadStorage'

import { matchesSearch, summarize } from './services/transactionSearch'
import { buildSpendingEntries, type SpendingEntry } from './services/spending'
import { BOLETO_CATEGORY, isBoletoCategory } from './services/categories'
import CardSpendingChart from './components/CardSpendingChart'
import { buildNextMonthProjection } from './services/nextMonthProjection'
import { usePresence } from './hooks/usePresence'
import BackupReminderBanner from './components/BackupReminderBanner'
import MonthInsights from './components/MonthInsights'
import RecurringManager from './components/RecurringManager'
import StatementImport from './components/StatementImport'
import ReceiptButton from './components/ReceiptButton'
import { pruneAttachments } from './services/attachments'
import { updateHomeWidget } from './services/widgetBridge'
import { LOCK_CHANGED_EVENT } from './components/AppLockScreen'
import LiveSyncIndicator from './components/LiveSyncIndicator'
import { DATA_SYNCED_EVENT } from './services/sync/liveLink'
import {
  createRuleFromTransaction,
  getRecurringRules,
  planRecurring,
  saveRecurringRules,
  RECURRING_CHANGED_EVENT,
} from './services/recurringStorage'
import { exportBackupAs, importBackup, type BackupFormat } from './services/backup'

const EXPORT_FORMATS = [
  { id: 'json', label: 'Backup (JSON)', hint: 'Restaura no app', action: 'Exportar backup', icon: FileJson },
  { id: 'xlsx', label: 'Planilha', hint: 'Excel / Google', action: 'Exportar planilha', icon: FileSpreadsheet },
  { id: 'sqlite', label: 'SQLite', hint: 'Banco de dados', action: 'Exportar banco SQLite', icon: Database },
] as const satisfies readonly { id: BackupFormat; label: string; hint: string; action: string; icon: unknown }[]

import Reports from './pages/Reports'

import Cards from './pages/Cards'

import { checkTransactionProtection } from './services/cardPaymentTransactionProtection'

import { generateCardInvoiceNotifications } from './services/notificationEngine'
import { getNotificationPreferences } from './services/notificationPreferencesStorage'

import {
  checkPaymentsOnStartup,
} from './services/paymentStartupCheck'

import {
  checkBackupRestoreOnStartup,
} from './services/backupRestoreStartupCheck'

import {
  getBackupRestoreSnapshotJournal,
  recoverBackupRestoreSnapshot,
} from './services/backupRestoreSnapshotJournal'

import { getCardPurchases } from './services/cardPurchasesStorage'
import { getCardPayments } from './services/cardPaymentsStorage'
import { getCardInvoices } from './services/cardInvoices'
import { History, CreditCard as CardPaymentIcon } from 'lucide-react'
import { addCardPurchase } from './services/cardPurchasesStorage'
import { calculateInstallments } from './services/cardInvoices'
import { calculateInvoicePayment } from './services/cardPaymentsCalculations'
import DashboardMonthSelector from './components/DashboardMonthSelector'
import Budgets from './pages/Budgets'
import MonthPicker from './components/MonthPicker'
import SelectField from './components/SelectField'
import { calculateManualForecastSummary } from './services/manualForecastCalculations'
import { TypingTitle } from './components/TypingTitle'
import DashboardCardDetailsModal from './components/DashboardCardDetailsModal'
import Settings, { type SettingsSection } from './pages/Settings'
import ProfileSwitcher from './components/ProfileSwitcher'
import { OPEN_PROFILES_SETTINGS_EVENT } from './services/profileSwitch'
import { getActiveFinancialProfile, getFinancialProfiles } from './services/financialProfilesStorage'
import { withProfileView } from './services/profileScope'
import { hasCompletedOnboarding, ONBOARDING_FINISHED_EVENT } from './services/onboardingStorage'
import Goals from './pages/Goals'
import './styles/goals.css'

import {
  calculateFinancialProjection,
} from './services/financialProjection'

import {
  getCards,
  DEFAULT_CARD_COLOR,
} from './services/cardsStorage'

import {
  calculateCardDashboard,
  calculateCardAvailableLimitCents,
} from './services/cardDashboard'
import { calculateMonthlyDashboard } from './services/monthlyDashboard'
import { formatDecimal } from './services/format'
import { calculateMonthlyForecast } from './services/monthlyForecast'
import CardPaymentForm from './components/CardPaymentForm'
import { registerCardPayment } from './services/cardPaymentOperations'
import { checkPaymentSafety } from './services/cardPaymentSafety'
import Debtors from './pages/Debtors'
import Sync from './pages/Sync'
import AppBackdrop from './components/AppBackdrop'
import Savings from './pages/Savings'
import CalendarPage, { REMINDERS_CHANGED_EVENT } from './pages/CalendarPage'
import { getReminders } from './services/remindersStorage'
import { generateReminderNotifications, generateBoletoNotifications } from './services/calendarEvents'
import { syncSystemNotifications } from './services/systemNotifications'
import AppNavigation, { getPageOrder } from './components/AppNavigation'
import { useDeviceClass } from './hooks/useDeviceClass'
import { markBusy } from './hooks/busyMarker'
import DatePicker from './components/DatePicker'
import ConfirmDialog from './components/ConfirmDialog'
import Toast, { type ToastMessage } from './components/Toast'
import ManualForecastForm from './components/ManualForecastForm'
import { AnimatedMoney } from './components/AnimatedMoney'
import DashboardCardStack from './components/DashboardCardStack'
import AppDialog from './components/AppDialog'
import { getUserPreferences } from './services/userPreferencesStorage'


import {
  getAppearancePreferences,
  applyAccentColor,
  applyNeonIntensity,
  applyAppTheme,
  applyVisualStyle,
  applyBackground,
  applyFontSize,
  applyAnimationPreference,
} from './services/appearanceStorage'


import {
  getManualForecasts,
  addManualForecast,
  updateManualForecast,
  deleteManualForecast,
  type ManualForecast,
} from './services/manualForecastStorage'

const sidebarAvatarIcons = {
  user: UserRound,
  cat: Cat,
  dog: Dog,
  robot: Bot,
  ghost: Ghost,
  gamer: Gamepad2,
  rocket: Rocket,
  star: Star,
}

const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Vendas',
  'Reembolsos',
  'Rendimentos',
  'Presentes recebidos',
  'Outros recebimentos',
]


const INCOME_CATEGORY_ICONS: Record<string, {
  icon: string
  color: string
}> = {
  'Salário': {
    icon: 'briefcase-business',
    color: '#64E6A5',
  },
  Freelance: {
    icon: 'laptop',
    color: '#35D9FF',
  },
  Vendas: {
    icon: 'shopping-bag',
    color: '#9B75FF',
  },
  Reembolsos: {
    icon: 'rotate-ccw',
    color: '#7C91FF',
  },
  Rendimentos: {
    icon: 'trending-up',
    color: '#FFB86B',
  },
  'Presentes recebidos': {
    icon: 'gift',
    color: '#FF789A',
  },
  'Outros recebimentos': {
    icon: 'wallet',
    color: '#C4A5FF',
  },
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(date: string) {
  if (!date) return ''

  const [year, month, day] = date.split('-')

  return `${day}/${month}/${year}`
}

async function handleRecoverBackup() {
  try {
    const pending = getBackupRestoreSnapshotJournal()

    if (!pending) {
      alert('Não existe uma restauração pendente.')
      return
    }

    const confirmed = await appConfirm(
      'Foi encontrada uma restauração interrompida.\n\n' +
      'Deseja recuperar os dados anteriores à importação?',
      { title: 'Recuperar dados?', confirmLabel: 'Recuperar' }
    )

    if (!confirmed) return

    recoverBackupRestoreSnapshot()

    await appAlert(
      'Dados anteriores recuperados! ' +
      'O aplicativo será atualizado.'
    )

    window.location.reload()
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : 'Não foi possível recuperar os dados.'
    )
  }
}

 function App() {
  const [dashboardCardDetailsId, setDashboardCardDetailsId] =
  useState<string | null>(null)

const [
  notificationReadRevision,
  setNotificationReadRevision,
] = useState(0)

const [appAlert, setAppAlert] = useState<{
  title: string
  message: string
} | null>(null)

  const [invoicePaymentMode, setInvoicePaymentMode] =
  useState<'partial' | 'full' | null>(null)

  const [confirmInvoicePayment, setConfirmInvoicePayment] =
  useState<{ amount: number; date: string; invoiceKey: string } | null>(null)

  const [isInvoiceConfirmClosing, setIsInvoiceConfirmClosing] =
  useState(false)

const invoiceConfirmCloseTimer =
  useRef<ReturnType<typeof setTimeout> | null>(null)

function closeInvoiceConfirmation() {
  if (!confirmInvoicePayment || isInvoiceConfirmClosing) return

  setIsInvoiceConfirmClosing(true)

  if (invoiceConfirmCloseTimer.current) {
    clearTimeout(invoiceConfirmCloseTimer.current)
  }

  invoiceConfirmCloseTimer.current = setTimeout(() => {
    setConfirmInvoicePayment(null)
    setIsInvoiceConfirmClosing(false)
    invoiceConfirmCloseTimer.current = null
  }, 250)
}

const [notificationsOpen, setNotificationsOpen] = useState(false)
// Mantém o painel na tela durante a animação de saída
const notificationPresence = usePresence(notificationsOpen, 200)

const notificationWrapperRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!notificationsOpen) return

  function handlePointerDown(event: PointerEvent) {
    const target = event.target

    // O painel fica num "portal" (fora do botão): tocar nele não conta como fora
    if (
      target instanceof Element &&
      !notificationWrapperRef.current?.contains(target) &&
      !target.closest('.pf-notification-portal')
    ) {
      setNotificationsOpen(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setNotificationsOpen(false)
    }
  }

  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeyDown)

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('keydown', handleKeyDown)
  }
}, [notificationsOpen])

useEffect(() => {
  const savedAppearance = getAppearancePreferences()

  applyAccentColor(savedAppearance.accentColor)
  applyNeonIntensity(savedAppearance.neonIntensity)
  applyAppTheme(savedAppearance.theme)
  applyVisualStyle(savedAppearance.visualStyle)
  applyAnimationPreference(savedAppearance.animations)

  // Tema "Sistema": acompanha quando o aparelho troca entre claro e escuro.
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  function followSystemTheme() {
    const current = getAppearancePreferences()
    if (current.theme === 'system') applyAppTheme('system')
  }

  media.addEventListener('change', followSystemTheme)
  return () => media.removeEventListener('change', followSystemTheme)
}, [])

useEffect(() => {
  if (!confirmInvoicePayment) return

  function handleInvoiceConfirmEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    closeInvoiceConfirmation()
  }

  window.addEventListener('keydown', handleInvoiceConfirmEscape, true)

  return () => {
    window.removeEventListener(
      'keydown',
      handleInvoiceConfirmEscape,
      true
    )
  }
}, [confirmInvoicePayment, isInvoiceConfirmClosing])

  const [openInvoiceSelector, setOpenInvoiceSelector] =
  useState<'month' | 'year' | null>(null)

  const [closingInvoiceSelector, setClosingInvoiceSelector] =
  useState<'month' | 'year' | null>(null)

const invoiceSelectorCloseTimer =
  useRef<ReturnType<typeof setTimeout> | null>(null)

function closeInvoiceSelector() {
  if (!openInvoiceSelector) return

  const selectorToClose = openInvoiceSelector

  if (invoiceSelectorCloseTimer.current) {
    clearTimeout(invoiceSelectorCloseTimer.current)
  }

  setClosingInvoiceSelector(selectorToClose)

  invoiceSelectorCloseTimer.current = setTimeout(() => {
    setOpenInvoiceSelector(null)
    setClosingInvoiceSelector(null)
    invoiceSelectorCloseTimer.current = null
  }, 250)
}

function toggleInvoiceSelector(selector: 'month' | 'year') {
  if (invoiceSelectorCloseTimer.current) {
    clearTimeout(invoiceSelectorCloseTimer.current)
    invoiceSelectorCloseTimer.current = null
  }

  setClosingInvoiceSelector(null)

  if (openInvoiceSelector === selector) {
    closeInvoiceSelector()
  } else {
    setOpenInvoiceSelector(selector)
  }
}

  useEffect(() => {
  if (!openInvoiceSelector) return

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpenInvoiceSelector(null)
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target

    if (
      target instanceof Element &&
      !target.closest('.invoice-custom-select')
    ) {
      setOpenInvoiceSelector(null)
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('mousedown', handleClickOutside)

  return () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [openInvoiceSelector])

const [selectedInvoiceCardId, setSelectedInvoiceCardId] =
  useState<string | null>(null)

  const [isInvoiceModalClosing, setIsInvoiceModalClosing] =
  useState(false)

const invoiceModalCloseTimer =
  useRef<ReturnType<typeof setTimeout> | null>(null)

function closeInvoiceModal() {
  if (!selectedInvoiceCardId || isInvoiceModalClosing) return

  setIsInvoiceModalClosing(true)

  if (invoiceModalCloseTimer.current) {
    clearTimeout(invoiceModalCloseTimer.current)
  }

  invoiceModalCloseTimer.current = setTimeout(() => {
    setSelectedInvoiceCardId(null)
    setSelectedInvoiceMonth('')
    setOpenInvoiceSelector(null)
    setClosingInvoiceSelector(null)
    setInvoicePaymentMode(null)
    setIsInvoiceModalClosing(false)
    invoiceModalCloseTimer.current = null
  }, 250)
}

useEffect(() => {
  if (!selectedInvoiceCardId) return

  function handleInvoiceModalEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

    // A confirmação de quitação tem prioridade.
    if (confirmInvoicePayment) return

    // Primeiro fecha os seletores de mês e ano.
    if (openInvoiceSelector) {
      event.preventDefault()
      event.stopImmediatePropagation()
      closeInvoiceSelector()
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()

    closeInvoiceModal()
  }

  window.addEventListener('keydown', handleInvoiceModalEscape, true)

  return () => {
    window.removeEventListener(
      'keydown',
      handleInvoiceModalEscape,
      true
    )
  }
}, [
  selectedInvoiceCardId,
  confirmInvoicePayment,
  openInvoiceSelector,
  isInvoiceModalClosing,
])

const [selectedInvoiceMonth, setSelectedInvoiceMonth] =
  useState('')

  const [activePage, setActivePage] = useState('Dashboard')
  const [isPagePending, startPageTransition] = useTransition()

const device = useDeviceClass()

// Aba destacada no menu: muda NA HORA do toque. A página em si é montada
// em seguida, "em pedaços" (startTransition), sem travar o celular.
const [navPage, setNavPage] = useState(activePage)

if (navPage !== activePage && !isPagePending) {
  // Mudanças de página feitas por outros botões (ex.: "Ver todas").
  setNavPage(activePage)
}

const navigate = useCallback((page: string) => {
  setNavPage(page)
  startPageTransition(() => setActivePage(page))
}, [])

// Direção da transição: avançar no menu desliza para um lado, voltar para o outro.
const [previousPage, setPreviousPage] = useState(activePage)
const [pageDirection, setPageDirection] = useState<'forward' | 'back'>('forward')

if (previousPage !== activePage) {
  setPreviousPage(activePage)
  setPageDirection(
    getPageOrder().indexOf(activePage) >= getPageOrder().indexOf(previousPage)
      ? 'forward'
      : 'back'
  )
}

// Botão "voltar" do Android: fecha janelas, volta ao Dashboard e só sai
// do app com dois toques seguidos (ou pelo botão "Sair").
const activePageRef = useRef(activePage)
activePageRef.current = activePage

useEffect(() => {
  return installBackButton({
    isHome: () => activePageRef.current === 'Dashboard',
    goHome: () => navigate('Dashboard'),
    notify: message => setToast({ id: crypto.randomUUID(), type: 'success', message }),
  })
}, [navigate])

// Cada página nova começa do topo; o fundo animado pausa durante a troca.
useEffect(() => {
  markBusy(450)
  window.scrollTo({ top: 0 })
}, [activePage])

const [userPreferences, setUserPreferences] = useState(
  () => getUserPreferences()
)

const userName = userPreferences.name


useEffect(() => {
  function refreshUserPreferences() {
    setUserPreferences(getUserPreferences())
  }

  refreshUserPreferences()

  window.addEventListener(
    'personal-finance-profile-updated',
    refreshUserPreferences
  )

  return () => {
    window.removeEventListener(
      'personal-finance-profile-updated',
      refreshUserPreferences
    )
  }
}, [activePage])


const SidebarAvatarIcon =
  sidebarAvatarIcons[
    userPreferences.avatar as keyof typeof sidebarAvatarIcons
  ]

const sidebarAvatarGradient = `linear-gradient(
  135deg,
  ${userPreferences.avatarColor1},
  ${userPreferences.avatarColor2}
)`

  const [dashboardMonth, setDashboardMonth] = useState(() => {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
})
  const [paymentWarning] = useState(() =>
  checkPaymentsOnStartup()
)

const [backupWarning] = useState(() =>
  checkBackupRestoreOnStartup()
)

  const [transactions, setTransactions] = useState<Transaction[]>(
    () => getTransactions()
  )
  const [cardsRevision, setCardsRevision] = useState(0)

  // Gastos de TODAS as formas de pagamento (cartão de crédito parcela por
  // parcela + Pix/débito/dinheiro/boleto). Base do Dashboard e dos gráficos.
  const spendingEntries = useMemo(
    () => buildSpendingEntries(transactions, getCardPurchases(), getCardPayments(), getCards()),
    [transactions, cardsRevision]
  )
  
const [notificationPreferencesRevision, setNotificationPreferencesRevision] =
  useState(0)

// Muda sempre que os lembretes do Calendário são alterados.
const [remindersRevision, setRemindersRevision] = useState(0)

useEffect(() => {
  const bump = () => setRemindersRevision(previous => previous + 1)
  window.addEventListener(REMINDERS_CHANGED_EVENT, bump)
  return () => window.removeEventListener(REMINDERS_CHANGED_EVENT, bump)
}, [])

const [notificationToday, setNotificationToday] = useState(() => {
  const now = new Date()

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
})

useEffect(() => {
  function updateNotificationDate() {
    const now = new Date()

    const currentDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')

    setNotificationToday(previous =>
      previous === currentDate ? previous : currentDate
    )
  }

  // Atualiza imediatamente e verifica periodicamente.
  updateNotificationDate()

  const interval = window.setInterval(
    updateNotificationDate,
    60_000
  )

  // Atualiza ao retornar para a aba.
  document.addEventListener(
    'visibilitychange',
    updateNotificationDate
  )

  window.addEventListener('focus', updateNotificationDate)

  return () => {
    window.clearInterval(interval)

    document.removeEventListener(
      'visibilitychange',
      updateNotificationDate
    )

    window.removeEventListener('focus', updateNotificationDate)
  }
}, [])

const formattedToday = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(
  new Date(`${notificationToday}T12:00:00`)
)

function handleToggleNotificationRead(
  
  id: string,
  currentlyRead: boolean
) {
  try {
    if (currentlyRead) {
      markNotificationAsUnread(id)
    } else {
      markNotificationAsRead(id)
    }

    setNotificationReadRevision(previous => previous + 1)
  } catch (error) {
    console.error(
      'Erro ao atualizar leitura da notificação:',
      error
    )

    window.alert(
      'Não foi possível atualizar a notificação. ' +
      'Nenhuma alteração foi confirmada.'
    )
  }
}

function handleMarkAllNotificationsAsRead() {
  try {
    const unreadIds = notificationResult.notifications
      .filter(notification => !notification.read)
      .map(notification => notification.id)

    if (unreadIds.length === 0) return

    markAllNotificationsAsRead(unreadIds)

    setNotificationReadRevision(previous => previous + 1)
  } catch (error) {
    console.error(
      'Erro ao marcar todas as notificações como lidas:',
      error
    )

    showToast(
      'error',
      'Não foi possível marcar as notificações como lidas.'
    )
  }
}

const notificationResult = useMemo(() => {
  try {
    const cards = getCards()
    const purchases = getCardPurchases()
    const payments = getCardPayments()
    const preferences = getNotificationPreferences()

    const invoiceNotifications = generateCardInvoiceNotifications(
      cards,
      purchases,
      payments,
      preferences,
      notificationToday
    )

    // Lembretes do Calendário (boletos, contas...). Um problema aqui não
    // pode esconder os avisos de fatura.
    let reminderNotifications: ReturnType<typeof generateReminderNotifications> = []

    try {
      reminderNotifications = generateReminderNotifications(
        getReminders(),
        preferences,
        notificationToday
      )
    } catch (error) {
      console.error('Erro ao calcular avisos dos lembretes:', error)
    }

    let boletoNotifications: ReturnType<typeof generateBoletoNotifications> = []

    try {
      boletoNotifications = generateBoletoNotifications(transactions, preferences, notificationToday)
    } catch (error) {
      console.error('Erro ao calcular avisos dos boletos:', error)
    }

    const notifications = [...invoiceNotifications, ...reminderNotifications, ...boletoNotifications].sort(
      (a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    )

const readIds = new Set(getReadNotificationIds())

const notificationsWithReadState = notifications.map(
  notification => ({
    ...notification,
    read: readIds.has(notification.id),
  })
)
    
return {
  notifications: notificationsWithReadState,
  error: null as string | null,
}

  } catch (error) {
    console.error(
      'Erro ao calcular notificações financeiras:',
      error
    )

    return {
      notifications: [],
      error:
        'Não foi possível calcular os avisos financeiros. ' +
        'Verifique os dados cadastrados.',
    }
  }

}, [
  cardsRevision,
  notificationsOpen,
  activePage,
  notificationToday,
  notificationPreferencesRevision,
  notificationReadRevision,
  remindersRevision,
  transactions,
])

// Conexão contínua: depois de sincronizar, todas as telas leem os dados de novo
const [dataRevision, setDataRevision] = useState(0)

useEffect(() => {
  const refresh = () => {
    setTransactions(getTransactions())
    setCardsRevision(value => value + 1)
    try {
      setManualForecasts(getManualForecasts())
    } catch {
      setManualForecasts([])
    }
    setUserPreferences(getUserPreferences())
    setNotificationPreferencesRevision(value => value + 1)
    setRemindersRevision(value => value + 1)
    setRecurringRevision(value => value + 1)

    const appearance = getAppearancePreferences()
    applyAccentColor(appearance.accentColor)
    applyNeonIntensity(appearance.neonIntensity)
    applyAppTheme(appearance.theme)
    applyVisualStyle(appearance.visualStyle)
    applyBackground(appearance.background)
    applyFontSize(appearance.fontSize)
    applyAnimationPreference(appearance.animations)

    // Remonta a página aberta (Metas, Guardado, Calendário... leem de novo)
    setDataRevision(value => value + 1)
  }

  window.addEventListener(DATA_SYNCED_EVENT, refresh)
  return () => window.removeEventListener(DATA_SYNCED_EVENT, refresh)
}, [])

// Compras no cartão criadas fora da página Cartões (ex.: dívida de devedor)
useEffect(() => {
  const bump = () => setCardsRevision(value => value + 1)
  window.addEventListener('personal-finance-cards-changed', bump)
  return () => window.removeEventListener('personal-finance-cards-changed', bump)
}, [])

// Fotos de comprovantes de transações apagadas são removidas
useEffect(() => {
  if (activePage !== 'Transações') return
  const timer = window.setTimeout(() => {
    void pruneAttachments(new Set(transactions.map(item => item.id))).catch(() => {})
  }, 2000)
  return () => window.clearTimeout(timer)
}, [activePage, transactions])

// Virada do mês com o app aberto: se o Dashboard estava no mês atual,
// ele passa sozinho para o mês novo.
const lastTodayRef = useRef(notificationToday)
useEffect(() => {
  const previousMonth = lastTodayRef.current.slice(0, 7)
  const currentMonth = notificationToday.slice(0, 7)
  lastTodayRef.current = notificationToday
  if (previousMonth !== currentMonth) {
    setDashboardMonth(month => (month === previousMonth ? currentMonth : month))
  }
}, [notificationToday])

// Transações recorrentes: lança sozinho os meses que já chegaram
const [recurringRevision, setRecurringRevision] = useState(0)

useEffect(() => {
  const bump = () => setRecurringRevision(previous => previous + 1)
  window.addEventListener(RECURRING_CHANGED_EVENT, bump)
  return () => window.removeEventListener(RECURRING_CHANGED_EVENT, bump)
}, [])

useEffect(() => {
  try {
    const rules = getRecurringRules()
    if (rules.length === 0) return

    const current = getTransactions()
    const plan = planRecurring(rules, new Set(current.map(item => item.id)), notificationToday)

    // Primeiro as transações, depois as regras (se algo falhar no meio,
    // na próxima abertura o mês é lançado de novo, sem duplicar)
    if (plan.transactions.length > 0) {
      saveTransactions([...current, ...(plan.transactions as Transaction[])])
      setTransactions(getTransactions())
      showToast(
        'success',
        plan.transactions.length === 1
          ? '1 lançamento recorrente adicionado.'
          : `${plan.transactions.length} lançamentos recorrentes adicionados.`
      )
    }

    if (plan.changed) saveRecurringRules(plan.rules)
  } catch (error) {
    console.error('Erro ao lançar transações recorrentes:', error)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [notificationToday, recurringRevision])

// Muda quando o tutorial termina (para pedir a permissão de notificações)
const [onboardingDoneRevision, setOnboardingDoneRevision] = useState(0)

// Notificações fora do app (Android): reagenda quando algo muda.
useEffect(() => {
  const timer = window.setTimeout(() => {
    try {
      // Avisos de TODOS os perfis (o nome do perfil vai no texto)
      const profiles = getFinancialProfiles()
      const batches = profiles.map(profile => ({
        label: profiles.length > 1 ? profile.name : '',
        sources: withProfileView(profile.id, () => ({
          cards: getCards(),
          purchases: getCardPurchases(),
          payments: getCardPayments(),
          reminders: getReminders(),
          forecasts: [],
          debts: [],
          transactions: getTransactions(),
        })),
      }))

      void syncSystemNotifications(batches, getNotificationPreferences(), {
        mayAskPermission: hasCompletedOnboarding(),
      }).catch(error => console.error('Erro ao agendar notificações:', error))
    } catch (error) {
      console.error('Erro ao preparar notificações:', error)
    }
  }, 1500)

  return () => window.clearTimeout(timer)
}, [cardsRevision, remindersRevision, notificationPreferencesRevision, notificationToday, onboardingDoneRevision])

// Ao terminar o tutorial, já pede a permissão de notificações
useEffect(() => {
  const done = () => setOnboardingDoneRevision(value => value + 1)
  window.addEventListener(ONBOARDING_FINISHED_EVENT, done)
  return () => window.removeEventListener(ONBOARDING_FINISHED_EVENT, done)
}, [])


const [manualForecasts, setManualForecasts] =
  useState<ManualForecast[]>(() => {
    // Dados corrompidos não podem derrubar o app inteiro (tela branca).
    // Os dados originais continuam preservados no armazenamento.
    try {
      return getManualForecasts()
    } catch (error) {
      console.error('Erro ao carregar previsões manuais:', error)
      return []
    }
  })

const [showForecastModal, setShowForecastModal] =
  useState(false)

const [isForecastModalClosing, setIsForecastModalClosing] =
  useState(false)

const [editingForecast, setEditingForecast] =
  useState<ManualForecast | null>(null)

  
const [forecastToDelete, setForecastToDelete] =
  useState<ManualForecast | null>(null)

const [toast, setToast] = useState<ToastMessage | null>(null)

// Referência estável: evita reiniciar o temporizador do aviso a cada renderização.
const closeToast = useCallback(() => setToast(null), [])

// Tela de processamento do backup (exportar/restaurar).
const [backupProcess, setBackupProcess] = useState<{
  state: ProcessState
  working?: string
  success?: string
  detail?: string
}>({ state: 'idle' })
const closeBackupProcess = useCallback(() => setBackupProcess({ state: 'idle' }), [])

const [pendingBackupFile, setPendingBackupFile] =
  useState<File | null>(null)

const backupImportRunning = useRef(false)

function showToast(
  type: 'success' | 'error',
  message: string
) {
  setToast({
    id: crypto.randomUUID(),
    type,
    message,
  })
}

async function handleExportBackup() {
  const isBackup = backupFormat === 'json'

  // Tela de processamento: símbolo girando → check verde ou X vermelho.
  setBackupProcess({
    state: 'working',
    working: isBackup ? 'Gerando seu backup…' : 'Gerando seu arquivo…',
  })
  const started = Date.now()
  const waitSpin = () => new Promise(resolve => setTimeout(resolve, Math.max(0, 900 - (Date.now() - started))))

  try {
    const platform = await exportBackupAs(backupFormat)
    await waitSpin()

    setBackupProcess({
      state: 'success',
      success: isBackup ? 'Backup realizado com sucesso!' : 'Arquivo exportado com sucesso!',
      detail:
        platform === 'android'
          ? 'Confira se o arquivo foi salvo onde você escolheu.'
          : 'O arquivo foi salvo na pasta de downloads.',
    })
  } catch (error) {
    console.error('Erro ao exportar backup:', error)
    await waitSpin()

    setBackupProcess({
      state: 'error',
      detail: error instanceof Error ? error.message : 'Não foi possível preparar o backup.',
    })
  }
}

function handleOpenNewForecast() {
  setEditingForecast(null)
  setShowForecastModal(true)
}

function handleEditForecast(forecast: ManualForecast) {
  setEditingForecast(forecast)
  setShowForecastModal(true)
}


function handleCloseForecastModal() {
  if (isForecastModalClosing) return

  setIsForecastModalClosing(true)
}

function finishCloseForecastModal() {
  setShowForecastModal(false)
  setEditingForecast(null)
  setIsForecastModalClosing(false)
}


function handleSaveManualForecast(forecast: ManualForecast) {
  try {
    if (editingForecast) {
      updateManualForecast(forecast)
    } else {
      addManualForecast(forecast)
    }

    setManualForecasts(getManualForecasts())
    handleCloseForecastModal()
    showToast('success', 'Ação realizada com sucesso!')
  } catch (error) {
    showToast(
  'error',
  error instanceof Error
    ? error.message
    : 'Não foi possível salvar a ação.'
)
  }
}


function handleDeleteManualForecast(id: string) {
  const forecast = manualForecasts.find(
    item => item.id === id
  )

  if (!forecast) {
    showToast('error', 'Previsão não encontrada.')
    return
  }

  setForecastToDelete(forecast)
}

function handleConfirmDeleteForecast() {
  if (!forecastToDelete) return

  try {
    deleteManualForecast(forecastToDelete.id)
    setManualForecasts(getManualForecasts())
    setForecastToDelete(null)

    showToast('success', 'Ação realizada com sucesso!')
  } catch (error) {
    setForecastToDelete(null)

    showToast(
      'error',
      error instanceof Error
        ? error.message
        : 'Não foi possível excluir a previsão.'
    )
  }
}

  const [showModal, setShowModal] = useState(false)

  const [isTransactionModalClosing, setIsTransactionModalClosing] =
  useState(false)

const transactionModalCloseTimer =
  useRef<ReturnType<typeof setTimeout> | null>(null)

function closeTransactionModal() {
  if (!showModal || isTransactionModalClosing) return

  setIsTransactionModalClosing(true)

  if (transactionModalCloseTimer.current) {
    clearTimeout(transactionModalCloseTimer.current)
  }

  transactionModalCloseTimer.current = setTimeout(() => {
    setShowModal(false)
    setIsTransactionModalClosing(false)
    transactionModalCloseTimer.current = null
  }, 250)
}

  const [limitAlert, setLimitAlert] = useState<{
  available: number
  purchase: number
} | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<
  'cash' | 'credit' | 'boleto'
>('cash')

useEffect(() => {
  if (!showModal) return

  function handleTransactionEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

    // Não interfere no alerta de limite.
    if (limitAlert) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    closeTransactionModal()
  }

  window.addEventListener('keydown', handleTransactionEscape, true)

  return () => {
    window.removeEventListener(
      'keydown',
      handleTransactionEscape,
      true
    )
  }
}, [showModal, isTransactionModalClosing, limitAlert])

const [selectedCardId, setSelectedCardId] = useState('')
const [cardInstallments, setCardInstallments] = useState('1')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [transactionToDelete, setTransactionToDelete] =
  useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCategory, setFilterCategory] = useState('Todas')
  const [filterType, setFilterType] = useState('Todos')
  const [searchText, setSearchText] = useState('')
  const [repeatMonthly, setRepeatMonthly] = useState(false)

  // Formato do arquivo exportado na página de Backup
  const [backupFormat, setBackupFormat] = useState<BackupFormat>('json')

  // Perfil financeiro aberto (a tela recarrega ao trocar de perfil)
  const [activeProfileLabel] = useState(() =>
    getFinancialProfiles().length > 1 ? getActiveFinancialProfile().name : undefined
  )

  // Widget da tela inicial (Android): saldo do mês do perfil aberto
  useEffect(() => {
    const push = () => void updateHomeWidget(spendingEntries, activeProfileLabel).catch(() => {})
    const timer = window.setTimeout(push, 1200)
    window.addEventListener(LOCK_CHANGED_EVENT, push)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(LOCK_CHANGED_EVENT, push)
    }
  }, [spendingEntries, activeProfileLabel])

  // Seção aberta ao entrar em Configurações ("Gerenciar perfis" abre Perfis)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile')
  const [settingsOpenRevision, setSettingsOpenRevision] = useState(0)

  useEffect(() => {
    const openProfiles = () => {
      setSettingsSection('profiles')
      setSettingsOpenRevision(value => value + 1)
      navigate('Configurações')
    }
    window.addEventListener(OPEN_PROFILES_SETTINGS_EVENT, openProfiles)
    return () => window.removeEventListener(OPEN_PROFILES_SETTINGS_EVENT, openProfiles)
  }, [navigate])

  // Fora de Configurações, a próxima abertura volta para "Perfil e preferências"
  if (navPage !== 'Configurações' && settingsSection !== 'profile') {
    setSettingsSection('profile')
  }

  // Evolução das despesas na página de Transações: 6 meses até o mês
  // filtrado (ou o mês atual), respeitando a categoria escolhida.
  const transactionsEvolutionEnd =
    filterMonth || new Date().toLocaleDateString('en-CA').slice(0, 7)

  const transactionsEvolution = useMemo(() => {
    const [year, month] = transactionsEvolutionEnd.split('-').map(Number)
    const start = new Date(year, month - 6, 1)
    const startMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`

    return spendingEntries.filter(transaction => {
      const transactionMonth = transaction.date.slice(0, 7)

      return (
        transactionMonth >= startMonth &&
        transactionMonth <= transactionsEvolutionEnd &&
        (filterCategory === 'Todas' || transaction.category === filterCategory)
      )
    })
  }, [spendingEntries, transactionsEvolutionEnd, filterCategory])
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Outros')

const [lastIncomeCategory, setLastIncomeCategory] =
  useState('Salário')

const [lastExpenseCategory, setLastExpenseCategory] =
  useState('Outros')

function changeTransactionCategory(value: string) {
  setCategory(value)

  if (type === 'income') {
    setLastIncomeCategory(value)
  } else {
    setLastExpenseCategory(value)
  }
}


function changeTransactionType(
  nextType: 'income' | 'expense'
) {
  if (nextType === type) return

  if (type === 'income') {
    setLastIncomeCategory(category)
  } else {
    setLastExpenseCategory(category)
  }

  setType(nextType)

  setCategory(
    nextType === 'income'
      ? lastIncomeCategory
      : lastExpenseCategory
  )
}


const selectedCategory = getCategorySelection(category)

const selectedGroupName = selectedCategory.group.name

const selectedSubcategory = selectedCategory.subcategory

const selectedGroup = selectedCategory.group

  const [historySection, setHistorySection] = useState<
  'income' | 'expense' | 'monthly' | 'projected' | null
>(null)

const [isHistoryClosing, setIsHistoryClosing] = useState(false)

const historyCloseTimer =
  useRef<ReturnType<typeof setTimeout> | null>(null)

function closeHistoryModal() {
  if (historySection === null || isHistoryClosing) return

  setIsHistoryClosing(true)

  if (historyCloseTimer.current) {
    clearTimeout(historyCloseTimer.current)
  }

  historyCloseTimer.current = setTimeout(() => {
    setHistorySection(null)
    setIsHistoryClosing(false)
    historyCloseTimer.current = null
  }, 250)
}
useEffect(() => {
  if (historySection === null) return

  function handleHistoryEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape') return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    closeHistoryModal()
  }

  window.addEventListener('keydown', handleHistoryEscape, true)

  return () => {
    window.removeEventListener(
      'keydown',
      handleHistoryEscape,
      true
    )
  }
}, [historySection, isHistoryClosing])

const historyTransactions = spendingEntries
  .filter(transaction => {
    if (historySection === 'monthly') {
      return transaction.date.startsWith(dashboardMonth)
    }

    // Os cards são "do mês", então o histórico também mostra só o mês
    // selecionado — assim o total do histórico bate com o valor do card.
    if (historySection === 'income') {
      return (
        transaction.type === 'income' &&
        transaction.date.startsWith(dashboardMonth)
      )
    }

    if (historySection === 'expense') {
      return (
        transaction.type === 'expense' &&
        transaction.date.startsWith(dashboardMonth)
      )
    }

    return false
  })
  .sort((a, b) => b.date.localeCompare(a.date))


const historyTotal = historyTransactions.reduce(
  (total, transaction) => {
    if (historySection === 'monthly') {
      return total + (
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount
      )
    }

    return total + transaction.amount
  },
  0
)
  const [date, setDate] = useState(
    () => new Date().toLocaleDateString('en-CA')
  )

const previewCard = getCards().find(
  card => card.id === selectedCardId
)

const previewAmount = Number(amount)

const previewInstallments = Number(cardInstallments)

const previewAvailableLimit = previewCard
  ? calculateCardAvailableLimitCents(
      previewCard,
      getCardPurchases(),
      getCardPayments()
    ) / 100
  : 0

const previewRemainingLimit =
  Math.round((previewAvailableLimit - previewAmount) * 100) / 100

const previewExceedsLimit =
  type === 'expense' &&
  paymentMethod === 'credit' &&
  amount.trim() !== '' &&
  Number.isFinite(previewAmount) &&
  previewAmount > 0 &&
  previewCard !== undefined &&
  previewRemainingLimit < 0

let installmentPreview: ReturnType<
  typeof calculateInstallments
> = []

if (
  type === 'expense' &&
  paymentMethod === 'credit' &&
  previewCard &&
  description.trim() &&
  date &&
  amount.trim() !== '' &&
  Number.isFinite(previewAmount) &&
  previewAmount > 0 &&
  Number.isInteger(previewInstallments) &&
  previewInstallments >= 1 &&
  previewInstallments <= 120
) {
  try {
    installmentPreview = calculateInstallments(
      {
        id: 'preview',
        cardId: previewCard.id,
        description: description.trim(),
        amount: previewAmount,
        category,
        date,
        installments: previewInstallments,
      },
      previewCard
    )
  } catch {
    installmentPreview = []
  }
}

const monthlySummary = useMemo(
  () => calculateMonthlyDashboard(spendingEntries, dashboardMonth),
  [spendingEntries, dashboardMonth]
)

const monthlyIncome = monthlySummary.income
const monthlyExpense = monthlySummary.expense
const monthlyBalance = monthlySummary.balance

const dashboardChartTransactions = useMemo(
  () =>
    spendingEntries.filter(transaction =>
      transaction.date.startsWith(dashboardMonth)
    ),
  [spendingEntries, dashboardMonth]
)

const manualForecastSummary = useMemo(
  () => calculateManualForecastSummary(
    manualForecasts,
    dashboardMonth
  ),
  [manualForecasts, dashboardMonth]
)

const monthlyForecast = useMemo(() => {
  const today = new Date()

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  return calculateMonthlyForecast(
    transactions,
    dashboardMonth,
    todayKey
  )
}, [transactions, dashboardMonth])

const financialProjection = useMemo(() => {
  const cards = getCards()
  const purchases = getCardPurchases()
  const payments = getCardPayments()

  const invoices = getCardInvoices(purchases, cards)

  // Começa no mês escolhido em "Período"
  const [year, month] = dashboardMonth.split('-').map(Number)

  return calculateFinancialProjection({
    transactions,
    invoices,
    payments,
    referenceDate: new Date(year, month - 1, 1),
    months: 8,
    cards,
  })
}, [transactions, cardsRevision, dashboardMonth])



const projectionBreakdown = useMemo(() => {
  const today = new Date()

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const lastProjectionMonth =
    financialProjection[financialProjection.length - 1]?.key

  const payments = getCardPayments()

  const linkedPaymentIds = new Set(
    payments
      .map(payment => payment.transactionId)
      .filter((id): id is string => Boolean(id))
  )

  const currentBalance = transactions
    .filter(transaction => transaction.date <= todayKey)
    .reduce(
      (sum, transaction) =>
        sum +
        (transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount),
      0
    )

  const futureMovement = transactions
    .filter(transaction => {
      const month = transaction.date.slice(0, 7)

      return (
        transaction.date > todayKey &&
        lastProjectionMonth !== undefined &&
        month <= lastProjectionMonth &&
        !linkedPaymentIds.has(transaction.id)
      )
    })
    .reduce(
      (sum, transaction) =>
        sum +
        (transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount),
      0
    )

  const pendingInvoices = financialProjection.reduce(
    (sum, month) => sum + month.faturasPendentes,
    0
  )

  return {
  currentBalance,
  futureMovement,
  pendingInvoices,
  finalBalance:
    currentBalance + futureMovement - pendingInvoices,
}
}, [transactions, financialProjection])

void projectionBreakdown.finalBalance

// Saldo projetado para o mês seguinte ao escolhido em "Período"
const nextProjection = useMemo(
  () =>
    buildNextMonthProjection({
      month: dashboardMonth,
      entries: spendingEntries,
      cards: getCards(),
      purchases: getCardPurchases(),
      payments: getCardPayments(),
      reminders: getReminders(),
      recurring: getRecurringRules(),
      forecasts: manualForecasts,
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [dashboardMonth, spendingEntries, cardsRevision, remindersRevision, recurringRevision, manualForecasts]
)

function monthLabelLong(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const dashboardCards = useMemo(() => {
  const cards = getCards()
  const purchases = getCardPurchases()
  const payments = getCardPayments()
  const invoices = getCardInvoices(purchases, cards)

  // No mês atual, cada cartão mostra a fatura "da vez" (a que ainda vai
  // vencer). Em outro mês escolhido em "Período", a fatura daquele mês.
  const isCurrentMonth = dashboardMonth === notificationToday.slice(0, 7)

  return cards.map(card => {
    const invoiceMonth = isCurrentMonth ? getCurrentInvoiceMonth(card, notificationToday) : dashboardMonth
    return {
      ...card,
      color: card.color ?? DEFAULT_CARD_COLOR,
      financial: calculateCardDashboard(
        card,
        purchases,
        payments
      ),
      invoiceMonth,
      invoiceDueDate: getCardInvoiceDueDate(invoiceMonth, card.dueDay, card.closingDay),
      monthInvoice: invoices.find(invoice => invoice.cardId === card.id && invoice.invoiceMonth === invoiceMonth)?.total ?? 0,
      monthPaid: payments
        .filter(payment => payment.cardId === card.id && payment.invoiceMonth === invoiceMonth)
        .reduce((sum, payment) => sum + payment.amount, 0),
    }
  })
}, [cardsRevision, dashboardMonth, notificationToday])

const dashboardCardsSummary = useMemo(() => {
  const totals = dashboardCards.reduce(
    (summary, card) => {
      summary.limit += Math.round(card.financial.limit * 100)
      summary.used += Math.round(card.financial.usedLimit * 100)
      summary.available += Math.round(card.financial.availableLimit * 100)

      return summary
    },
    { limit: 0, used: 0, available: 0 }
  )

  return {
    limit: totals.limit / 100,
    used: totals.used / 100,
    available: totals.available / 100,
  }
}, [dashboardCards])

const dashboardCardDetails =
  dashboardCards.find(
    card => card.id === dashboardCardDetailsId
  ) ?? null

const dashboardInvoices = useMemo(() => {
  const cards = getCards()
  const purchases = getCardPurchases()

  return getCardInvoices(purchases, cards)
}, [cardsRevision])


function handleOpenDashboardCard(cardId: string) {
  const cardInvoices = dashboardInvoices
    .filter(invoice => invoice.cardId === cardId)
    .sort((a, b) =>
      b.invoiceMonth.localeCompare(a.invoiceMonth)
    )

  // Usa a data local (toISOString usaria UTC e erraria o mês após 21h no Brasil).
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const initialMonth = cardInvoices.some(
    invoice => invoice.invoiceMonth === currentMonth
  )
    ? currentMonth
    : cardInvoices[0]?.invoiceMonth ?? ''

  setInvoicePaymentMode(null)
  setSelectedInvoiceCardId(cardId)
  setSelectedInvoiceMonth(initialMonth)
}

const selectedCardInvoices = dashboardInvoices
  .filter(invoice => invoice.cardId === selectedInvoiceCardId)
  .sort((a, b) =>
    a.invoiceMonth.localeCompare(b.invoiceMonth)
  )

const selectedInvoice = selectedCardInvoices.find(
  invoice => invoice.invoiceMonth === selectedInvoiceMonth
)

const selectedInvoiceCard = dashboardCards.find(
  card => card.id === selectedInvoiceCardId
)

const selectedInvoiceSummary = selectedInvoice
  ? calculateInvoicePayment(
      selectedInvoice.total,
      getCardPayments(),
      selectedInvoice.cardId,
      selectedInvoice.invoiceMonth
    )
  : null

const invoiceMonthOptions = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const availableInvoiceYears = Array.from(
  new Set(
    selectedCardInvoices.map(invoice =>
      invoice.invoiceMonth.slice(0, 4)
    )
  )
).sort((a, b) => b.localeCompare(a))

const selectedYear = selectedInvoiceMonth.slice(0, 4)
const selectedMonthNumber = selectedInvoiceMonth.slice(5, 7)

const availableInvoiceMonths = selectedCardInvoices
  .filter(invoice => invoice.invoiceMonth.startsWith(`${selectedYear}-`))
  .map(invoice => invoice.invoiceMonth.slice(5, 7))

  // Histórico: transações + compras no cartão (parcela por parcela).
  // Parcelas futuras só aparecem quando o mês delas é filtrado.
  const historyToday = new Date().toLocaleDateString('en-CA')
  const historyCardEntries = spendingEntries.filter(
    entry => entry.source === 'card' && (filterMonth ? true : entry.date <= historyToday)
  )
  const historyCardNames = new Map(getCards().map(card => [card.id, card.name]))
  const sortedTransactions: SpendingEntry[] = [
    ...transactions.map(transaction => ({ ...transaction, source: 'transaction' as const })),
    ...historyCardEntries,
  ].sort(
    (a, b) => b.date.localeCompare(a.date)
  )
  const filteredTransactions = sortedTransactions.filter(item =>{
  const matchesMonth =
    !filterMonth || item.date.startsWith(filterMonth)

  const matchesCategory =
    filterCategory === 'Todas' ||
    item.category === filterCategory

  const matchesType =
    filterType === 'Todos' ||
    item.type === filterType

  // Busca por texto/valor (só na página Transações)
  const matchesText =
    activePage !== 'Transações' || matchesSearch(item, searchText)

  return matchesMonth && matchesCategory && matchesType && matchesText
})

const hasActiveFilters =
  searchText.trim() !== '' || filterMonth !== '' || filterCategory !== 'Todas' || filterType !== 'Todos'
// Pagamento de fatura não conta de novo (as compras do cartão já contam)
const invoicePaymentIds = new Set(getCardPayments().map(payment => payment.transactionId).filter(Boolean))
const filteredSummary = summarize(filteredTransactions.filter(item => !invoicePaymentIds.has(item.id)))

// Abre o formulário sempre limpo (evita herdar dados de uma edição cancelada).
function openNewTransaction() {
  setEditingId(null)
  setRepeatMonthly(false)
  setType('expense')
  setCategory(lastExpenseCategory)
  setDescription('')
  setAmount('')
  setDate(new Date().toLocaleDateString('en-CA'))
  setPaymentMethod('cash')
  setSelectedCardId('')
  setCardInstallments('1')
  setShowModal(true)
}

function openEditTransaction(transaction: Transaction) {
  const protection = checkTransactionProtection(transaction.id)

  if (protection.protected) {
    setAppAlert({
      title: 'Transação protegida',
      message: protection.message,
    })
    return
  }

  setEditingId(transaction.id)
  setType(transaction.type)
  setDescription(transaction.description)
  setAmount(String(transaction.amount))
  setCategory(transaction.category)
  setDate(transaction.date)
  setShowModal(true)
}

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const numericAmount = Number(amount)

    if (
      !description.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !date
    ) {
      alert('Preencha os campos corretamente.')
      return
    }

   
  const transaction: Transaction = {
    id: editingId ?? crypto.randomUUID(),
    description: description.trim(),
    amount: Math.round(numericAmount * 100) / 100,
    type,
    category,
    date,
  }

  try {
  if (!editingId && type === 'expense' && paymentMethod === 'credit') {
  const selectedCard = getCards().find(
    card => card.id === selectedCardId
  )

  const installments = Number(cardInstallments)

  if (!selectedCard) {
    alert('Selecione um cartão de crédito válido.')
    return
  }

  const amountCents = Math.round(numericAmount * 100)

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents < 1 ||
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 120 ||
    installments > amountCents
  ) {
    alert('Confira o valor e a quantidade de parcelas.')
    return
  }

  // Verifica o limite disponível do cartão
const availableLimitCents = calculateCardAvailableLimitCents(
  selectedCard,
  getCardPurchases(),
  getCardPayments()
)

if (amountCents > availableLimitCents) {
  setLimitAlert({
    available: Math.max(0, availableLimitCents) / 100,
    purchase: amountCents / 100,
  })

  return
}

  try {
    calculateInstallments(
      {
        id: 'validation',
        cardId: selectedCard.id,
        description: description.trim(),
        amount: amountCents / 100,
        category,
        date,
        installments,
      },
      selectedCard
    )
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : 'Não foi possível validar a compra.'
    )
    return
  }

  addCardPurchase({
    id: crypto.randomUUID(),
    cardId: selectedCard.id,
    description: description.trim(),
    amount: amountCents / 100,
    category,
    date,
    installments,
  })

setCardsRevision(value => value + 1)
closeTransactionModal()
setDescription('')
setAmount('')
setCategory(lastExpenseCategory)
setPaymentMethod('cash')
setSelectedCardId('')
setCardInstallments('1')
showToast('success', 'Compra cadastrada com sucesso!')

return
}


if (editingId) {
  const protection = checkTransactionProtection(editingId)

  if (protection.protected) {
    showToast('error', protection.message)
    return
  }

  updateTransaction(transaction)
  showToast('success', 'Transação atualizada com sucesso!')
} else {
  addTransaction(transaction)

  if (repeatMonthly) {
    createRuleFromTransaction(transaction)
    showToast('success', 'Transação cadastrada! Ela vai se repetir todo mês.')
  } else {
    showToast('success', 'Transação cadastrada com sucesso!')
  }
}



    setTransactions(getTransactions())
    closeTransactionModal()
    setEditingId(null)
    setDescription('')
    setAmount('')
    
setCategory(
  type === 'income'
    ? lastIncomeCategory
    : lastExpenseCategory
)

  } catch {
  showToast('error', 'Não foi possível salvar a transação.')
}
}


 

function handleDelete(id: string) {
  const protection = checkTransactionProtection(id)

  if (protection.protected) {
    showToast('error', protection.message)
    return
  }

  const transactionExists = transactions.some(
    transaction => transaction.id === id
  )

  if (!transactionExists) {
    showToast('error', 'Transação não encontrada.')
    return
  }

  setTransactionToDelete(id)
}

function handleConfirmDeleteTransaction() {
  if (!transactionToDelete) return

  const id = transactionToDelete

  // Verifica novamente antes da exclusão.
  const protection = checkTransactionProtection(id)

  if (protection.protected) {
    setTransactionToDelete(null)
    showToast('error', protection.message)
    return
  }

  try {
    deleteTransaction(id)
    setTransactions(getTransactions())
    setTransactionToDelete(null)

    showToast('success', 'Transação excluída com sucesso!')
  } catch {
    setTransactionToDelete(null)
    showToast('error', 'Não foi possível excluir a transação.')
  }
}

function handleImportBackup(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0]

  // Permite selecionar o mesmo arquivo novamente.
  event.target.value = ''

  if (!file || backupImportRunning.current) return

  const restoreStatus = checkBackupRestoreOnStartup()

  if (restoreStatus.needsAttention) {
    setAppAlert({
      title: 'Restauração bloqueada',
      message: restoreStatus.message,
    })
    return
  }

  // Aguarda a confirmação do usuário.
  setPendingBackupFile(file)
}


async function handleConfirmImportBackup() {
  const file = pendingBackupFile

  if (!file || backupImportRunning.current) return

  backupImportRunning.current = true
  setBackupProcess({ state: 'working', working: 'Restaurando seu backup…' })
  const started = Date.now()
  const waitSpin = () => new Promise(resolve => setTimeout(resolve, Math.max(0, 900 - (Date.now() - started))))

  try {
    // Revalida a segurança antes de executar.
    const restoreStatus = checkBackupRestoreOnStartup()

    if (restoreStatus.needsAttention) {
      throw new Error(restoreStatus.message)
    }

    const restored = await importBackup(file)

    setTransactions(restored)
    setCardsRevision(previous => previous + 1)

    // Atualiza também os módulos complementares restaurados.
    try {
      setManualForecasts(getManualForecasts())
    } catch {
      setManualForecasts([])
    }

    setUserPreferences(getUserPreferences())
    setNotificationPreferencesRevision(previous => previous + 1)

    const appearance = getAppearancePreferences()
    applyAccentColor(appearance.accentColor)
    applyNeonIntensity(appearance.neonIntensity)
    applyAppTheme(appearance.theme)
    applyVisualStyle(appearance.visualStyle)
    applyBackground(appearance.background)
    applyFontSize(appearance.fontSize)
    applyAnimationPreference(appearance.animations)

    await waitSpin()
    setBackupProcess({ state: 'success', success: 'Backup restaurado com sucesso!' })
  } catch (error) {
    console.error('Erro ao restaurar backup:', error)
    await waitSpin()

    setBackupProcess({
      state: 'error',
      detail: error instanceof Error ? error.message : 'Não foi possível restaurar o backup.',
    })
  } finally {
    backupImportRunning.current = false
    setPendingBackupFile(null)
  }
}


function handleDashboardInvoicePayment(
  amount: number,
  date: string
) {
  if (!selectedInvoice) return

  const safety = checkPaymentSafety()

  if (!safety.safe) {
    alert(safety.message)
    return
  }

  try {
    registerCardPayment({
      id: crypto.randomUUID(),
      cardId: selectedInvoice.cardId,
      invoiceMonth: selectedInvoice.invoiceMonth,
      amount,
      date,
    })

    setTransactions(getTransactions())
    setCardsRevision(value => value + 1)
    setInvoicePaymentMode(null)

    showToast('success', 'Pagamento registrado com sucesso!')
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : 'Não foi possível registrar o pagamento.'
    )
  }
}

  return (
    <>
    <AppBackdrop />
    <div className="app">
      <AppNavigation
        device={device}
        activePage={navPage}
        onNavigate={navigate}
        onNewTransaction={openNewTransaction}
        profileName={userName}
        profileBackground={sidebarAvatarGradient}
        profileSubtitle={activeProfileLabel}
        profileAvatar={
          userPreferences.avatar === 'photo' && userPreferences.avatarImage ? (
            <img className="pf-sidenav-avatar-photo" src={userPreferences.avatarImage} alt="" />
          ) : SidebarAvatarIcon ? (
            <SidebarAvatarIcon size={22} strokeWidth={1.8} />
          ) : (
            userName.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U'
          )
        }
      />


<main className="main">
        <header className="topbar">
          
<div className="pf-header-title">
  <span className="breadcrumb">
    Personal Finance /
  </span>

  <TypingTitle text={activePage} />
</div>


          <div className="top-actions">
            <LiveSyncIndicator onOpenSync={() => navigate('Sincronização')} onMessage={showToast} />
            <ProfileSwitcher />
         
<button
  type="button"
  className={`icon-button pf-mobile-settings-button ${
    activePage === 'Configurações' ? 'active' : ''
  }`}
  onClick={() => setActivePage('Configurações')}
  aria-label="Abrir Configurações"
  title="Configurações"
>
  <SettingsIcon size={19} />
</button>
   
<div
  className="notification-wrapper"
  ref={notificationWrapperRef}
>
  <button
    type="button"
    className="icon-button"
    aria-label="Notificações"
    aria-expanded={notificationsOpen}
    aria-controls="notification-panel"
    onClick={() =>
      setNotificationsOpen(previous => !previous)
    }
  >
    
<Bell size={19} />


{!notificationResult.error &&
  notificationResult.notifications.some(
    notification => !notification.read
  ) && (
    <span
      className="notification-badge"
      aria-label={`${
        notificationResult.notifications.filter(
          notification => !notification.read
        ).length
      } notificações não lidas`}
    >
      {notificationResult.notifications.filter(
        notification => !notification.read
      ).length > 99
        ? '99+'
        : notificationResult.notifications.filter(
            notification => !notification.read
          ).length}
    </span>
  )}


  </button>


{notificationPresence.rendered &&
  createPortal(
    <div id="notification-panel" className={`pf-notification-portal ${notificationPresence.closing ? 'is-closing' : ''}`}>
      <NotificationPanel
        notifications={notificationResult.notifications}
        error={notificationResult.error}
        onClose={() => setNotificationsOpen(false)}
        onToggleRead={handleToggleNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsAsRead}
      />
    </div>,
    document.body
  )}

</div>

            
</div>
</header>

        <section className="content">
        {/* A chave troca a cada página: a página "entra" com a animação do aparelho. */}
        <div key={`${activePage}-${dataRevision}`} className="pf-page" data-direction={pageDirection}>

        {localStorage.getItem(
  'personal-finance-pending-backup-snapshot'
) !== null && (
  <button
    type="button"
    onClick={() => void handleRecoverBackup()}
  >
    Recuperar dados anteriores
  </button>

)}
{activePage === 'Dashboard' && (
  <BackupReminderBanner
    hasData={transactions.length > 0}
    onBackup={() => navigate('Backup e restauração')}
  />
)}
{paymentWarning.needsAttention && (
  <div
    role="alert"
    style={{
      padding: '16px',
      marginBottom: '20px',
      borderRadius: '12px',
      border: '1px solid #f59e0b',
      backgroundColor: '#3b2a12',
      color: '#fde68a',
    }}
  >
    <strong>Atenção: pagamento pendente</strong>
    <p style={{ marginTop: '8px' }}>
      {paymentWarning.message}
    </p>
  </div>
)}

{backupWarning.needsAttention && (
  <div
    role="alert"
    style={{
      padding: '16px',
      marginBottom: '20px',
      borderRadius: '12px',
      border: '1px solid #ef4444',
      backgroundColor: '#3b1c24',
      color: '#fecaca',
    }}
  >
    <strong>
      Atenção: restauração de backup pendente
    </strong>

    <p style={{ marginTop: '8px' }}>
      {backupWarning.message}
    </p>
  </div>
)}

{(activePage === 'Dashboard' ||
  activePage === 'Transações') && (
  <div className="welcome">
    <div>
      <span className="eyebrow">
        CONTROLE FINANCEIRO
      </span>

{activePage === 'Dashboard' ? (
  <>
    <h1>
      {userName
        ? `Olá, ${userName}`
        : 'Olá, seja bem-vindo'}
      <span className="neon-dot">.</span>
    </h1>

    <p className="dashboard-today">
      <CalendarDays size={15} />
      {formattedToday}
    </p>
  </>
) : (
        <h1>
          Minhas transações
          <span className="neon-dot">.</span>
        </h1>
      )}

      <p>
        {activePage === 'Dashboard'
          ? 'Acompanhe sua vida financeira em um só lugar.'
          : 'Organize suas entradas e saídas.'}
      </p>
    </div>

{/* No Dashboard o botão fica só no menu ("+" / Nova transação) */}
{activePage !== 'Dashboard' && (
<button
  type="button"
  className="primary-button page-new-transaction-button"
  onClick={openNewTransaction}
    >
      <Plus size={18} />
      Nova transação
    </button>
)}
  </div>
)}

{activePage === 'Orçamentos' && (
  <Budgets transactions={spendingEntries} />
)}


{activePage === 'Metas' && (
  <Goals />
)}

{activePage === 'Configurações' && (
  <Settings
    key={`${settingsSection}-${settingsOpenRevision}`}
    initialSection={settingsSection}
    onOpenBackup={() => {
      setActivePage('Backup e restauração')
    }}
    onOpenSync={() => {
      setActivePage('Sincronização')
    }}
    onNotificationPreferencesChanged={() => {
      setNotificationPreferencesRevision(previous => previous + 1)
    }}
  />
)}

{activePage === 'Cartões' && (
  <Cards
  onPaymentRegistered={() => {
    setTransactions(getTransactions())
    setCardsRevision(value => value + 1)
  }}
  onCardsChanged={() => {
    setCardsRevision(value => value + 1)
  }}
/>
)}


            {(activePage === 'Dashboard' || activePage === 'Transações') && (
  <>
              {activePage === 'Dashboard' && (
                <>

<div className="section-heading">
  <div className="dashboard-heading-text">
    <h2>Visão geral</h2>
    <p>
      Acompanhe suas movimentações do período selecionado.
    </p>
  </div>

  <DashboardMonthSelector
    value={dashboardMonth}
    onChange={setDashboardMonth}
  />
</div>


<div className="summary-grid">

    {/* TOTAL DE ENTRADAS */}
  <div className="summary-card income-card">
    <div className="card-top">
      <span>Entradas do mês</span>
      <div className="card-icon green">
        <ArrowDownRight size={19} />
      </div>
    </div>

    <h2>
  <AnimatedMoney value={monthlyIncome} />
</h2>

    <span className="positive">
  Receitas registradas
</span>

<button
  type="button"
  className="history-icon-button"
  title="Ver histórico de entradas"
  aria-label="Ver histórico de entradas"
  onClick={() => setHistorySection('income')}
>
  <History size={17} />
</button>
  </div>

  {/* TOTAL DE SAÍDAS */}
  <div className="summary-card expense-card">
    <div className="card-top">
      <span>Saídas do mês</span>
      <div className="card-icon purple">
        <ArrowUpRight size={19} />
      </div>
    </div>

    <h2>
  <AnimatedMoney value={monthlyExpense} />
</h2>

    <span className="negative">
      Despesas registradas
    </span>
    <button
  type="button"
  className="history-icon-button"
  title="Ver histórico de saídas"
  aria-label="Ver histórico de saídas"
  onClick={() => setHistorySection('expense')}
>
  <History size={17} />
</button>
  </div>

  {/* RESULTADO DO MÊS */}
  <div className="summary-card monthly-card">
    <div className="card-top">
      <span>Resultado do mês</span>
      <div className="card-icon blue">
        <CalendarDays size={19} />
      </div>
    </div>

    <h2>
  <AnimatedMoney value={monthlyBalance} />
</h2>


<div className="card-caption summary-balance-details">
  <span>
    Receitas: {formatMoney(monthlyIncome)}
  </span>
  <span>
    Despesas: {formatMoney(monthlyExpense)}
  </span>
</div>

    <button
  type="button"
  className="history-icon-button"
  title="Ver histórico do mês"
  aria-label="Ver histórico do mês"
  onClick={() => setHistorySection('monthly')}
>
  <History size={17} />
</button>
  </div>

{/* SALDO PROJETADO */}
<div className="summary-card projected-card">
  <div className="card-top">
    <span>Saldo projetado para o mês seguinte</span>
    <div className="card-icon blue">
      <Wallet size={19} />
    </div>
  </div>

  <h2>
  <AnimatedMoney value={nextProjection.total} />
</h2>
<button
  type="button"
  className="history-icon-button"
  title="Ver histórico do saldo projetado"
  aria-label="Ver histórico do saldo projetado"
  onClick={() => setHistorySection('projected')}
>
  <History size={17} />
</button>

  

<span className="card-caption projected-caption">
  {monthLabelLong(nextProjection.month)}: faturas {formatMoney(nextProjection.invoices)} · boletos {formatMoney(nextProjection.boletos)} · outras {formatMoney(nextProjection.otherExpenses)}
</span>

  </div>
</div>

{/* Destaques: comparação automática com o mês anterior */}
<MonthInsights transactions={spendingEntries} month={dashboardMonth} />

{/* Comparação de entradas e saídas + evolução por categoria (acima do planejamento) */}
<Deferred minHeight={420} delay={450}>
<FinancialComparisonCharts
  transactions={dashboardChartTransactions}
  categoryTransactions={spendingEntries.filter(transaction => {
    const [year, month] = dashboardMonth.split('-').map(Number)
    const start = new Date(year, month - 6, 1)

    const startMonth = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, '0'),
    ].join('-')

    const transactionMonth = transaction.date.slice(0, 7)

    return (
      transactionMonth >= startMonth &&
      transactionMonth <= dashboardMonth
    )
  })}
  categoryEndMonth={dashboardMonth}
/>
</Deferred>

{/* SEÇÃO DE PLANEJAMENTO FINANCEIRO */}
<div className="dashboard-section-heading dashboard-planning-heading">
  <div className="dashboard-section-icon">
    <Wallet size={20} />
  </div>

  <div>
    <span className="dashboard-section-eyebrow">
      PLANEJAMENTO FINANCEIRO
    </span>

    <h2>Planejamento e cartões</h2>

    <p>
      Organize suas previsões e acompanhe seus cartões.
    </p>
  </div>
</div>

{/* PREVISÃO FINANCEIRA E CARTÕES */}
<div className="dashboard-financial-layout">

  {/* PREVISÃO FINANCEIRA MENSAL */}
  <section className="monthly-forecast-panel">
  <div className="monthly-forecast-heading">
    <div>
      <span className="monthly-forecast-eyebrow">
        PREVISÃO FINANCEIRA
      </span>
      <h3>Valores previstos do mês</h3>
      <p>
        Movimentações futuras do período selecionado
      </p>
    </div>

    
<div className="monthly-forecast-heading-actions">
  <button
    type="button"
    className="primary-button"
    onClick={handleOpenNewForecast}
  >
    <Plus size={16} />
    Nova previsão
  </button>

  <CalendarDays size={22} />
</div>

  </div>

  <div className="monthly-forecast-grid">
    <div className="monthly-forecast-item">
      <span>Entradas futuras</span>
      <strong className="forecast-income">
        {formatMoney(monthlyForecast.futureIncome)}
      </strong>
    </div>

    <div className="monthly-forecast-item">
      <span>Saídas futuras</span>
      <strong className="forecast-expense">
        {formatMoney(monthlyForecast.futureExpense)}
      </strong>
    </div>

    <div className="monthly-forecast-item">
      <span>Resultado até a data atual</span>
      <strong>
        {formatMoney(monthlyForecast.recordedBalance)}
      </strong>
    </div>

    <div className="monthly-forecast-item">
      <span>Resultado das movimentações futuras</span>
      <strong>
        {formatMoney(monthlyForecast.futureBalance)}
      </strong>
    </div>
  </div>


{/* RESUMO DAS PREVISÕES MANUAIS */}
<div className="manual-forecast-summary">
  <div className="manual-forecast-summary-heading">
    <h4>Planejamento manual</h4>
    <span>
      {manualForecastSummary.count} previsões cadastradas
    </span>
  </div>

  <div className="manual-forecast-summary-grid">
    <div className="manual-forecast-summary-item">
      <span>Entradas previstas manualmente</span>
      <strong className="forecast-income">
        {formatMoney(manualForecastSummary.income)}
      </strong>
    </div>

    <div className="manual-forecast-summary-item">
      <span>Saídas previstas manualmente</span>
      <strong className="forecast-expense">
        {formatMoney(manualForecastSummary.expense)}
      </strong>
    </div>
  </div>

  <div className="manual-forecast-summary-result">
    <span>Resultado das previsões manuais</span>
    <strong>
      {formatMoney(manualForecastSummary.balance)}
    </strong>
  </div>
</div>


  <div className="monthly-forecast-footer">
    <span>Resultado previsto do mês</span>
    <strong>
      {formatMoney(
  monthlyForecast.expectedBalance +
  manualForecastSummary.balance
)}
    </strong>
  </div>

  <p className="monthly-forecast-note">
    A previsão considera as datas das transações cadastradas.
    Datas anteriores não confirmam pagamentos realizados.
    Faturas pendentes não são adicionadas automaticamente.
  </p>

  
<div className="manual-forecast-section">
  <h4>Previsões manuais</h4>

  {manualForecasts.filter(
    forecast => forecast.date.startsWith(dashboardMonth)
  ).length === 0 ? (
    <p className="manual-forecast-empty">
      Nenhuma previsão manual cadastrada neste mês.
    </p>
  ) : (
    <div className="manual-forecast-list">
      {manualForecasts
        .filter(forecast =>
          forecast.date.startsWith(dashboardMonth)
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(forecast => (
          <div
            key={forecast.id}
            className="manual-forecast-item"
          >
            <div className="manual-forecast-info">
              <strong>{forecast.description}</strong>
              <span>
                {forecast.type === 'income'
                  ? 'Entrada prevista'
                  : 'Saída prevista'}
                {' · '}
                {formatDate(forecast.date)}
              </span>
            </div>

            <div className="manual-forecast-item-actions">
              <strong
                className={
                  forecast.type === 'income'
                    ? 'forecast-income'
                    : 'forecast-expense'
                }
              >
                {formatMoney(forecast.amount)}
              </strong>

              <button
                type="button"
                className="history-icon-button"
                aria-label={`Editar ${forecast.description}`}
                onClick={() => handleEditForecast(forecast)}
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                className="history-icon-button"
                aria-label={`Excluir ${forecast.description}`}
                onClick={() =>
                  handleDeleteManualForecast(forecast.id)
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
    </div>
  )}
</div>

</section>

{/* PAINEL DE CARTÕES DO DASHBOARD */}
<section className="dashboard-cards-panel">
  <div className="dashboard-cards-heading">
    <div>
      <span className="monthly-forecast-eyebrow">
        MEUS CARTÕES
      </span>

      <h3>Seus cartões</h3>

      <p>
        Acompanhe seus cartões em um só lugar.
      </p>
    </div>
  </div>

<DashboardCardStack
  cards={dashboardCards}
  onOpenCard={cardId => {
    setDashboardCardDetailsId(cardId)
  }}
/>

<div className="dashboard-card-summary">
  <div className="dashboard-card-summary-item">
    <span>Limite total</span>
    <strong>{formatMoney(dashboardCardsSummary.limit)}</strong>
  </div>

  <div className="dashboard-card-summary-item">
    <span>Limite utilizado</span>
    <strong className="dashboard-card-used">
      {formatMoney(dashboardCardsSummary.used)}
    </strong>
  </div>

  <div className="dashboard-card-summary-item">
    <span>Limite disponível</span>
    <strong className="dashboard-card-available">
      {formatMoney(dashboardCardsSummary.available)}
    </strong>
  </div>
</div>

<div className="dashboard-limit-usage">
  <div className="dashboard-limit-usage-heading">
    <span>Utilização do limite</span>

    <strong>
      {formatDecimal(
        dashboardCardsSummary.limit > 0
          ? (dashboardCardsSummary.used / dashboardCardsSummary.limit) * 100
          : 0
      )}
      %
    </strong>
  </div>

  <div
    className="dashboard-limit-usage-track"
    role="progressbar"
    aria-label="Utilização do limite dos cartões"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={
      dashboardCardsSummary.limit > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (dashboardCardsSummary.used /
                dashboardCardsSummary.limit) *
                100
            )
          )
        : 0
    }
  >
    <div
      className="dashboard-limit-usage-fill"
      style={{
        width: `${
          dashboardCardsSummary.limit > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  (dashboardCardsSummary.used /
                    dashboardCardsSummary.limit) *
                    100
                )
              )
            : 0
        }%`,

background:
  dashboardCardsSummary.limit <= 0
    ? '#64e6a5'
    : dashboardCardsSummary.used /
        dashboardCardsSummary.limit >= 0.75
      ? 'linear-gradient(90deg, #ff789a, #ff4f78)'
      : dashboardCardsSummary.used /
          dashboardCardsSummary.limit >= 0.4
        ? 'linear-gradient(90deg, #7c91ff, #9b75ff)'
        : 'linear-gradient(90deg, #36c995, #64e6a5)',

      }}
    />
  </div>
</div>

</section>

</div>
</>
)}


<ConfirmDialog
  open={forecastToDelete !== null}
  title="Excluir previsão?"
  message={
    forecastToDelete
      ? `Deseja realmente excluir "${forecastToDelete.description}"? Essa ação não poderá ser desfeita.`
      : ''
  }
  confirmLabel="Excluir previsão"
  onConfirm={handleConfirmDeleteForecast}
  onCancel={() => setForecastToDelete(null)}
/>


<ConfirmDialog
  open={transactionToDelete !== null}
  title="Excluir transação?"
  message="Deseja realmente excluir esta transação? Essa ação não poderá ser desfeita."
  confirmLabel="Excluir transação"
  onConfirm={handleConfirmDeleteTransaction}
  onCancel={() => setTransactionToDelete(null)}
/>

<DashboardCardDetailsModal
  card={dashboardCardDetails}
  onClose={() => setDashboardCardDetailsId(null)}
  onViewInvoices={cardId => {
    setDashboardCardDetailsId(null)
    handleOpenDashboardCard(cardId)
  }}
/>

{showForecastModal && (
  <div
    className={`modal-overlay ${
      isForecastModalClosing ? 'is-closing' : ''
    }`}
    onClick={handleCloseForecastModal}
    onAnimationEnd={event => {
      if (
        isForecastModalClosing &&
        event.target === event.currentTarget
      ) {
        finishCloseForecastModal()
      }
    }}
  >

    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-forecast-modal-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="manual-forecast-modal-title">
            {editingForecast
              ? 'Editar previsão'
              : 'Nova previsão'}
          </h2>
          <p>
            Planeje suas movimentações financeiras.
          </p>
        </div>

       <button
  type="button"
  className="modal-close"
  aria-label="Fechar"
  onClick={handleCloseForecastModal}
>
  <X size={20} />
</button>
      </div>

      <div className="transaction-modal-content">
        <ManualForecastForm
          key={editingForecast?.id ?? 'new'}
          initialValue={editingForecast}
          onSave={handleSaveManualForecast}
          onCancel={handleCloseForecastModal}
        />
      </div>
    </div>
  </div>
)}

{activePage === 'Dashboard' && selectedInvoiceCard && (
  <div
    className={`dashboard-invoice-overlay ${
      isInvoiceModalClosing ? 'is-closing' : ''
    }`}
    onClick={closeInvoiceModal}
  >
    <section
      className="panel dashboard-invoice-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Faturas do cartão ${selectedInvoiceCard.name}`}
      style={{
        '--invoice-accent': selectedInvoiceCard.color,
        ...(selectedInvoiceCard.image
          ? {
              backgroundImage: `
                linear-gradient(
                  180deg,
                  rgba(14, 17, 28, 0.94),
                  rgba(14, 17, 28, 0.97)
                ),
                url("${selectedInvoiceCard.image}")
              `,
            }
          : {}),
      } as React.CSSProperties}
      onClick={event => event.stopPropagation()}
    >
    <div className="panel-heading">
      <div>
        <h3>Faturas — {selectedInvoiceCard.name}</h3>
        <p>{selectedInvoiceCard.bank}</p>
      </div>

      <button
  type="button"
  className="dashboard-invoice-close"
  aria-label="Fechar faturas"
  title="Fechar"
  onClick={closeInvoiceModal}
>
  <X size={20} />
</button>
    </div>

    {selectedCardInvoices.length === 0 ? (
      <p>Este cartão ainda não possui faturas registradas.</p>
    ) : (
      <>

 <div className="invoice-period-selectors">
  {/* SELETOR DE MÊS */}
  <div className="invoice-period-field">
    <span>Mês</span>

    <div className="invoice-custom-select">
      <button
        type="button"
        className={`invoice-select-trigger ${
          openInvoiceSelector === 'month' ? 'is-open' : ''
        }`}
        aria-expanded={openInvoiceSelector === 'month'}
        aria-label="Selecionar mês da fatura"
        onClick={() => toggleInvoiceSelector('month')}
      >
        <span>
          {invoiceMonthOptions[Number(selectedMonthNumber) - 1]}
        </span>
        <span className="invoice-select-chevron">
  <ChevronDown size={18} strokeWidth={2.2} />
</span>
      </button>

      {openInvoiceSelector === 'month' && (
        <div
  className={`invoice-select-menu ${
    closingInvoiceSelector === openInvoiceSelector
      ? 'is-closing'
      : ''
  }`}
>
          {invoiceMonthOptions.map((month, index) => {
            const value = String(index + 1).padStart(2, '0')

            if (!availableInvoiceMonths.includes(value)) {
              return null
            }

            return (
              <button
                key={value}
                type="button"
                className={`invoice-select-option ${
                  selectedMonthNumber === value ? 'is-selected' : ''
                }`}
                aria-pressed={selectedMonthNumber === value}
                onClick={() => {
                  setInvoicePaymentMode(null)
                  setSelectedInvoiceMonth(`${selectedYear}-${value}`)
                  setOpenInvoiceSelector(null)
                }}
              >
                <span>{month}</span>
                {selectedMonthNumber === value && <span>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  </div>

  {/* SELETOR DE ANO */}
  <div className="invoice-period-field">
    <span>Ano</span>

    <div className="invoice-custom-select">
      <button
        type="button"
        className={`invoice-select-trigger ${
          openInvoiceSelector === 'year' ? 'is-open' : ''
        }`}
        aria-expanded={openInvoiceSelector === 'year'}
        aria-label="Selecionar ano da fatura"
        onClick={() => toggleInvoiceSelector('year')}
      >
        <span>{selectedYear}</span>
        <span className="invoice-select-chevron">
  <ChevronDown size={18} strokeWidth={2.2} />
</span>
      </button>

      {openInvoiceSelector === 'year' && (
        <div
  className={`invoice-select-menu ${
    closingInvoiceSelector === openInvoiceSelector
      ? 'is-closing'
      : ''
  }`}
>
          {availableInvoiceYears.map(year => (
            <button
              key={year}
              type="button"
              className={`invoice-select-option ${
                selectedYear === year ? 'is-selected' : ''
              }`}
              aria-pressed={selectedYear === year}
              onClick={() => {
                const months = selectedCardInvoices
                  .filter(invoice =>
                    invoice.invoiceMonth.startsWith(`${year}-`)
                  )
                  .map(invoice => invoice.invoiceMonth.slice(5, 7))

                const month = months.includes(selectedMonthNumber)
                  ? selectedMonthNumber
                  : months[0]

                if (month) {
                  setInvoicePaymentMode(null)
                  setSelectedInvoiceMonth(`${year}-${month}`)
                }

                closeInvoiceSelector()
              }}
            >
              <span>{year}</span>
              {selectedYear === year && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
</div>

        {selectedInvoice && selectedInvoiceSummary && (
          <>
            <div className="dashboard-invoice-summary">
              <div>
                <span>Total da fatura</span>
                <strong>
                  {formatMoney(selectedInvoiceSummary.invoiceTotal)}
                </strong>
              </div>

              <div>
                <span>Total pago</span>
                <strong>
                  {formatMoney(selectedInvoiceSummary.totalPaid)}
                </strong>
              </div>

              <div>
                <span>Saldo em aberto</span>
                <strong>
                  {formatMoney(selectedInvoiceSummary.remaining)}
                </strong>
              </div>

              <div>
                <span>Situação</span>
                <strong>
                  {selectedInvoiceSummary.status === 'paid'
                    ? 'Paga'
                    : selectedInvoiceSummary.status === 'partial'
                      ? 'Parcialmente paga'
                      : selectedInvoiceSummary.status === 'overpaid'
                        ? 'Pagamento excedente'
                        : 'Em aberto'}
                </strong>
              </div>
            </div>

{selectedInvoiceSummary.remaining > 0 && (
  <>
    <div className="dashboard-invoice-actions">
      <button
        type="button"
        onClick={() => setInvoicePaymentMode('partial')}
      >
        Pagar parcialmente
      </button>

      <button
  type="button"
  onClick={() => {
    if (!selectedInvoice || !selectedInvoiceSummary) return

    const amount = selectedInvoiceSummary.remaining

    if (!Number.isFinite(amount) || amount <= 0) return

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    setInvoicePaymentMode(null)

    setConfirmInvoicePayment({
      amount,
      date: `${year}-${month}-${day}`,
      invoiceKey: `${selectedInvoice.cardId}:${selectedInvoice.invoiceMonth}`,
    })
  }}
>
  Quitar fatura
</button>
    </div>

    {invoicePaymentMode === 'partial' && (
      <div className="dashboard-invoice-payment-form">
        <h4>Pagamento parcial</h4>

        <CardPaymentForm
          remaining={selectedInvoiceSummary.remaining}
          onSubmit={handleDashboardInvoicePayment}
        />

        <button
          type="button"
          onClick={() => setInvoicePaymentMode(null)}
        >
          Cancelar
        </button>
      </div>
    )}
  </>
)}

            <h4>Compras e parcelas do mês</h4>

            <div className="dashboard-invoice-purchases">
              {selectedInvoice.installments.map(installment => (
                <div
                  key={`${installment.purchaseId}-${installment.installmentNumber}`}
                  className="dashboard-invoice-purchase"
                >
                  <div>
                    <strong>{installment.description}</strong>
                    <span>
                      Parcela {installment.installmentNumber}/
                      {installment.totalInstallments}
                    </span>
                  </div>

                  <strong>{formatMoney(installment.amount)}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    )}
  </section>
</div>
)}

{confirmInvoicePayment && (
  <div
    className={`invoice-confirm-overlay ${
      isInvoiceConfirmClosing ? 'is-closing' : ''
    }`}
    onClick={closeInvoiceConfirmation}
  >
    <section
      className="invoice-confirm-panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="invoice-confirm-title"
      aria-describedby="invoice-confirm-description"
      onClick={event => event.stopPropagation()}
    >
      <div className="invoice-confirm-heading">
        <h3 id="invoice-confirm-title">Confirmar quitação</h3>

        <button
          type="button"
          className="invoice-confirm-close"
          aria-label="Cancelar quitação"
          onClick={closeInvoiceConfirmation}
        >
          <X size={20} />
        </button>
      </div>

      <p id="invoice-confirm-description">
        Deseja quitar a sua fatura?
      </p>

      <strong className="invoice-confirm-amount">
        {formatMoney(confirmInvoicePayment.amount)}
      </strong>

      <p className="invoice-confirm-description">
        O pagamento será registrado somente após sua confirmação.
      </p>

      <div className="invoice-confirm-actions">
        <button
          type="button"
          className="invoice-confirm-cancel"
          onClick={closeInvoiceConfirmation}
        >
          Não, cancelar
        </button>

        <button
          type="button"
          className="invoice-confirm-accept"
          onClick={() => {
            const pending = confirmInvoicePayment

            if (
              !selectedInvoice ||
              `${selectedInvoice.cardId}:${selectedInvoice.invoiceMonth}` !==
                pending.invoiceKey ||
              !selectedInvoiceSummary ||
              Math.round(selectedInvoiceSummary.remaining * 100) !==
                Math.round(pending.amount * 100)
            ) {
              setConfirmInvoicePayment(null)
              alert('A fatura mudou. Confira os valores antes de continuar.')
              return
            }

            setConfirmInvoicePayment(null)
            handleDashboardInvoicePayment(pending.amount, pending.date)
          }}
        >
          Sim, quitar fatura
        </button>
      </div>
    </section>
  </div>
)}


{activePage === 'Dashboard' && (
  <section className="dashboard-analysis-section">
    <div className="dashboard-section-heading">
      <div className="dashboard-section-icon">
        <ChartNoAxesCombined size={20} />
      </div>

      <div>
        <span className="dashboard-section-eyebrow">
          ANÁLISE FINANCEIRA
        </span>
        <h2>Análise financeira</h2>
        <p>
          Acompanhe a evolução das suas movimentações.
        </p>
      </div>
    </div>

    {/* Gráficos entram logo depois da página: a troca de aba não trava */}
    <Deferred minHeight={760} delay={380}>
    <FinanceCharts
      transactions={dashboardChartTransactions}
      projection={financialProjection}
      extraChart={<CardSpendingChart month={dashboardMonth} revision={cardsRevision} />}
    />
    </Deferred>

  </section>
)}


{activePage === 'Dashboard' && (
  <div className="dashboard-section-heading dashboard-movements-heading">
    <div className="dashboard-section-icon">
      <ArrowLeftRight size={20} />
    </div>

    <div>
      <span className="dashboard-section-eyebrow">
        MOVIMENTAÇÕES FINANCEIRAS
      </span>

      <h2>Transações recentes</h2>

      <p>
        Acompanhe suas últimas entradas e saídas.
      </p>
    </div>
  </div>
)}


              {activePage === 'Transações' && (
                <div className="pf-transactions-charts">
                  <TransactionsCategoryChart
                    transactions={spendingEntries}
                    month={filterMonth}
                    category={filterCategory}
                    type={filterType}
                  />

                  <Deferred minHeight={420} delay={300}>
                    <FinancialComparisonCharts
                      only="categories"
                      transactions={[]}
                      categoryTransactions={transactionsEvolution}
                      categoryEndMonth={transactionsEvolutionEnd}
                    />
                  </Deferred>
                </div>
              )}

              <section
  className={`panel transactions-panel ${
    activePage === 'Dashboard'
      ? 'dashboard-recent-transactions'
      : ''
  }`}
>
                <div className="panel-heading">
                  <div>
                    <h3>
                      {activePage === 'Dashboard'
                        ? 'Transações recentes'
                        : 'Todas as transações'}
                    </h3>
                    <p>Suas movimentações financeiras</p>
                  </div>

                  {activePage === 'Transações' && (
                    <div className="pf-tx-tools">
                      <StatementImport
                        onImported={count => {
                          setTransactions(getTransactions())
                          showToast('success', count === 1 ? '1 transação importada!' : `${count} transações importadas!`)
                        }}
                      />
                      <RecurringManager />
                    </div>
                  )}

                  {activePage === 'Dashboard' && (
                    <button
                      className="text-button"
                      onClick={() => setActivePage('Transações')}
                    >
                      Ver todas
                    </button>
                  )}
                </div>

{activePage === 'Transações' && (
  <div className="pf-tx-search">
    <Search size={18} aria-hidden="true" />
    <input
      type="search"
      value={searchText}
      onChange={event => setSearchText(event.target.value)}
      placeholder="Buscar por nome, categoria ou valor (ex.: uber, farmácia, 45,90)"
      aria-label="Buscar transações"
    />
    {searchText && (
      <button type="button" onClick={() => setSearchText('')} aria-label="Limpar busca">
        <X size={16} />
      </button>
    )}
  </div>
)}

{activePage === 'Transações' && hasActiveFilters && (
  <div className="pf-tx-results" aria-live="polite">
    <strong>{filteredSummary.count} {filteredSummary.count === 1 ? 'resultado' : 'resultados'}</strong>
    {filteredSummary.income > 0 && <span className="income">+ {formatMoney(filteredSummary.income)}</span>}
    {filteredSummary.expense > 0 && <span className="expense">- {formatMoney(filteredSummary.expense)}</span>}
  </div>
)}

{activePage === 'Transações' && (
  <div className="filters">
    <div className="filter-field">
  <label htmlFor="filter-month">Mês</label>

  <MonthPicker
    id="filter-month"
    value={filterMonth}
    onChange={setFilterMonth}
    clearable
  />
</div>

    <div className="filter-field">
      <label htmlFor="filter-category">Categoria</label>
      
<SelectField
  id="filter-category"
  value={filterCategory}
  onChange={setFilterCategory}
  options={[
    { value: 'Todas', label: 'Todas' },

...[...new Set(
  transactions.map(transaction => transaction.category)
)]
  .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  .map(item => ({
    value: item,
    label: item,
  })),

  ]}
  placeholder="Todas as categorias"
/>

    </div>

    <div className="filter-field">
      <label htmlFor="filter-type">Tipo</label>
      
<SelectField
  id="filter-type"
  value={filterType}
  onChange={setFilterType}
  options={[
    { value: 'Todos', label: 'Todos' },
    { value: 'income', label: 'Entradas' },
    { value: 'expense', label: 'Saídas' },
  ]}
  placeholder="Todos os tipos"
/>

    </div>

    <button
      className="clear-filters"
      onClick={() => {
        setFilterMonth('')
        setFilterCategory('Todas')
        setFilterType('Todos')
        setSearchText('')
      }}
    >
      Limpar filtros
    </button>
  </div>
)}

                <div className="transaction-list">
                  {filteredTransactions.length === 0 ? (
                    <div className="empty-state">
                      <Wallet size={32} />
                      {transactions.length > 0 && activePage === 'Transações' ? (
                        <>
                          <strong>Nenhuma transação encontrada</strong>
                          <p>Tente outra busca ou limpe os filtros.</p>
                        </>
                      ) : (
                        <>
                          <strong>Nenhuma transação cadastrada</strong>
                          <p>
                            Clique em Nova transação para começar.
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredTransactions
                      .slice(
                        0,
                        activePage === 'Dashboard' ? 5 : undefined
                      )
                      .map(item => (
                        <div className="transaction" key={item.id}>
                          {(() => {
                            // Ícone da subcategoria (ou da categoria) no lugar do emoji.
                            const visual = getTransactionVisual(item.category, item.type)

                            return (
                              <div
                                className="transaction-icon pf-tx-icon"
                                style={{ '--tx-color': visual.color } as React.CSSProperties}
                                title={visual.label}
                              >
                                <CategoryIcon icon={visual.icon} size={19} />
                              </div>
                            )
                          })()}

                          <div className="transaction-info">
                            <strong>{item.description}</strong>
                            <small>
                              {item.category}
                              {item.source === 'card' && (
                                <span className="pf-tx-tag is-card">💳 {historyCardNames.get(item.cardId ?? "") ?? "Cartão"}</span>
                              )}
                              {item.source !== 'card' && isBoletoCategory(item.category) && <span className="pf-tx-tag is-boleto">Boleto</span>}
                              {invoicePaymentIds.has(item.id) && <span className="pf-tx-tag">Pagamento de fatura</span>}
                            </small>
                          </div>

                          <div className="transaction-value">
                            <strong className={item.type}>
                              {item.type === 'income' ? '+' : '-'}{' '}
                              {formatMoney(item.amount)}
                            </strong>
                            <small>{formatDate(item.date)}</small>
                          </div>


{item.source === 'card' ? (
<div className="transaction-actions">
  <button
    type="button"
    className="edit-button"
    aria-label={`Ver ${item.description} em Cartões`}
    title="Compra no cartão: edite em Cartões"
    onClick={() => navigate('Cartões')}
  >
    <CardPaymentIcon size={16} strokeWidth={1.8} />
  </button>
</div>
) : (
<div className="transaction-actions">
  <ReceiptButton transactionId={item.id} description={item.description} onMessage={showToast} />

  <button
    type="button"
    className="edit-button"
    aria-label={`Editar ${item.description}`}
    title="Editar transação"
    onClick={() => openEditTransaction(item)}
  >
    <Pencil size={16} strokeWidth={1.8} />
  </button>

  <button
    type="button"
    className="delete-button"
    aria-label={`Excluir ${item.description}`}
    title="Excluir transação"
    onClick={() => handleDelete(item.id)}
  >
    <Trash2 size={16} strokeWidth={1.8} />
  </button>
</div>
)}

</div>
                      ))
                  )}
                </div>
              </section>
            </>
)}

{activePage === 'Backup e restauração' && (
  <section className="backup-page">
    <div className="backup-page-heading">
  <span className="eyebrow">
  SEGURANÇA FINANCEIRA
</span>
<h1>
  Meus backups<span className="neon-dot">.</span>
</h1>
      <p>
        Proteja seus dados financeiros e gerencie suas cópias de segurança.
      </p>
    </div>

    <div className="backup-card-grid">
      <div className="backup-feature-card">
        <div className="backup-feature-icon export-icon">
          <Download size={24} />
        </div>

        <h3>Exportar dados</h3>
        <p>
          Gere um arquivo com os dados de todos os seus
          perfis. Escolha o formato:
        </p>

        <div className="pf-export-formats" role="radiogroup" aria-label="Formato do arquivo">
          {EXPORT_FORMATS.map(option => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={backupFormat === option.id}
              className={`pf-export-format ${backupFormat === option.id ? 'is-selected' : ''}`}
              onClick={() => setBackupFormat(option.id)}
            >
              <option.icon size={20} />
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="backup-feature-button export-button"
          onClick={handleExportBackup}
        >
          <Download size={17} />
          {EXPORT_FORMATS.find(option => option.id === backupFormat)?.action}
        </button>
      </div>

<ConfirmDialog
  open={pendingBackupFile !== null}
  title="Restaurar backup?"
  message={
    'A restauração substituirá seus dados atuais: ' +
    'transações, cartões, compras, pagamentos de faturas, ' +
    'devedores e, quando presentes no arquivo, metas, ' +
    'orçamentos, previsões e preferências. ' +
    'Backups antigos não contêm metas e orçamentos; ' +
    'nesse caso eles serão mantidos como estão. ' +
    'Deseja continuar?'
  }
  confirmLabel="Restaurar dados"
  onConfirm={() => {
    void handleConfirmImportBackup()
  }}
  onCancel={() => {
    if (!backupImportRunning.current) {
      setPendingBackupFile(null)
    }
  }}
/>

      <div className="backup-feature-card">
        <div className="backup-feature-icon import-icon">
          <Upload size={24} />
        </div>

        <h3>Restaurar dados</h3>
        <p>
          Selecione um arquivo de backup.
          A restauração pode substituir seus dados atuais.
        </p>

        <label className="backup-feature-button import-button">
          <Upload size={17} />
          Importar backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleImportBackup}
            hidden
          />
        </label>
      </div>
    </div>
    
<div className="backup-security-panel">
  <div className="backup-security-heading">
    <ShieldCheck size={22} />
    <div>
      <h3>Proteção dos seus dados</h3>
      <p>Informações importantes sobre seus backups.</p>
    </div>
  </div>

  <div className="backup-security-list">
    <div>
      <CheckCircle2 size={18} />
      <span>
        Guarde seus arquivos exportados em um local seguro.
      </span>
    </div>

    <div>
      <AlertTriangle size={18} />
      <span>
        A restauração pode substituir seus dados atuais.
      </span>
    </div>

    <div>
      <ShieldCheck size={18} />
      <span>
        Seus registros financeiros são armazenados
        apenas neste aparelho. Faça backups com frequência.
      </span>
    </div>

    <div>
      <ArrowLeftRight size={18} />
      <span>
        Quer os mesmos dados no celular e no computador?{' '}
        <button
          type="button"
          className="text-button"
          onClick={() => setActivePage('Sincronização')}
        >
          Abrir Sincronização
        </button>
      </span>
    </div>
  </div>
</div>

  </section>
)}

{activePage === 'Devedores' && <Debtors />}

{activePage === 'Guardado' && <Savings transactions={spendingEntries} />}

{activePage === 'Calendário' && <CalendarPage />}

{activePage === 'Central de ajuda' && <HelpCenter />}

{activePage === 'Sincronização' && <Sync />}

          {activePage === 'Relatórios' && (
            <Reports transactions={spendingEntries} />
          )}

          </div>

          <footer className="footer">
            <span>Personal Finance © 2026</span>
            <span>Organize hoje. Conquiste amanhã.</span>
          </footer>
        </section>
      </main>

{limitAlert && (
  <div className="modal-overlay limit-alert-overlay">
    <div
      className="limit-alert-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="limit-alert-title"
      aria-describedby="limit-alert-description"
    >
      <div className="limit-alert-heading">
        <div className="limit-alert-icon">
          !
        </div>

        <div>
          <h2 id="limit-alert-title">
            Limite insuficiente
          </h2>

          <p id="limit-alert-description">
            Não foi possível registrar a compra.
          </p>
        </div>
      </div>

      <div className="limit-alert-values">
        <div>
          <span>Limite disponível</span>
          <strong>{formatMoney(limitAlert.available)}</strong>
        </div>

        <div>
          <span>Valor da compra</span>
          <strong className="limit-alert-danger">
            {formatMoney(limitAlert.purchase)}
          </strong>
        </div>
      </div>

      <p className="limit-alert-message">
        A compra ultrapassa o limite em{' '}
        <strong>
          {formatMoney(
            limitAlert.purchase - limitAlert.available
          )}
        </strong>
        . Ajuste o valor ou selecione outro cartão.
      </p>

      <button
        type="button"
        className="primary-button limit-alert-confirm"
        onClick={() => setLimitAlert(null)}
      >
        Entendi
      </button>
    </div>
  </div>
)}

      {showModal && (
        <div
  className={`modal-overlay transaction-overlay ${
    isTransactionModalClosing ? 'is-closing' : ''
  }`}
  onClick={closeTransactionModal}
>
  <div
    className="modal transaction-modal"
  role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={event => event.stopPropagation()}
          >

<div className="modal-header">
  <div>
    <h2 id="modal-title">
      {editingId !== null
        ? 'Editar transação'
        : 'Nova transação'}
    </h2>

    <p>
      {editingId !== null
        ? 'Atualize os dados da movimentação'
        : 'Registre uma movimentação financeira'}
    </p>
  </div>


              <button
                className="modal-close"
                aria-label="Fechar"
                onClick={closeTransactionModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
  <div className="transaction-modal-content">
    <div className="type-selector">
                <button
                  type="button"
                  className={`type-button ${type === 'income' ? 'selected-income' : ''}`}
                  onClick={() => changeTransactionType('income')}
                >
                  <ArrowDownRight size={19} />
                  Entrada
                </button>

                <button
                  type="button"
                  className={`type-button ${type === 'expense' ? 'selected-expense' : ''}`}
                  onClick={() => changeTransactionType('expense')}
                >
                  <ArrowUpRight size={19} />
                  Saída
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <input
                  id="description"
                  type="text"
                  placeholder="Ex.: Supermercado"
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="amount">Valor (R$)</label>
                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  required
                />
              </div>

<div className="form-row transaction-category-layout">
  <div className="form-group">
    <label htmlFor="category">Categoria</label>


{type === 'expense' ? (
  <>
    <SelectField
      id="category"
      value={selectedGroupName}
      
onChange={value => {
  changeTransactionCategory(value)
}}

      
options={[
  ...CATEGORY_GROUPS.map(group => ({
    value: group.name,
    label: group.name,
    icon: group.icon,
    color: group.color,
  })),
  ...(
    !CATEGORY_GROUPS.some(
      group => group.name === selectedGroupName
    )
      ? [{
          value: selectedGroupName,
          label: `${selectedGroupName} (categoria antiga)`,
          icon: selectedGroup.icon,
          color: selectedGroup.color,
        }]
      : []
  ),
]}


      placeholder="Selecione uma categoria"
    />

<div className="transaction-subcategory-field">
  <label htmlFor="subcategory">
    Subcategoria
  </label>

      <SelectField
        id="subcategory"
        value={selectedSubcategory}
        onChange={value => {
          changeTransactionCategory(
  buildCategoryValue(
    selectedGroup.name,
    value
  )
)
        }}
        options={[
          {
            value: '',
            label: 'Sem subcategoria',
          },
          ...selectedGroup.subcategories.map(item => ({
            value: item,
            label: item,
            icon: SUBCATEGORY_ICONS[item] ?? selectedGroup.icon,
            color: selectedGroup.color,
          })),
          ...(selectedSubcategory &&
          !selectedGroup.subcategories.includes(
            selectedSubcategory
          )
            ? [{
                value: selectedSubcategory,
                label: selectedSubcategory,
              }]
            : []),
        ]}
        placeholder="Selecione uma subcategoria"
      />
    </div>
  </>
) : (

<SelectField
  id="category"
  value={category}
  onChange={changeTransactionCategory}
  options={[
    
...INCOME_CATEGORIES.map(item => ({
  value: item,
  label: item,
  icon: INCOME_CATEGORY_ICONS[item]?.icon ?? 'wallet',
  color: INCOME_CATEGORY_ICONS[item]?.color ?? '#8993A5',
})),

    ...(
      !INCOME_CATEGORIES.includes(category)
        ? [{
            value: category,
            label: `${category} (categoria antiga)`,
          }]
        : []
    ),
  ]}

  placeholder="Selecione uma categoria"
/>
)}

</div>
</div>



<div className="form-group transaction-date-field">
  <label htmlFor="date">
    {paymentMethod === 'boleto' || isBoletoCategory(category) ? 'Data de pagamento' : 'Data'}
  </label>

  <DatePicker
    id="date"
    value={date}
    onChange={setDate}
    required
  />
</div>

{/* Repetir todo mês (transação recorrente) */}
{editingId === null && !(type === 'expense' && paymentMethod === 'credit') && (
  <label className="pf-repeat-toggle">
    <span className="pf-repeat-toggle-icon"><Repeat size={18} /></span>
    <span className="pf-repeat-toggle-text">
      <strong>Repetir todo mês</strong>
      <small>
        {repeatMonthly
          ? `Será lançada sozinha todo dia ${Number(date.slice(8, 10)) || 1}.`
          : 'Ideal para salário, aluguel e assinaturas.'}
      </small>
    </span>
    <input
      type="checkbox"
      className="settings-toggle-input"
      role="switch"
      checked={repeatMonthly}
      onChange={event => setRepeatMonthly(event.target.checked)}
    />
  </label>
)}

{type === 'expense' && editingId === null && (
  <>
    <div className="form-group">
      <label htmlFor="payment-method">
        Forma de pagamento
      </label>

      <SelectField
  id="payment-method"
  value={paymentMethod}
  onChange={value => {
    setPaymentMethod(value as 'cash' | 'credit' | 'boleto')
    // Boleto: categoria própria (vai para o Calendário no dia do pagamento)
    if (value === 'boleto' && !isBoletoCategory(category)) setCategory(BOLETO_CATEGORY)
  }}
  options={[
    {
      value: 'cash',
      label: 'Dinheiro / Pix / Débito',
    },
    {
      value: 'credit',
      label: 'Cartão de crédito',
    },
    {
      value: 'boleto',
      label: 'Boleto',
    },
  ]}
  placeholder="Selecione a forma de pagamento"
/>
</div>

    {paymentMethod === 'credit' && (
      <>
        <div className="form-group">
          <label htmlFor="transaction-card">
            Cartão de crédito
          </label>

          <SelectField
  id="transaction-card"
  value={selectedCardId}
  onChange={setSelectedCardId}
  options={[
    {
      value: '',
      label: 'Selecione um cartão',
    },
    ...getCards().map(card => ({
      value: card.id,
      label: `${card.name} — ${card.bank}`,
    })),
  ]}
  placeholder="Selecione um cartão"
/>
        </div>

        <div className="form-group">
          <label htmlFor="card-installments">
            Quantidade de parcelas
          </label>

          <input
            id="card-installments"
            type="number"
            min="1"
            max="120"
            step="1"
            value={cardInstallments}
            onChange={event =>
              setCardInstallments(event.target.value)
            }
          />
        </div>

{previewCard && (
  <div className="transaction-card-limit">
    <div className="transaction-card-limit-header">
      <strong>Limite do cartão</strong>
      <span>{previewCard.name}</span>
    </div>

    <div className="transaction-card-limit-grid">
      <div>
        <span>Limite disponível</span>
        <strong>
          {formatMoney(previewAvailableLimit)}
        </strong>
      </div>

      <div>
        <span>Após esta compra</span>
        <strong
          className={
            previewExceedsLimit
              ? 'transaction-limit-negative'
              : 'transaction-limit-positive'
          }
        >
          {amount.trim() !== '' &&
          Number.isFinite(previewAmount) &&
          previewAmount > 0
            ? formatMoney(previewRemainingLimit)
            : '—'}
        </strong>
      </div>
    </div>

    {previewExceedsLimit && (
      <p className="transaction-card-limit-warning" role="alert">
        Esta compra ultrapassa o limite disponível do cartão.
        Escolha outro cartão ou diminua o valor.
      </p>
    )}
  </div>
)}

        {installmentPreview.length > 0 && (
  <div className="installment-preview">
    <div className="installment-preview-header">
      <strong>Prévia do parcelamento</strong>
      <span>
        {installmentPreview.length}x
      </span>
    </div>

    <p className="installment-preview-description">
      Confira como a compra será distribuída nas faturas.
    </p>

    <div className="installment-preview-list">
      {installmentPreview.map(installment => (
        <div
          className="installment-preview-item"
          key={installment.installmentNumber}
        >
          <div>
            <strong>
              Parcela {installment.installmentNumber}/
              {installment.totalInstallments}
            </strong>

            <span>
              {new Intl.DateTimeFormat('pt-BR', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(
                new Date(
                  `${installment.invoiceMonth}-01T12:00:00Z`
                )
              )}
            </span>
          </div>

          <strong className="installment-preview-value">
            {installment.amount.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </strong>
        </div>
      ))}
    </div>

    <div className="installment-preview-total">
      <span>Valor total da compra</span>

      <strong>
        {previewAmount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </strong>
    </div>
  </div>
)}

      </>
    )}
  </>
)}

</div> {/* Fecha transaction-modal-content */}


<div className="modal-footer">
  <button type="submit" className="primary-button">
    {editingId !== null
      ? 'Salvar alterações'
      : 'Salvar transação'}
  </button>
</div>


</form>
</div>
</div>
)}

{historySection !== null && (
  <div
    className={`modal-overlay history-overlay ${
      isHistoryClosing ? 'is-closing' : ''
    }`}
    onClick={closeHistoryModal}
  >
    <div
      className={`modal history-modal history-${historySection}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      onClick={event => event.stopPropagation()}
    >
      <div className="modal-header">
        <div>
          <h2 id="history-modal-title">
  {historySection === 'income'
    ? 'Histórico de entradas'
    : historySection === 'expense'
      ? 'Histórico de saídas'
      : historySection === 'projected'
        ? 'Histórico da projeção'
        : 'Histórico do mês'}
</h2>

<p>
  {historySection === 'projected'
    ? 'Evolução financeira dos próximos meses'
    : `Movimentações de ${new Date(`${dashboardMonth}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
</p>

        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Fechar histórico"
          onClick={closeHistoryModal}
        >
          <X size={20} />
        </button>
      </div>

      {historySection === 'projected' ? (
  <>
    <div className="history-total">
      <span>Saldo projetado para {monthLabelLong(nextProjection.month)}</span>
      <h2 className={nextProjection.total < 0 ? 'negative' : ''}>{formatMoney(nextProjection.total)}</h2>
    </div>

    <div className="projection-breakdown">
      <div className="projection-history-row">
        <span>Saldo de {monthLabelLong(dashboardMonth)} (cartão pela fatura que vence no mês)</span>
        <strong>{formatMoney(nextProjection.base)}</strong>
      </div>
      <div className="projection-history-row">
        <span>Entradas previstas</span>
        <strong className="positive">+{formatMoney(nextProjection.incomes)}</strong>
      </div>
      <div className="projection-history-row">
        <span>Faturas em aberto</span>
        <strong className="negative">-{formatMoney(nextProjection.invoices)}</strong>
      </div>
      <div className="projection-history-row">
        <span>Boletos a pagar</span>
        <strong className="negative">-{formatMoney(nextProjection.boletos)}</strong>
      </div>
      <div className="projection-history-row">
        <span>Outras despesas agendadas</span>
        <strong className="negative">-{formatMoney(nextProjection.otherExpenses)}</strong>
      </div>
    </div>

    <div className="history-list">
      <h3 className="projection-history-title">O que já está previsto</h3>
      {nextProjection.items.length === 0 ? (
        <p className="history-empty">Nada agendado para {monthLabelLong(nextProjection.month)} ainda.</p>
      ) : (
        nextProjection.items.map((item, index) => (
          <div className="projection-history-row" key={`${item.kind}-${index}`}>
            <span>
              {item.kind === 'invoice' ? '💳 ' : item.kind === 'boleto' ? '🧾 ' : item.kind === 'income' ? '⬆️ ' : '📌 '}
              {item.label}
              {item.date ? ` · ${item.date.slice(8, 10)}/${item.date.slice(5, 7)}` : ''}
            </span>
            <strong className={item.kind === 'income' ? 'positive' : 'negative'}>
              {item.kind === 'income' ? '+' : '-'}{formatMoney(item.amount)}
            </strong>
          </div>
        ))
      )}
    </div>
  </>
) : (
  <>
    <div className="history-total">
      <span>Total registrado</span>
      <h2>{formatMoney(historyTotal)}</h2>
    </div>

    <div className="history-list">
      {historyTransactions.length === 0 ? (
        <p className="history-empty">
          Nenhuma movimentação encontrada.
        </p>
      ) : (
        historyTransactions.map(transaction => (
          <div className="history-item" key={transaction.id}>
            <div className="history-item-details">
              <strong>{transaction.description}</strong>
              <span>
                {transaction.category} ·{' '}
                {transaction.date.split('-').reverse().join('/')}
              </span>
            </div>

            <strong
              className={
                transaction.type === 'income'
                  ? 'positive'
                  : 'negative'
              }
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatMoney(transaction.amount)}
            </strong>
          </div>
        ))
      )}
    </div>
  </>
)}
    </div>

  </div>
)}
    <AppDialog
  open={appAlert !== null}
  title={appAlert?.title ?? ''}
  message={appAlert?.message ?? ''}
  onClose={() => setAppAlert(null)}
/>

    <ProcessOverlay
      state={backupProcess.state}
      workingText={backupProcess.working}
      successText={backupProcess.success}
      detail={backupProcess.detail}
      onClose={closeBackupProcess}
    />

    {/* Aviso global: precisa ficar fora das páginas para aparecer em todas. */}
    <Toast
      key={toast?.id ?? 'empty-toast'}
      toast={toast}
      onClose={closeToast}
    />
    </div>
    </>
  )
}

export default App
 
