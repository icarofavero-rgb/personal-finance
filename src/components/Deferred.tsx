import { startTransition, useEffect, useState, type ReactNode } from 'react'

type DeferredProps = {
  children: ReactNode
  /** Espera antes de desenhar (ms), para a animação da página terminar */
  delay?: number
  /** Altura reservada enquanto espera (evita a página "pular") */
  minHeight?: number
}

/**
 * Desenha partes pesadas (gráficos) logo DEPOIS que a página aparece.
 * O resto da tela surge na hora; os gráficos entram em seguida, sem
 * travar a troca de abas. Usa startTransition para o React montar em
 * pedaços, deixando o celular responder ao toque no meio do caminho.
 */
export default function Deferred({ children, delay = 280, minHeight = 320 }: DeferredProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let timer = 0

    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        startTransition(() => setReady(true))
      }, delay)
    })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [delay])

  if (!ready) {
    return <div className="pf-deferred" style={{ minHeight }} aria-busy="true" />
  }

  return <div className="pf-deferred-in">{children}</div>
}
