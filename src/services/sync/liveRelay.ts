/**
 * Serviço de encontro (ntfy.sh, gratuito e de código aberto).
 *
 * Só passa o "aperto de mão" para os aparelhos se acharem, sempre
 * cifrado com a chave do QR code: o serviço não consegue ler nada.
 * Os dados financeiros vão direto de um aparelho para o outro.
 */

const RELAY_URL = 'https://ntfy.sh'
const MAX_MESSAGE = 3900

export async function publish(topic: string, text: string): Promise<void> {
  if (text.length > MAX_MESSAGE) throw new Error('Mensagem de conexão grande demais.')

  const response = await fetch(`${RELAY_URL}/${topic}`, { method: 'POST', body: text })
  if (!response.ok) throw new Error(`Serviço de conexão indisponível (${response.status}).`)
}

/**
 * Escuta o canal. O navegador reconecta sozinho se a internet cair.
 * Retorna a função para parar de escutar.
 */
export function subscribe(topic: string, onMessage: (text: string) => void, onOpen?: () => void): () => void {
  const source = new EventSource(`${RELAY_URL}/${topic}/sse`)

  source.addEventListener('open', () => onOpen?.())
  source.addEventListener('message', event => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as { event?: string; message?: string }
      if (data.event === 'message' && typeof data.message === 'string') onMessage(data.message)
    } catch {
      // mensagem de outro tipo: ignora
    }
  })

  return () => source.close()
}
