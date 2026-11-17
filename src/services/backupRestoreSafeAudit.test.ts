
import { safelyAuditBackupRestore } from './backupRestoreSafeAudit'

function assert(
  name: string,
  condition: boolean
): void {
  if (!condition) {
    throw new Error(`FALHA: ${name}`)
  }

  console.log(`OK: ${name}`)
}

assert(
  'Valor nulo rejeitado',
  !safelyAuditBackupRestore(null).valid
)

assert(
  'Estrutura incompleta rejeitada',
  !safelyAuditBackupRestore({
    version: 4,
    transactions: [],
  }).valid
)

assert(
  'Identificador vazio rejeitado',
  !safelyAuditBackupRestore({
    version: 4,
    transactions: [{ id: '' }],
    cards: [],
    purchases: [],
    payments: [],
  }).valid
)

assert(
  'Plano vazio estruturalmente aceito',
  safelyAuditBackupRestore({
    version: 4,
    transactions: [],
    cards: [],
    purchases: [],
    payments: [],
  }).valid
)

console.log('Todos os testes preliminares passaram!')
