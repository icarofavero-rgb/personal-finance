/**
 * Avisos do próprio app no lugar das janelas do navegador
 * ("Essa página diz..."). Ficam na cor e no estilo do app.
 */

export type AppDialogRequest = {
  id: number
  kind: 'alert' | 'confirm'
  title?: string
  message: string
  confirmLabel?: string
  resolve: (value: boolean) => void
}

type Listener = (queue: AppDialogRequest[]) => void

let queue: AppDialogRequest[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(listener => listener(queue))
}

export function subscribeAppDialogs(listener: Listener): () => void {
  listeners.add(listener)
  listener(queue)
  return () => listeners.delete(listener)
}

export function resolveAppDialog(id: number, value: boolean) {
  const request = queue.find(item => item.id === id)
  queue = queue.filter(item => item.id !== id)
  emit()
  request?.resolve(value)
}

function open(kind: AppDialogRequest['kind'], message: string, options: { title?: string; confirmLabel?: string } = {}) {
  return new Promise<boolean>(resolve => {
    queue = [...queue, { id: nextId++, kind, message, resolve, ...options }]
    emit()
  })
}

/** Aviso com botão OK (resolve quando a pessoa fecha). */
export function appAlert(message: string, title?: string): Promise<void> {
  return open('alert', message, { title }).then(() => undefined)
}

/** Pergunta com Cancelar / Confirmar. */
export function appConfirm(message: string, options: { title?: string; confirmLabel?: string } = {}): Promise<boolean> {
  return open('confirm', message, options)
}

/** Troca o alert() do navegador pelo aviso do app. */
export function installAppAlert() {
  if (typeof window === 'undefined') return
  window.alert = (message?: unknown) => {
    void appAlert(String(message ?? ''))
  }
}
