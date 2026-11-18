import { useState } from 'react'
import {
  ArrowLeftRight,
  Bug,
  CalendarDays,
  ChevronDown,
  Copy,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Heart,
  LifeBuoy,
  MessageCircle,
  Palette,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { getPlatform } from '../hooks/useDeviceClass'
import { requestOpenTutorial } from '../services/onboardingStorage'
import '../styles/savings.css'
import '../styles/help-center.css'

/** Repositório público do projeto (onde as mensagens podem ser abertas). */
const ISSUES_URL = 'https://github.com/icarofavero-rgb/personal-finance/issues/new'
const DEVELOPER = 'Ícaro'

type Topic = {
  icon: typeof LifeBuoy
  title: string
  items: { question: string; answer: string }[]
}

const TOPICS: Topic[] = [
  {
    icon: Sparkles,
    title: 'Primeiros passos',
    items: [
      {
        question: 'Por onde eu começo?',
        answer:
          'Cadastre suas entradas (salário, freelas) e saídas no botão “+ Nova transação”. Depois, se usa cartão de crédito, cadastre seus cartões em Cartões. O Dashboard passa a mostrar o resumo do mês automaticamente.',
      },
      {
        question: 'Como vejo o tutorial de novo?',
        answer: 'Use o botão “Ver tutorial novamente” logo abaixo, ou em Configurações → Dados e armazenamento.',
      },
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Transações',
    items: [
      {
        question: 'Como edito ou excluo uma transação?',
        answer:
          'Na lista de transações, toque no lápis para editar ou na lixeira para excluir. Despesas ligadas a uma fatura paga ficam protegidas para não bagunçar o histórico do cartão.',
      },
      {
        question: 'O que é o gráfico de categorias?',
        answer:
          'Em Transações, o gráfico mostra quanto cada categoria representa. Com “Todas” selecionado, ele fica completo; escolhendo uma categoria no filtro, mostra a porcentagem dela no centro.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Cartões e faturas',
    items: [
      {
        question: 'Como registro uma compra parcelada?',
        answer:
          'Em “Nova transação”, escolha Saída e a forma de pagamento “Cartão de crédito”. Informe o cartão e o número de parcelas: o app distribui as parcelas nas faturas certas.',
      },
      {
        question: 'Como pago uma fatura?',
        answer:
          'No Dashboard, toque no cartão e em “Ver faturas”. Escolha o mês e use “Quitar fatura” ou “Pagar parcialmente”. O limite do cartão é liberado conforme você paga.',
      },
    ],
  },
  {
    icon: PiggyBank,
    title: 'Guardado e Metas',
    items: [
      {
        question: 'Qual a diferença entre Guardado e Metas?',
        answer:
          'Guardado é a sua reserva geral: guarde a sobra do mês ou qualquer valor. Metas são objetivos específicos (uma viagem, um carro), com valor alvo e acompanhamento do progresso.',
      },
      {
        question: 'O que é “guardar a sobra do mês”?',
        answer:
          'É o que restou de entradas menos saídas no mês. O app calcula quanto está disponível e você escolhe quanto guardar.',
      },
    ],
  },
  {
    icon: CalendarDays,
    title: 'Calendário e avisos',
    items: [
      {
        question: 'Como crio um lembrete de boleto?',
        answer:
          'Em Calendário, toque em “Novo lembrete”, informe o título, o valor (opcional) e a data. Marque “Repetir todo mês” para contas fixas.',
      },
      {
        question: 'Quando recebo os avisos?',
        answer:
          'Os avisos aparecem no sininho com a antecedência escolhida em Configurações → Notificações. No app Android, também chegam como notificação do celular às 9h, mesmo com o app fechado.',
      },
    ],
  },
  {
    icon: RefreshCw,
    title: 'Sincronização e backup',
    items: [
      {
        question: 'Como deixo o celular e o computador com os mesmos dados?',
        answer:
          'Abra Sincronização nos dois aparelhos, conectados à MESMA rede Wi-Fi. Em um, toque em “Mostrar QR code”; no outro, em “Ler QR code”. Sem câmera ou sem Wi-Fi em comum, use a sincronização por arquivo.',
      },
      {
        question: 'Por que fazer backup?',
        answer:
          'Seus dados ficam só no aparelho. Se o app for desinstalado ou o navegador for limpo, eles se perdem. Exporte um backup de tempos em tempos e guarde o arquivo em um lugar seguro.',
      },
    ],
  },
  {
    icon: Palette,
    title: 'Aparência',
    items: [
      {
        question: 'Como mudo as cores e o estilo?',
        answer:
          'Em Configurações → Aparência: escolha o estilo (Clássico, Liquid Glass, Neon ou Natal), o tema claro/escuro, a cor de destaque, a intensidade do neon e as animações.',
      },
      {
        question: 'O app está pesado no meu celular. O que faço?',
        answer: 'Em Configurações → Aparência, deixe as animações em “Reduzido” ou use o estilo Clássico.',
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Privacidade e dados',
    items: [
      {
        question: 'Meus dados vão para a internet?',
        answer:
          'Não. O Personal Finance não usa servidor: tudo fica guardado só no aparelho em que você usa o app. A sincronização acontece diretamente entre os seus aparelhos, pela rede Wi-Fi.',
      },
      {
        question: 'Onde exatamente ficam os dados?',
        answer:
          'No app Android, dentro do próprio app (desinstalar ou “limpar dados” apaga tudo). No navegador, dentro daquele navegador (limpar os dados de navegação apaga tudo; cada navegador tem dados separados).',
      },
    ],
  },
]

type FeedbackKind = 'opiniao' | 'bug' | 'elogio'

const FEEDBACK: Record<FeedbackKind, { label: string; icon: typeof Bug; title: string; placeholder: string }> = {
  opiniao: {
    label: 'Opinião ou sugestão',
    icon: MessageCircle,
    title: '[Opinião]',
    placeholder: 'Conte o que você achou ou o que gostaria de ver no app…',
  },
  bug: {
    label: 'Reportar um bug',
    icon: Bug,
    title: '[Bug]',
    placeholder: 'O que aconteceu? Em qual tela? O que você esperava que acontecesse?',
  },
  elogio: {
    label: 'Fazer um elogio',
    icon: Heart,
    title: '[Elogio]',
    placeholder: 'Conte o que você mais gostou! 💜',
  },
}

function deviceSummary(): string {
  const platform = getPlatform() === 'app' ? 'App Android' : 'Navegador'
  const width = `${window.innerWidth}x${window.innerHeight}`
  const style = document.documentElement.getAttribute('data-pf-style') ?? 'classic'
  const theme = document.documentElement.getAttribute('data-pf-theme') ?? 'dark'
  return `${platform} · tela ${width} · estilo ${style} · tema ${theme}`
}

export default function HelpCenter() {
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [kind, setKind] = useState<FeedbackKind>('opiniao')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const fullMessage = () =>
    `${message.trim()}\n\n—\n${FEEDBACK[kind].label}\n${deviceSummary()}`

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(`${FEEDBACK[kind].title} ${fullMessage()}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  function openOnGitHub() {
    const firstLine = message.trim().split('\n')[0].slice(0, 70) || FEEDBACK[kind].label
    const url =
      `${ISSUES_URL}?title=${encodeURIComponent(`${FEEDBACK[kind].title} ${firstLine}`)}` +
      `&body=${encodeURIComponent(fullMessage())}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="pf-help">
      <div className="pf-section-heading">
        <span className="eyebrow">SUPORTE</span>
        <h1>
          Central de ajuda<span className="neon-dot">.</span>
        </h1>
        <p>Tire suas dúvidas sobre o Personal Finance ou fale com o desenvolvedor.</p>
      </div>

      <div className="pf-help-layout">
        <div className="pf-help-topics">
          {TOPICS.map((topic, topicIndex) => {
            const Icon = topic.icon

            return (
              <div
                key={topic.title}
                className="panel pf-help-topic"
                style={{ '--i': topicIndex } as React.CSSProperties}
              >
                <h3>
                  <span className="pf-help-topic-icon">
                    <Icon size={18} />
                  </span>
                  {topic.title}
                </h3>

                {topic.items.map(item => {
                  const key = `${topic.title}:${item.question}`
                  const open = openItem === key

                  return (
                    <div key={key} className={`pf-help-item ${open ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="pf-help-question"
                        aria-expanded={open}
                        onClick={() => setOpenItem(open ? null : key)}
                      >
                        <span>{item.question}</span>
                        <ChevronDown size={17} />
                      </button>
                      <div className="pf-help-answer" role="region">
                        <div>
                          <p>{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <aside className="pf-help-side">
          <div className="panel pf-help-contact">
            <div className="pf-help-contact-heading">
              <span className="pf-help-avatar">{DEVELOPER.charAt(0)}</span>
              <div>
                <h3>Fale com o {DEVELOPER}</h3>
                <p>Quer deixar uma opinião, reportar um bug ou fazer um elogio? Sua mensagem é muito bem-vinda!</p>
              </div>
            </div>

            <div className="pf-help-kinds" role="radiogroup" aria-label="Tipo de mensagem">
              {(Object.keys(FEEDBACK) as FeedbackKind[]).map(item => {
                const Icon = FEEDBACK[item].icon
                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={kind === item}
                    className={`pf-help-kind ${kind === item ? 'is-selected' : ''} kind-${item}`}
                    onClick={() => setKind(item)}
                  >
                    <Icon size={18} />
                    <span>{FEEDBACK[item].label}</span>
                  </button>
                )
              })}
            </div>

            <label className="pf-help-label" htmlFor="help-message">
              Sua mensagem
            </label>
            <textarea
              id="help-message"
              rows={5}
              maxLength={2000}
              placeholder={FEEDBACK[kind].placeholder}
              value={message}
              onChange={event => setMessage(event.target.value)}
            />

            <div className="pf-help-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!message.trim()}
                onClick={openOnGitHub}
              >
                <ExternalLink size={16} />
                Enviar pelo GitHub
              </button>
              <button type="button" className="pf-ghost-button" disabled={!message.trim()} onClick={copyMessage}>
                <Copy size={16} />
                {copied ? 'Copiado!' : 'Copiar mensagem'}
              </button>
            </div>

            <p className="pf-help-note">
              “Enviar pelo GitHub” abre a página do projeto com a mensagem pronta (é preciso ter uma conta
              gratuita no GitHub). Se preferir, copie a mensagem e envie diretamente ao {DEVELOPER}. Junto vão só
              informações do aparelho (tipo e tamanho de tela) para ajudar a entender o problema — nenhum dado
              financeiro.
            </p>
          </div>

          <div className="panel pf-help-quick">
            <h3>
              <LifeBuoy size={18} /> Atalhos
            </h3>
            <button type="button" className="pf-ghost-button pf-full" onClick={requestOpenTutorial}>
              <GraduationCap size={16} />
              Ver tutorial novamente
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
