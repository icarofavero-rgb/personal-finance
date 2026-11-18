import { useEffect, useState } from 'react'

/**
 * Mantém um menu na tela durante a animação de saída.
 *
 *   const { rendered, closing } = usePresence(open)
 *   {rendered && <div className={closing ? 'is-closing' : ''}>…</div>}
 *
 * - abre: aparece na hora (animação de entrada pelo CSS);
 * - fecha: continua desenhado por `duration` ms com "is-closing",
 *   para a animação de saída tocar, e só então some.
 */
export function usePresence(open: boolean, duration = 160) {
  const [rendered, setRendered] = useState(open)
  const [closing, setClosing] = useState(false)

  if (open && (!rendered || closing)) {
    setRendered(true)
    setClosing(false)
  }

  if (!open && rendered && !closing) {
    setClosing(true)
  }

  useEffect(() => {
    if (!closing) return

    const timer = window.setTimeout(() => {
      setRendered(false)
      setClosing(false)
    }, duration)

    return () => window.clearTimeout(timer)
  }, [closing, duration])

  return { rendered, closing }
}
