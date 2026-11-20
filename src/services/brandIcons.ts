/**
 * Ícones de serviços conhecidos a partir da descrição (Uber, Spotify,
 * Netflix…). Usa os símbolos da biblioteca aberta Simple Icons; para as
 * marcas que não estão nela, um selo com as iniciais na cor da marca.
 */

import {
  siAirbnb,
  siAliexpress,
  siApple,
  siApplemusic,
  siAppletv,
  siAudible,
  siBookingdotcom,
  siBurgerking,
  siClaude,
  siCrunchyroll,
  siDazn,
  siDeezer,
  siDiscord,
  siDropbox,
  siDuolingo,
  siGithub,
  siGoogle,
  siGoogledrive,
  siGooglegemini,
  siGoogleplay,
  siHbo,
  siIcloud,
  siIfood,
  siInstagram,
  siMcdonalds,
  siMercadopago,
  siNetflix,
  siNotion,
  siNubank,
  siParamountplus,
  siPatreon,
  siPaypal,
  siPicpay,
  siPix,
  siPlaystation,
  siPlex,
  siShopee,
  siSpotify,
  siStarbucks,
  siSteam,
  siTelegram,
  siTidal,
  siTinder,
  siTwitch,
  siUber,
  siUbereats,
  siVivo,
  siWaze,
  siWhatsapp,
  siYoutube,
  siYoutubemusic,
  siZoom,
} from 'simple-icons'

export type Brand = {
  name: string
  /** cor da marca (#RRGGBB) */
  color: string
  /** desenho do símbolo (viewBox 0 0 24 24) */
  path?: string
  /** quando não há símbolo: iniciais */
  letters?: string
  /** cor do texto/símbolo sobre a cor da marca */
  ink?: string
  /** categoria sugerida no "Nova transação" (ex.: "Lazer / Assinaturas") */
  category?: string
}

type SimpleIcon = { title: string; hex: string; path: string }

const icon = (si: SimpleIcon, name = si.title): Brand => ({ name, color: `#${si.hex}`, path: si.path })
const badge = (name: string, letters: string, color: string, ink = '#ffffff'): Brand => ({ name, letters, color, ink })

/** Palavras (sem acento, minúsculas) → marca. As mais específicas primeiro. */
const RULES: [string[], Brand][] = [
  [['uber eats', 'ubereats'], icon(siUbereats)],
  [['uber'], icon(siUber)],
  [['99 pop', '99pop', '99 taxi', '99app', '99'], badge('99', '99', '#FFDD00', '#111111')],
  [['ifood'], icon(siIfood)],
  [['rappi'], badge('Rappi', 'R', '#FF441F')],
  [['youtube music'], icon(siYoutubemusic)],
  [['youtube', 'yt premium'], icon(siYoutube)],
  [['spotify'], icon(siSpotify)],
  [['deezer'], icon(siDeezer)],
  [['tidal'], icon(siTidal)],
  [['apple music'], icon(siApplemusic)],
  [['apple tv'], icon(siAppletv)],
  [['icloud'], icon(siIcloud)],
  [['apple'], icon(siApple)],
  [['netflix'], icon(siNetflix)],
  [['prime video', 'amazon prime', 'primevideo'], badge('Prime Video', 'pv', '#00A8E1')],
  [['amazon'], badge('Amazon', 'a', '#FF9900', '#111111')],
  [['kindle'], badge('Kindle', 'K', '#FF9900', '#111111')],
  [['audible'], icon(siAudible)],
  [['disney'], badge('Disney+', 'D+', '#113CCF')],
  [['hbo', 'max streaming'], icon(siHbo, 'HBO Max')],
  [['paramount'], icon(siParamountplus)],
  [['globoplay'], badge('Globoplay', 'g', '#FB0234')],
  [['crunchyroll'], icon(siCrunchyroll)],
  [['dazn'], icon(siDazn)],
  [['plex'], icon(siPlex)],
  [['twitch'], icon(siTwitch)],
  [['steam'], icon(siSteam)],
  [['playstation', 'psn', 'ps plus'], icon(siPlaystation)],
  [['xbox', 'game pass', 'gamepass'], badge('Xbox', 'X', '#107C10')],
  [['nintendo'], badge('Nintendo', 'N', '#E60012')],
  [['google play'], icon(siGoogleplay)],
  [['google drive'], icon(siGoogledrive)],
  [['gemini'], icon(siGooglegemini)],
  [['google one', 'google'], icon(siGoogle)],
  [['chatgpt', 'chat gpt', 'openai'], badge('ChatGPT', 'GPT', '#10A37F')],
  [['claude', 'anthropic'], icon(siClaude)],
  [['microsoft', 'office 365', 'microsoft 365', 'onedrive'], badge('Microsoft 365', 'M', '#D83B01')],
  [['canva'], badge('Canva', 'C', '#00C4CC')],
  [['adobe', 'photoshop', 'lightroom'], badge('Adobe', 'A', '#FA0F00')],
  [['dropbox'], icon(siDropbox)],
  [['notion'], icon(siNotion)],
  [['duolingo'], icon(siDuolingo)],
  [['github'], icon(siGithub)],
  [['linkedin'], badge('LinkedIn', 'in', '#0A66C2')],
  [['zoom'], icon(siZoom)],
  [['discord'], icon(siDiscord)],
  [['telegram'], icon(siTelegram)],
  [['whatsapp'], icon(siWhatsapp)],
  [['instagram'], icon(siInstagram)],
  [['tinder'], icon(siTinder)],
  [['patreon'], icon(siPatreon)],
  [['waze'], icon(siWaze)],
  [['airbnb'], icon(siAirbnb)],
  [['booking'], icon(siBookingdotcom)],
  [['mercado pago', 'mercadopago'], icon(siMercadopago)],
  [['mercado livre', 'mercadolivre'], badge('Mercado Livre', 'ML', '#FFE600', '#2D3277')],
  [['shopee'], icon(siShopee)],
  [['aliexpress'], icon(siAliexpress)],
  [['shein'], badge('Shein', 'S', '#111111')],
  [['nubank'], icon(siNubank)],
  [['picpay'], icon(siPicpay)],
  [['paypal'], icon(siPaypal)],
  [['pix'], icon(siPix)],
  [['itau'], badge('Itaú', 'I', '#EC7000')],
  [['bradesco'], badge('Bradesco', 'B', '#CC092F')],
  [['santander'], badge('Santander', 'S', '#EC0000')],
  [['banco inter', 'inter'], badge('Inter', 'in', '#FF7A00')],
  [['c6 bank', 'c6'], badge('C6 Bank', 'C6', '#242424')],
  [['vivo'], icon(siVivo)],
  [['claro'], badge('Claro', 'C', '#DA291C')],
  [['tim'], badge('TIM', 'TIM', '#004691')],
  [['smart fit', 'smartfit'], badge('Smart Fit', 'SF', '#FFB800', '#111111')],
  [['gympass', 'wellhub'], badge('Wellhub', 'W', '#E72958')],
  [['starbucks'], icon(siStarbucks)],
  [['mcdonald', 'mc donald', 'mequi'], icon(siMcdonalds)],
  [['burger king'], icon(siBurgerking)],
]

/** Categoria sugerida de cada serviço (pelo nome da marca). */
const CATEGORY_BY_BRAND: Record<string, string> = {
  '99': 'Transporte / Aplicativos de transporte',
  'Uber Eats': 'Alimentação / Delivery',
  Uber: 'Transporte / Aplicativos de transporte',
  iFood: 'Alimentação / Delivery',
  Rappi: 'Alimentação / Delivery',
  'YouTube Music': 'Lazer / Assinaturas',
  YouTube: 'Lazer / Assinaturas',
  Spotify: 'Lazer / Assinaturas',
  Deezer: 'Lazer / Assinaturas',
  TIDAL: 'Lazer / Assinaturas',
  'Apple Music': 'Lazer / Assinaturas',
  'Apple TV': 'Lazer / Assinaturas',
  iCloud: 'Lazer / Assinaturas',
  Apple: 'Compras / Eletrônicos',
  Netflix: 'Lazer / Assinaturas',
  'Prime Video': 'Lazer / Assinaturas',
  Amazon: 'Compras / Outras compras',
  Kindle: 'Educação / Livros',
  Audible: 'Lazer / Assinaturas',
  'Disney+': 'Lazer / Assinaturas',
  'HBO Max': 'Lazer / Assinaturas',
  'Paramount+': 'Lazer / Assinaturas',
  Globoplay: 'Lazer / Assinaturas',
  Crunchyroll: 'Lazer / Assinaturas',
  DAZN: 'Lazer / Assinaturas',
  Plex: 'Lazer / Assinaturas',
  Twitch: 'Lazer / Assinaturas',
  Steam: 'Lazer / Jogos',
  PlayStation: 'Lazer / Jogos',
  Xbox: 'Lazer / Jogos',
  Nintendo: 'Lazer / Jogos',
  'Google Play': 'Lazer / Jogos',
  'Google Drive': 'Lazer / Assinaturas',
  'Google Gemini': 'Lazer / Assinaturas',
  ChatGPT: 'Lazer / Assinaturas',
  Claude: 'Lazer / Assinaturas',
  'Microsoft 365': 'Lazer / Assinaturas',
  Canva: 'Lazer / Assinaturas',
  Adobe: 'Lazer / Assinaturas',
  Dropbox: 'Lazer / Assinaturas',
  Notion: 'Lazer / Assinaturas',
  Duolingo: 'Educação / Cursos',
  GitHub: 'Lazer / Assinaturas',
  LinkedIn: 'Lazer / Assinaturas',
  Zoom: 'Lazer / Assinaturas',
  Discord: 'Lazer / Assinaturas',
  Tinder: 'Lazer / Assinaturas',
  Patreon: 'Lazer / Assinaturas',
  Airbnb: 'Lazer / Viagens',
  'Booking.com': 'Lazer / Viagens',
  'Mercado Livre': 'Compras / Outras compras',
  Shopee: 'Compras / Outras compras',
  AliExpress: 'Compras / Outras compras',
  Shein: 'Compras / Roupas',
  Vivo: 'Moradia / Internet',
  vivo: 'Moradia / Internet',
  Claro: 'Moradia / Internet',
  TIM: 'Moradia / Internet',
  'Smart Fit': 'Lazer / Assinaturas',
  Wellhub: 'Lazer / Assinaturas',
  Starbucks: 'Alimentação / Cafeteria',
  "McDonald's": 'Alimentação / Lanches',
  'Burger King': 'Alimentação / Lanches'
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const COMPILED = RULES.map(([words, brand]) => ({
  brand,
  // palavra inteira: "tim" não pega "estimativa", "max" sozinho não é usado
  pattern: new RegExp(`(^|[^a-z0-9])(${words.map(escape).join('|')})(?=$|[^a-z0-9])`),
}))

/**
 * Nomes que aceitam erro de digitação ("spotfy", "netflx", "youtub"…).
 * Só nomes bem característicos: palavras comuns (claro, inter, steam/stream,
 * vivo…) ficam de fora para não acertar errado.
 */
const FUZZY_WORDS = new Set([
  'spotify', 'netflix', 'youtube', 'ifood', 'deezer', 'disney', 'paramount', 'globoplay',
  'crunchyroll', 'playstation', 'nintendo', 'duolingo', 'airbnb', 'shopee', 'aliexpress',
  'nubank', 'picpay', 'paypal', 'starbucks', 'mcdonald', 'whatsapp', 'instagram',
  'discord', 'dropbox', 'chatgpt', 'amazon', 'kindle', 'linkedin', 'smartfit',
  'wellhub', 'gympass', 'santander', 'bradesco', 'mercadolivre', 'mercadopago', 'ubereats',
  'primevideo', 'audible', 'patreon', 'crunchyroll', 'microsoft', 'photoshop', 'lightroom',
  'rappi', 'uber',
])

/** Distância entre palavras (troca, falta, sobra ou inversão de letras). */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

const FUZZY_RULES = RULES.flatMap(([words, brand]) =>
  words.map(word => word.replace(/\s+/g, '')).filter(word => FUZZY_WORDS.has(word)).map(word => ({ word, brand }))
)

/** Procura um nome parecido (com erro de digitação) nas palavras da descrição. */
function findFuzzy(text: string): Brand | null {
  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  // também junta duas palavras seguidas ("mercado livr" → "mercadolivr")
  const candidates = [...words, ...words.slice(1).map((word, index) => words[index] + word)]

  let best: { brand: Brand; distance: number } | null = null
  for (const candidate of candidates) {
    if (candidate.length < 4) continue
    for (const { word, brand } of FUZZY_RULES) {
      if (Math.abs(candidate.length - word.length) > 2) continue
      // nomes curtos aceitam 1 erro; a partir de 8 letras, 2
      const allowed = word.length >= 8 ? 2 : 1
      // nomes curtos: precisa começar com a mesma letra ("food" não vira iFood)
      if (word.length <= 6 && candidate[0] !== word[0]) continue
      const distance = editDistance(candidate, word)
      if (distance > 0 && distance <= allowed && (!best || distance < best.distance)) best = { brand, distance }
    }
  }
  return best?.brand ?? null
}

const cache = new Map<string, Brand | null>()

/** Marca reconhecida na descrição (ou null). */
export function findBrand(description: string): Brand | null {
  if (!description) return null
  const cached = cache.get(description)
  if (cached !== undefined) return cached

  const text = normalize(description)
  const exact = COMPILED.find(rule => rule.pattern.test(text))?.brand ?? null
  const brand = exact ?? findFuzzy(text)
  const found = brand ? { ...brand, category: CATEGORY_BY_BRAND[brand.name] } : null
  if (cache.size > 500) cache.clear()
  cache.set(description, found)
  return found
}
