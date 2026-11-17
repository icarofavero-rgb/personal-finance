/**
 * Módulos complementares do backup.
 *
 * O Backup V5 cobre os dados financeiros principais (transações, cartões,
 * compras, pagamentos e devedores) com toda a proteção de snapshot/recuperação.
 * Este arquivo cuida do restante: Metas, Orçamentos, Previsões manuais e
 * preferências (perfil, aparência e notificações).
 *
 * Os módulos vão em um campo opcional `modules` do arquivo de backup:
 * backups antigos (sem esse campo) continuam funcionando normalmente.
 */

import { validateBudgetsData } from './budgetsStorage'
import { validateGoalsBackup } from './goalsBackup'
import { isManualForecast } from './manualForecastStorage'

type ModuleDefinition = {
  key: string
  label: string
  /** Lança erro se o valor (já convertido de JSON) for inválido. */
  validate: (value: unknown) => void
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireObject(label: string) {
  return (value: unknown) => {
    if (!isPlainObject(value)) {
      throw new Error(`As ${label} do backup são inválidas.`)
    }
  }
}

export const BACKUP_MODULES: readonly ModuleDefinition[] = [
  {
    key: 'personal-finance-goals',
    label: 'Metas',
    validate: value => {
      validateGoalsBackup({
        format: 'personal-finance-goals',
        version: 1,
        exportedAt: new Date().toISOString(),
        goals: value,
      })
    },
  },
  {
    key: 'personal-finance-budgets-v1',
    label: 'Orçamentos',
    validate: value => {
      validateBudgetsData(value)
    },
  },
  {
    key: 'personal-finance-manual-forecasts',
    label: 'Previsões manuais',
    validate: value => {
      if (!Array.isArray(value) || !value.every(isManualForecast)) {
        throw new Error('As previsões manuais do backup são inválidas.')
      }

      const ids = value.map(item => item.id)

      if (new Set(ids).size !== ids.length) {
        throw new Error('O backup contém previsões manuais duplicadas.')
      }
    },
  },
  {
    key: 'personal-finance-user-preferences',
    label: 'Perfil',
    validate: requireObject('preferências de perfil'),
  },
  {
    key: 'personal-finance-appearance',
    label: 'Aparência',
    validate: requireObject('preferências de aparência'),
  },
  {
    key: 'personal-finance-notification-preferences-v1',
    label: 'Notificações',
    validate: requireObject('preferências de notificação'),
  },
]

/** Dados dos módulos no arquivo: chave → valor (JSON já interpretado). */
export type BackupModulesData = Record<string, unknown>

/**
 * Lê os módulos salvos no aparelho para incluir no backup.
 * Módulos nunca usados (sem dados) são omitidos.
 */
export function collectBackupModules(): BackupModulesData {
  const modules: BackupModulesData = {}

  for (const module of BACKUP_MODULES) {
    const raw = localStorage.getItem(module.key)

    if (raw === null) continue

    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(
        `Os dados de ${module.label} estão corrompidos. ` +
        'O backup não foi gerado.'
      )
    }

    module.validate(parsed)
    modules[module.key] = parsed
  }

  return modules
}

/**
 * Confere os módulos de um arquivo de backup SEM gravar nada.
 * Retorna `null` quando o arquivo não tem módulos (backup antigo).
 */
export function validateBackupModules(
  value: unknown
): BackupModulesData | null {
  if (value === undefined) return null

  if (!isPlainObject(value)) {
    throw new Error('A seção de módulos do backup é inválida.')
  }

  const known = new Map(BACKUP_MODULES.map(module => [module.key, module]))

  for (const [key, data] of Object.entries(value)) {
    const module = known.get(key)

    if (!module) {
      throw new Error(`O backup contém um módulo desconhecido: ${key}.`)
    }

    try {
      module.validate(data)
    } catch (error) {
      throw new Error(
        `Os dados de ${module.label} no backup são inválidos. ` +
        'Nenhuma informação foi alterada.',
        { cause: error }
      )
    }
  }

  return value
}

/**
 * Grava os módulos já validados. Se qualquer gravação falhar
 * (ex.: armazenamento cheio), todos os módulos voltam ao estado anterior.
 * Retorna os nomes dos módulos restaurados.
 */
export function restoreBackupModules(modules: BackupModulesData): string[] {
  const previous = new Map<string, string | null>()

  for (const module of BACKUP_MODULES) {
    previous.set(module.key, localStorage.getItem(module.key))
  }

  const restored: string[] = []

  try {
    for (const module of BACKUP_MODULES) {
      if (!Object.prototype.hasOwnProperty.call(modules, module.key)) continue

      localStorage.setItem(module.key, JSON.stringify(modules[module.key]))
      restored.push(module.label)
    }
  } catch (error) {
    for (const [key, value] of previous) {
      try {
        if (value === null) {
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, value)
        }
      } catch {
        // Continua tentando restaurar os demais módulos.
      }
    }

    throw new Error(
      'Os dados financeiros foram restaurados, mas não foi possível ' +
      'restaurar Metas, Orçamentos, Previsões e preferências. ' +
      'Esses módulos permaneceram como estavam.',
      { cause: error }
    )
  }

  return restored
}
