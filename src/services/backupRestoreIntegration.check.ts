
import { importBackup } from './backup'

const memory = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string): string | null {
      return memory.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      memory.set(key, value)
    },
    removeItem(key: string): void {
      memory.delete(key)
    },
  },
})

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }

  console.log(`OK: ${message}`)
}

const KEY = 'personal-finance-pending-backup-restore'

async function runTests() {
  const emptyPlan = {
    version: 4,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
  }

  memory.set(
    KEY,
    JSON.stringify({
      operationId: 'restore-integration-test',
      createdAt: new Date().toISOString(),
      previousData: emptyPlan,
      targetData: emptyPlan,
    })
  )

  // O arquivo não precisa ser lido:
  // a proteção deve bloquear antes dessa etapa.
  let fileWasRead = false

  const fakeFile = {
    async text() {
      fileWasRead = true
      return '{}'
    },
  } as File

  let blocked = false

  try {
    await importBackup(fakeFile)
  } catch {
    blocked = true
  }

  assert(
    blocked,
    'Importação bloqueada com restauração pendente'
  )

  assert(
    fileWasRead === false,
    'Arquivo não foi lido antes da verificação'
  )

  assert(
    memory.size === 1 && memory.has(KEY),
    'Dados armazenados permaneceram inalterados'
  )

  memory.clear()

  console.log('Todos os testes de integração passaram!')
}

runTests().catch(error => {
  console.error(error)
  throw error
})
