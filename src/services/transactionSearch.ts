/**
 * Busca nas transações: procura no nome, na categoria e no valor,
 * sem diferenciar maiúsculas/minúsculas nem acentos
 * ("farmacia" encontra "Farmácia"; "45,9" encontra R$ 45,90).
 */

type Searchable = { description: string; category: string; amount: number; type: 'income' | 'expense' }

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function amountTexts(amount: number): string {
  const fixed = amount.toFixed(2)
  const comma = fixed.replace('.', ',')
  const thousands = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${fixed} ${comma} ${thousands}`
}

/** Todas as palavras digitadas precisam aparecer (em qualquer ordem). */
export function matchesSearch(item: Searchable, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true

  const haystack = normalizeSearch(
    `${item.description} ${item.category} ${amountTexts(item.amount)} ${item.type === 'income' ? 'entrada receita' : 'saida despesa gasto'}`
  )

  return words.every(word => haystack.includes(word))
}

/** Totais de uma lista (para o resumo dos resultados). */
export function summarize(items: Searchable[]): { count: number; income: number; expense: number } {
  return items.reduce(
    (total, item) => {
      total.count += 1
      if (item.type === 'income') total.income += item.amount
      else total.expense += item.amount
      return total
    },
    { count: 0, income: 0, expense: 0 }
  )
}
