/**
 * Marca o <html> com data-pf-busy enquanto a tela está rolando ou
 * trocando de página. O CSS usa isso para pausar o fundo animado (neve,
 * luzes, ondas): assim o celular não precisa recalcular o desfoque do
 * vidro a cada quadro justamente quando mais precisa de fluidez.
 */

let timer = 0
let busy = false

export function markBusy(durationMs = 220): void {
  const root = document.documentElement

  if (!busy) {
    busy = true
    root.setAttribute('data-pf-busy', '')
  }

  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    busy = false
    root.removeAttribute('data-pf-busy')
  }, durationMs)
}

export function installBusyMarker(): void {
  const onScroll = () => markBusy()

  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('touchmove', onScroll, { passive: true })
}
