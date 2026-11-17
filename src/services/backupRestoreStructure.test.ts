
import { hasValidRestoreStructure } from './backupRestoreStructure'

function assert(
  name: string,
  value: unknown,
  expected: boolean
): void {
  const actual = hasValidRestoreStructure(value)

  if (actual !== expected) {
    throw new Error(
      `FALHA: ${name}. Esperado ${expected}, recebido ${actual}.`
    )
  }

  console.log(`OK: ${name}`)
}

const validPlan = {
  version: 4,
  transactions: [],
  cards: [],
  purchases: [],
  payments: [],
}

assert('Plano válido', validPlan, true)

assert('Valor nulo', null, false)

assert('Texto inválido', 'backup', false)

assert('Versão desconhecida', {
  ...validPlan,
  version: 99,
}, false)

assert('Transações ausentes', {
  version: 4,
  cards: [],
  purchases: [],
  payments: [],
}, false)

assert('Cartões inválidos', {
  ...validPlan,
  cards: 'invalido',
}, false)

assert('Compras inválidas', {
  ...validPlan,
  purchases: null,
}, false)

assert('Pagamentos inválidos', {
  ...validPlan,
  payments: {},
}, false)

console.log('Todos os testes estruturais passaram!')
