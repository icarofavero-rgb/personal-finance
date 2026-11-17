import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Salva um arquivo de texto: no Android abre o compartilhamento nativo
 * (salvar, WhatsApp, Drive...); no navegador faz o download.
 */
export async function saveTextFile(
  filename: string,
  content: string,
  share: { title: string; text: string; dialogTitle: string }
): Promise<'web' | 'android'> {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })

    const file = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache,
    })

    await Share.share({ ...share, url: file.uri })

    return 'android'
  }

  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)

  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return 'web'
}

/** Data local no formato AAAA-MM-DD (para nomes de arquivo). */
export function localDateStamp(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
