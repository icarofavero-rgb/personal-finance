/**
 * Serviço de encontro (ntfy.sh, gratuito e de código aberto).
 *
 * Só passa o "aperto de mão" para os aparelhos se acharem, sempre
 * cifrado com a chave do QR code: o serviço não consegue ler nada.
 * Os dados financeiros vão direto de um aparelho para o outro.
 *
 * O plano gratuito tem limite de mensagens por dia (por internet). Por
 * isso o app economiza: tem uma cota própria, bem abaixo do limite, e
 * quando o serviço responde "muitas mensagens" (429) ele espera um pouco
 * antes de tentar de novo, em vez de insistir.
 */

const RELAY_URL = 'https://ntfy.sh'
const MAX_MESSAGE = 3900

const COOLDOWN_KEY = 'personal-finance-relay-cooldown-v1'
const LOG_KEY = 'personal-finance-relay-log-v1'
const DAY = 24 * 60 * 60 * 1000
/** Mensagens "oi, estou aqui" por dia (as de conexão em si sempre passam). */
const DAILY_HELLO_BUDGET = 120
const FIRST_COOLDOWN = 15 * 60 * 1000
const MAX_COOLDOWN = 3 * 60 * 60 * 1000

export class RelayBusyError extends Error {
  readonly until: number

  constructor(until: number) {
    const date = new Date(until)
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const sameDay = date.toDateString() === new Date().toDateString()
    const when = sameDay ? `às ${time}` : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`
    super(
      `O serviço de conexão atingiu o limite gratuito do dia nesta internet. O app tenta de novo sozinho ${when}. ` +
        'Enquanto isso, use a sincronização “Sem internet: com dois QR codes”.'
    )
    this.until = until
  }
}

type Cooldown = { until: number; length: number }

function readCooldown(): Cooldown {
  try {
    const data = JSON.parse(localStorage.getItem(COOLDOWN_KEY) ?? 'null') as Cooldown | null
    if (data && typeof data.until === 'number') return data
  } catch {
    // ilegível: sem espera
  }
  return { until: 0, length: 0 }
}

function readLog(): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as number[]
    const since = Date.now() - DAY
    return Array.isArray(list) ? list.filter(time => typeof time === 'number' && time > since) : []
  } catch {
    return []
  }
}

/** Até quando o app está esperando o serviço liberar (0 = liberado). */
export function relayBusyUntil(): number {
  const { until } = readCooldown()
  return until > Date.now() ? until : 0
}

export async function publish(topic: string, text: string, options: { essential?: boolean } = {}): Promise<void> {
  if (text.length > MAX_MESSAGE) throw new Error('Mensagem de conexão grande demais.')

  const busy = relayBusyUntil()
  if (busy) throw new RelayBusyError(busy)

  const log = readLog()
  if (!options.essential && log.length >= DAILY_HELLO_BUDGET) {
    // Cota do dia usada: espera a mensagem mais antiga "vencer"
    throw new RelayBusyError(log[0] + DAY)
  }

  const response = await fetch(`${RELAY_URL}/${topic}`, { method: 'POST', body: text })

  if (response.status === 429) {
    const previous = readCooldown()
    const length = Math.min(previous.length ? previous.length * 2 : FIRST_COOLDOWN, MAX_COOLDOWN)
    let until = Date.now() + length

    // O serviço informa quando a cota do dia volta: espera até lá
    try {
      const account = (await (await fetch(`${RELAY_URL}/v1/account`)).json()) as {
        stats?: { messages_remaining?: number; reset_at?: number }
      }
      const resetAt = (account.stats?.reset_at ?? 0) * 1000
      if (account.stats?.messages_remaining === 0 && resetAt > Date.now()) until = resetAt
    } catch {
      // sem a informação: usa a espera padrão
    }

    localStorage.setItem(COOLDOWN_KEY, JSON.stringify({ until, length }))
    throw new RelayBusyError(until)
  }

  if (!response.ok) throw new Error(`Serviço de conexão indisponível (${response.status}).`)

  // Deu certo: zera a espera e anota o envio
  if (readCooldown().length) localStorage.removeItem(COOLDOWN_KEY)
  localStorage.setItem(LOG_KEY, JSON.stringify([...log, Date.now()]))
}

/**
 * Escuta o canal. O navegador reconecta sozinho se a internet cair.
 * Retorna a função para parar de escutar.
 */
export function subscribe(topic: string, onMessage: (text: string) => void, onOpen?: () => void): () => void {
  let source: EventSource | null = null
  let stopped = false
  let retryTimer: number | undefined
  let retryDelay = 30_000

  const connect = () => {
    if (stopped) return
    source = new EventSource(`${RELAY_URL}/${topic}/sse`)

    source.addEventListener('open', () => {
      retryDelay = 30_000
      onOpen?.()
    })
    source.addEventListener('message', event => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as { event?: string; message?: string }
        if (data.event === 'message' && typeof data.message === 'string') onMessage(data.message)
      } catch {
        // mensagem de outro tipo: ignora
      }
    })
    // Quando o serviço recusa (ex.: 429), o navegador desiste de vez:
    // tenta de novo mais tarde, com intervalos crescentes.
    source.addEventListener('error', () => {
      if (stopped || !source || source.readyState !== EventSource.CLOSED) return
      source = null
      window.clearTimeout(retryTimer)
      retryTimer = window.setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 15 * 60_000)
    })
  }

  connect()

  return () => {
    stopped = true
    window.clearTimeout(retryTimer)
    source?.close()
  }
}
