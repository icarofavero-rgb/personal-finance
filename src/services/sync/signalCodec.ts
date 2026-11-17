/**
 * Codifica os dados de conexão (WebRTC) em um texto curto para o QR code.
 *
 * O texto é comprimido (deflate) e convertido para base64url, com o
 * prefixo "PF1:" para o leitor reconhecer códigos deste app.
 */

export const SIGNAL_PREFIX = 'PF1:'

export type SignalPayload = {
  /** 'o' = convite (offer), 'a' = resposta (answer) */
  kind: 'o' | 'a'
  sdp: string
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)

  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array<ArrayBuffer>> {
  const response = new Response(
    new Blob([bytes]).stream().pipeThrough(stream)
  )

  return new Uint8Array(await response.arrayBuffer())
}

/** Remove linhas do SDP que não são necessárias para conectar na rede local. */
function compactSdp(sdp: string): string {
  return sdp
    .split(/\r?\n/)
    .filter(line => line !== '')
    // Candidatos TCP não são usados por canais de dados na rede local.
    .filter(line => !(line.startsWith('a=candidate:') && / tcp /i.test(line)))
    .join('\r\n') + '\r\n'
}

export async function encodeSignal(payload: SignalPayload): Promise<string> {
  const json = JSON.stringify({ k: payload.kind, s: compactSdp(payload.sdp) })
  const compressed = await transform(
    new TextEncoder().encode(json),
    new CompressionStream('deflate-raw')
  )

  return SIGNAL_PREFIX + toBase64Url(compressed)
}

export async function decodeSignal(text: string): Promise<SignalPayload> {
  const invalid = new Error(
    'Este QR code não é um código de sincronização do Personal Finance.'
  )

  const trimmed = text.trim()
  if (!trimmed.startsWith(SIGNAL_PREFIX)) throw invalid

  let parsed: unknown

  try {
    const bytes = await transform(
      fromBase64Url(trimmed.slice(SIGNAL_PREFIX.length)),
      new DecompressionStream('deflate-raw')
    )
    parsed = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw invalid
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('k' in parsed) ||
    !('s' in parsed) ||
    (parsed.k !== 'o' && parsed.k !== 'a') ||
    typeof parsed.s !== 'string' ||
    !parsed.s.startsWith('v=0')
  ) {
    throw invalid
  }

  return { kind: parsed.k, sdp: parsed.s }
}
