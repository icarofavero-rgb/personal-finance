
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { writeBackupRestoreData } from './backupRestoreWriter'
import type { BackupRestorePlan } from './backupRestorePlan'


type PlanV5 = Extract<BackupRestorePlan, { version: 5 }>

type PlanV4 = Omit<
  Extract<BackupRestorePlan, { version: 1 | 2 | 3 | 4 }>,
  'version'
> & {
  version: 4
}


const memory = new Map<string, string>()

const DEBTORS_KEY = 'personal-finance-debtors-v1'


function makeV5Plan(): PlanV5 {
  return {
    version: 5,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
    debtorsData: {
      debtors: [
        {
          id: 'person-1',
          name: 'Mariana',
          createdAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      debts: [],
      payments: [],
    },
  }
}


function makeV4Plan(): PlanV4 {
  return {
    version: 4,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
  }
}

describe('Gravação dos backups V4 e V5', () => {
  beforeEach(() => {
    memory.clear()

    vi.stubGlobal('localStorage', {
      getItem(key: string): string | null {
        return memory.get(key) ?? null
      },
      setItem(key: string, value: string): void {
        memory.set(key, value)
      },
      removeItem(key: string): void {
        memory.delete(key)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('grava os cinco conjuntos de dados do V5', () => {
    const plan = makeV5Plan()

    writeBackupRestoreData(plan)

    expect(memory.get('personal-finance-transactions'))
      .toBe(JSON.stringify(plan.transactions))

    expect(memory.get('personal-finance-credit-cards'))
      .toBe(JSON.stringify(plan.cards))

    expect(memory.get('personal-finance-card-purchases'))
      .toBe(JSON.stringify(plan.purchases))

    expect(memory.get('personal-finance-card-payments'))
      .toBe(JSON.stringify(plan.payments))

    expect(memory.get(DEBTORS_KEY))
      .toBe(JSON.stringify(plan.debtorsData))
  })

  it('preserva os Devedores durante uma gravação V4', () => {
    const original = '{"debtors":[{"id":"original"}]}'

    memory.set(DEBTORS_KEY, original)

    writeBackupRestoreData(makeV4Plan())

    expect(memory.get(DEBTORS_KEY)).toBe(original)
  })

  it('rejeita versões antigas antes de gravar', () => {
   
const invalidPlan: BackupRestorePlan = {
  version: 3,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}


    expect(() =>
      writeBackupRestoreData(invalidPlan)
    ).toThrow()

    expect(memory.size).toBe(0)
  })

  it('interrompe a gravação quando ocorre uma falha', () => {
    const plan = makeV5Plan()

    const storage = globalThis.localStorage
    let writes = 0

    vi.stubGlobal('localStorage', {
      getItem: storage.getItem.bind(storage),
      removeItem: storage.removeItem.bind(storage),

      setItem(key: string, value: string): void {
        writes++

        if (key === DEBTORS_KEY) {
          throw new Error('Falha simulada de gravação')
        }

        storage.setItem(key, value)
      },
    })

    expect(() =>
      writeBackupRestoreData(plan)
    ).toThrow('Falha simulada de gravação')

    expect(writes).toBe(5)
  })
})
