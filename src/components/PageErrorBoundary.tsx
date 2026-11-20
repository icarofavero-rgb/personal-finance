import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

type Props = {
  /** muda quando a página muda: limpa o erro */
  resetKey: string
  children: ReactNode
}

type State = { error: Error | null }

/**
 * Se uma página der erro, mostra um aviso no lugar dela (em vez de a tela
 * inteira ficar preta). O resto do app continua funcionando.
 */
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na página:', error, info.componentStack)
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section className="panel pf-page-error" role="alert">
        <span className="pf-page-error-icon">
          <AlertTriangle size={26} />
        </span>
        <h2>Esta página teve um problema</h2>
        <p>Seus dados estão seguros. Tente abrir de novo; se continuar, avise pela Central de ajuda.</p>
        <small>{this.state.error.message}</small>
        <button type="button" className="primary-button" onClick={() => this.setState({ error: null })}>
          <RotateCcw size={16} /> Tentar de novo
        </button>
      </section>
    )
  }
}
