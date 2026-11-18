import { describe, expect, it } from 'vitest'

/** Armazenamento de mentira com a mesma "forma" do localStorage do navegador. */
class FakeStorage {
  memory = new Map<string, string>()
  getItem(key: string) {
    return this.memory.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.memory.set(key, String(value))
  }
  removeItem(key: string) {
    this.memory.delete(key)
  }
  key(index: number) {
    return [...this.memory.keys()][index] ?? null
  }
  get length() {
    return this.memory.size
  }
}

let current = new FakeStorage()

Object.assign(globalThis, { Storage: FakeStorage })
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => current })

const scope = await import('../profileScope')
const profiles = await import('../financialProfilesStorage')
const { applyRemoteSyncPackage, createLocalSyncPackage } = await import('./syncApply')

scope.installProfileScope()

const TX = 'personal-finance-transactions'

function tx(id: string, description: string) {
  return { id, description, amount: 10, type: 'expense', category: 'Outros', date: '2026-11-15' }
}

/** Troca o "aparelho" em uso (e o perfil aberto nele). */
function switchDevice(device: FakeStorage) {
  current = device
  scope.setActiveProfileInMemory(profiles.getFinancialProfilesState().activeProfileId)
}

function readTx(device: FakeStorage, profileId: string) {
  switchDevice(device)
  return scope.withProfileView(profileId, () => JSON.parse(localStorage.getItem(TX) ?? '[]') as { id: string }[])
    .map(item => item.id)
    .sort()
}

function addTx(device: FakeStorage, profileId: string, item: ReturnType<typeof tx>) {
  switchDevice(device)
  scope.withProfileView(profileId, () => {
    const list = JSON.parse(localStorage.getItem(TX) ?? '[]')
    localStorage.setItem(TX, JSON.stringify([...list, item]))
  })
}

function syncPair(a: FakeStorage, b: FakeStorage) {
  switchDevice(a)
  const packageA = JSON.parse(JSON.stringify(createLocalSyncPackage()))
  switchDevice(b)
  const packageB = JSON.parse(JSON.stringify(createLocalSyncPackage()))

  switchDevice(a)
  applyRemoteSyncPackage(packageB)
  switchDevice(b)
  applyRemoteSyncPackage(packageA)
}

describe('multiperfis na sincronização', () => {
  const phone = new FakeStorage()
  const pc = new FakeStorage()
  let workId = ''

  it('cada perfil guarda as próprias transações', () => {
    addTx(phone, 'default', tx('p1', 'Mercado'))

    switchDevice(phone)
    workId = profiles.createFinancialProfile('Trabalho').id
    addTx(phone, workId, tx('w1', 'Almoço do trabalho'))

    expect(readTx(phone, 'default')).toEqual(['p1'])
    expect(readTx(phone, workId)).toEqual(['w1'])

    // O perfil principal continua na chave de sempre (sem migração)
    expect(phone.memory.get(TX)).toContain('p1')
    expect(phone.memory.get(TX)).not.toContain('w1')
  })

  it('o perfil aberto decide o que o app enxerga', () => {
    switchDevice(phone)
    profiles.setActiveFinancialProfile(workId)
    expect(JSON.parse(localStorage.getItem(TX)!).map((item: { id: string }) => item.id)).toEqual(['w1'])

    profiles.setActiveFinancialProfile('default')
    expect(JSON.parse(localStorage.getItem(TX)!).map((item: { id: string }) => item.id)).toEqual(['p1'])
  })

  it('sincronizar leva o perfil principal E os outros perfis juntos', () => {
    addTx(pc, 'default', tx('c1', 'Luz'))

    syncPair(phone, pc)

    switchDevice(pc)
    expect(profiles.getFinancialProfiles().map(item => item.name)).toEqual(['Principal', 'Trabalho'])
    expect(readTx(pc, 'default')).toEqual(['c1', 'p1'])
    expect(readTx(pc, workId)).toEqual(['w1'])
    expect(readTx(phone, 'default')).toEqual(['c1', 'p1'])
  })

  it('novidades em qualquer perfil chegam ao outro aparelho', () => {
    addTx(pc, workId, tx('w2', 'Uber do trabalho'))
    addTx(phone, 'default', tx('p2', 'Farmácia'))

    syncPair(phone, pc)

    expect(readTx(phone, workId)).toEqual(['w1', 'w2'])
    expect(readTx(pc, 'default')).toEqual(['c1', 'p1', 'p2'])
  })

  it('renomear e excluir um perfil também sincroniza', () => {
    switchDevice(phone)
    profiles.updateFinancialProfile(workId, { name: 'Empresa' })
    syncPair(phone, pc)
    switchDevice(pc)
    expect(profiles.getFinancialProfiles().map(item => item.name)).toContain('Empresa')

    switchDevice(phone)
    profiles.deleteFinancialProfile(workId)
    syncPair(phone, pc)

    switchDevice(pc)
    expect(profiles.getFinancialProfiles().map(item => item.name)).toEqual(['Principal'])
    expect([...pc.memory.keys()].some(key => key.includes(workId))).toBe(false)
    // O principal não é afetado
    expect(readTx(pc, 'default')).toEqual(['c1', 'p1', 'p2'])
  })

  it('aceita o pacote de uma versão anterior do app (sem perfis)', () => {
    const old = new FakeStorage()
    addTx(old, 'default', tx('o1', 'Antigo'))
    switchDevice(old)
    const multi = createLocalSyncPackage()
    const legacy = multi.packages.default

    switchDevice(phone)
    applyRemoteSyncPackage(JSON.parse(JSON.stringify(legacy)))
    expect(readTx(phone, 'default')).toContain('o1')
  })
})

describe('multiperfis no backup', () => {
  it('o backup guarda todos os perfis e a restauração devolve cada um ao seu lugar', async () => {
    const origin = new FakeStorage()
    addTx(origin, 'default', tx('m1', 'Mercado'))
    switchDevice(origin)
    const store = profiles.createFinancialProfile('Loja', '#f472b6', 'store')
    addTx(origin, store.id, tx('s1', 'Fornecedor'))

    const { createFullBackup, importBackup } = await import('../backup')
    switchDevice(origin)
    const json = JSON.stringify(createFullBackup())

    const fresh = new FakeStorage()
    switchDevice(fresh)
    await importBackup({ text: async () => json } as File)

    switchDevice(fresh)
    expect(profiles.getFinancialProfiles().map(item => item.name)).toEqual(['Principal', 'Loja'])
    expect(readTx(fresh, 'default')).toEqual(['m1'])
    expect(readTx(fresh, store.id)).toEqual(['s1'])
  })
})
