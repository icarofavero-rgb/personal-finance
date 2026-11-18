/**
 * Botão "voltar" do Android e saída do app.
 *
 * Comportamento:
 *  1. Se houver uma janela, menu ou painel aberto, "voltar" fecha ele.
 *  2. Fora do Dashboard, "voltar" leva ao Dashboard.
 *  3. No Dashboard, o primeiro "voltar" avisa; o segundo (em até 2 s) sai.
 * O app também pode ser fechado pelo botão "Sair" (painel "Mais").
 */

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const DOUBLE_PRESS_MS = 2000

/** Elementos que, se estiverem na tela, são fechados pelo "voltar". */
const OVERLAY_SELECTOR = [
  '.pf-process-overlay',
  '.pf-onb-overlay',
  '.pf-confirm-overlay',
  '.app-dialog-overlay',
  '.invoice-confirm-overlay',
  '.modal-overlay',
  '.dashboard-invoice-overlay',
  '.pf-sheet-overlay',
  '#notification-panel',
  '.pf-select-options',
  '.pf-calendar-popup',
  '.pf-date-popup',
  '.accent-select-menu',
  '.dashboard-dropdown-menu',
].join(', ')

export async function exitApp(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await App.exitApp()
  }
}

/** Fecha a janela/menu aberto simulando a tecla Esc (que todos já tratam). */
export function closeTopOverlay(): boolean {
  if (!document.querySelector(OVERLAY_SELECTOR)) return false

  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  document.dispatchEvent(escape)
  return true
}

type BackButtonOptions = {
  isHome: () => boolean
  goHome: () => void
  notify: (message: string) => void
}

/** Liga o tratamento do botão "voltar". Não faz nada no navegador. */
export function installBackButton(options: BackButtonOptions): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}

  let lastPress = 0
  let removed = false

  const listener = App.addListener('backButton', () => {
    if (closeTopOverlay()) return

    if (!options.isHome()) {
      options.goHome()
      return
    }

    const now = Date.now()

    if (now - lastPress < DOUBLE_PRESS_MS) {
      void exitApp()
      return
    }

    lastPress = now
    options.notify('Pressione voltar novamente para sair')
  })

  return () => {
    if (removed) return
    removed = true
    void listener.then(handle => handle.remove())
  }
}
