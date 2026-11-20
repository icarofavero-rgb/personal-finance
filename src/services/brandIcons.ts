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

const cache = new Map<string, Brand | null>()

/** Marca reconhecida na descrição (ou null). */
export function findBrand(description: string): Brand | null {
  if (!description) return null
  const cached = cache.get(description)
  if (cached !== undefined) return cached

  const text = normalize(description)
  const found = COMPILED.find(rule => rule.pattern.test(text))?.brand ?? null
  if (cache.size > 500) cache.clear()
  cache.set(description, found)
  return found
}
