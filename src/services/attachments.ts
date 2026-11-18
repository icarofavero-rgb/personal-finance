/**
 * Fotos de comprovantes ligadas às transações.
 *
 * Ficam no IndexedDB (banco interno do navegador/app, com bem mais espaço
 * que o armazenamento comum). Cada perfil tem as suas. Vão no backup em
 * JSON; não vão pela sincronização (seriam pesadas demais para o QR/Wi-Fi).
 */

import { getViewProfileId } from './profileScope'

const DB_NAME = 'personal-finance-attachments'
const STORE = 'files'
export const ATTACHMENTS_CHANGED_EVENT = 'personal-finance-attachments-changed'
const MAX_SIDE = 1600
const QUALITY = 0.72

type StoredAttachment = { key: string; profileId: string; transactionId: string; dataUrl: string; createdAt: string }

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' })
      store.createIndex('profileId', 'profileId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const request = action(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

const keyFor = (transactionId: string, profileId = getViewProfileId()) => `${profileId}:${transactionId}`

function notify() {
  cache = null
  window.dispatchEvent(new Event(ATTACHMENTS_CHANGED_EVENT))
}

export async function getAttachment(transactionId: string): Promise<string | null> {
  const item = (await run('readonly', store => store.get(keyFor(transactionId)))) as StoredAttachment | undefined
  return item?.dataUrl ?? null
}

export async function saveAttachment(transactionId: string, dataUrl: string, profileId = getViewProfileId()): Promise<void> {
  const item: StoredAttachment = {
    key: keyFor(transactionId, profileId),
    profileId,
    transactionId,
    dataUrl,
    createdAt: new Date().toISOString(),
  }
  await run('readwrite', store => store.put(item))
  notify()
}

export async function deleteAttachment(transactionId: string): Promise<void> {
  await run('readwrite', store => store.delete(keyFor(transactionId)))
  notify()
}

async function listForProfile(profileId: string): Promise<StoredAttachment[]> {
  return (await run('readonly', store => store.index('profileId').getAll(profileId))) as StoredAttachment[]
}

// ---------- quais transações têm foto (para o ícone na lista) ----------

let cache: Promise<Set<string>> | null = null

export function getAttachmentIds(): Promise<Set<string>> {
  cache ??= listForProfile(getViewProfileId())
    .then(items => new Set(items.map(item => item.transactionId)))
    .catch(() => new Set<string>())
  return cache
}

/** Apaga fotos de transações que não existem mais. */
export async function pruneAttachments(existingIds: Set<string>): Promise<void> {
  const items = await listForProfile(getViewProfileId())
  const orphans = items.filter(item => !existingIds.has(item.transactionId))
  if (orphans.length === 0) return
  await Promise.all(orphans.map(item => run('readwrite', store => store.delete(item.key))))
  notify()
}

// ---------- backup ----------

export async function exportAttachments(profileIds: string[]): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {}
  for (const profileId of profileIds) {
    const items = await listForProfile(profileId)
    if (items.length > 0) result[profileId] = Object.fromEntries(items.map(item => [item.transactionId, item.dataUrl]))
  }
  return result
}

export function isValidAttachmentData(value: unknown): value is string {
  return typeof value === 'string' && value.length < 4_000_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
}

export async function importAttachments(data: unknown): Promise<number> {
  if (typeof data !== 'object' || data === null) return 0
  let count = 0

  for (const [profileId, files] of Object.entries(data as Record<string, unknown>)) {
    if (typeof files !== 'object' || files === null) continue
    for (const [transactionId, dataUrl] of Object.entries(files as Record<string, unknown>)) {
      if (!isValidAttachmentData(dataUrl)) continue
      await saveAttachment(transactionId, dataUrl, profileId)
      count++
    }
  }

  return count
}

// ---------- foto → JPEG menor ----------

/** Reduz a foto (lado maior até 1600 px, JPEG) mantendo o texto legível. */
export async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Não foi possível abrir essa imagem.'))
      img.src = url
    })

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem.')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } finally {
    URL.revokeObjectURL(url)
  }
}
