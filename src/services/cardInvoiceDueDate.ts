
import type { CreditCard } from './cardsStorage'

/**
 * Calcula o vencimento de uma fatura.
 *
 * Regra do Personal Finance:
 * a fatura vence no mês seguinte ao mês de referência.
 *
 * Exemplo:
 * Fatura 2026-11, vencimento dia 20
 * Resultado: 2026-12-20
 *
 * Não lê nem modifica dados armazenados.
 */
export function getCardInvoiceDueDate(
  invoiceMonth: string,
  dueDay: CreditCard['dueDay'],
  closingDay?: CreditCard['closingDay']
): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(invoiceMonth)) {
    throw new Error('Mês da fatura inválido.')
  }

  if (
    !Number.isInteger(dueDay) ||
    dueDay < 1 ||
    dueDay > 31
  ) {
    throw new Error('Dia de vencimento inválido.')
  }

  const [year, month] = invoiceMonth.split('-').map(Number)

  if (year < 1 || year > 9998) {
    throw new Error('Ano da fatura inválido.')
  }

  // Primeiro dia do mês seguinte, em UTC.
  // Com o fechamento informado: se o vencimento é depois do fechamento,
  // a fatura vence no próprio mês (fecha dia 10, vence dia 20);
  // senão, no mês seguinte (fecha dia 28, vence dia 5).
  const sameMonth = closingDay !== undefined && dueDay > closingDay
  const nextMonth = new Date(
    Date.UTC(year, sameMonth ? month - 1 : month, 1)
  )

  // Último dia do mês seguinte.
  const lastDay = new Date(
    Date.UTC(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate()

  // Ajusta vencimentos 29, 30 ou 31 quando necessário.
  const validDueDay = Math.min(dueDay, lastDay)

  return [
    nextMonth.getUTCFullYear(),
    String(nextMonth.getUTCMonth() + 1).padStart(2, '0'),
    String(validDueDay).padStart(2, '0'),
  ].join('-')
}

/**
 * Calcula a diferença de dias entre duas datas YYYY-MM-DD.
 *
 * Resultado:
 *  3 = vence em três dias
 *  0 = vence hoje
 * -2 = venceu há dois dias
 */
export function getDaysUntilDue(
  dueDate: string,
  today: string
): number {
  const parseDate = (value: string): number => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('Data inválida.')
    }

    const [year, month, day] = value.split('-').map(Number)

    if (year < 1 || year > 9999) {
      throw new Error('Ano inválido.')
    }

    const date = new Date(0)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCFullYear(year, month - 1, day)

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      throw new Error('Data inexistente.')
    }

    return date.getTime()
  }

  const difference = parseDate(dueDate) - parseDate(today)

  return Math.round(difference / 86_400_000)
}

/**
 * Fatura "da vez" de um cartão: a primeira que ainda não venceu.
 * Ex.: fecha dia 10 e vence dia 20 — até 20/12 mostra a fatura de
 * dezembro; a partir de 21/12, a de janeiro.
 */
export function getCurrentInvoiceMonth(
  card: Pick<CreditCard, 'dueDay' | 'closingDay'>,
  today: string
): string {
  const [year, month] = today.split('-').map(Number)

  for (let offset = -1; offset <= 3; offset++) {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1))
    const invoiceMonth = date.toISOString().slice(0, 7)
    if (getCardInvoiceDueDate(invoiceMonth, card.dueDay, card.closingDay) >= today) return invoiceMonth
  }

  return today.slice(0, 7)
}
