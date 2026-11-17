import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  ChartNoAxesCombined,
  ChevronLeft,
  CreditCard,
  DatabaseBackup,
  Globe,
  LayoutDashboard,
  Palette,
  PiggyBank,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  UsersRound,
  Wallet,
} from 'lucide-react'

import { getPlatform } from '../hooks/useDeviceClass'
import '../styles/onboarding.css'

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>

type Step = {
  icon: IconType
  orbit: IconType[]
  color: string
  eyebrow: string
  title: string
  text: string
  tips: string[]
}

const STEPS: Step[] = [
  {
    icon: Wallet,
    orbit: [Sparkles, PiggyBank, ShieldCheck],
    color: '#8b5cf6',
    eyebrow: 'Bem-vindo',
    title: 'Olá! Este é o Personal Finance',
    text: 'Seu controle financeiro pessoal: simples, bonito e totalmente privado. Vamos conhecer o app em poucos passos.',
    tips: ['Leva menos de 1 minuto', 'Você pode pular quando quiser'],
  },
  {
    icon: LayoutDashboard,
    orbit: [ChartNoAxesCombined, Wallet, Target],
    color: '#22d3ee',
    eyebrow: 'Dashboard',
    title: 'Tudo do mês em uma tela',
    text: 'Veja entradas, saídas, o resultado do mês e o saldo projetado. Troque o mês no seletor de Período.',
    tips: ['Toque no ícone de relógio para ver o histórico', 'Cadastre previsões para planejar o mês'],
  },
  {
    icon: ArrowLeftRight,
    orbit: [Wallet, CreditCard, PiggyBank],
    color: '#22c55e',
    eyebrow: 'Transações',
    title: 'Registre entradas e saídas',
    text: 'Use o botão “+” (Nova transação) para lançar um gasto ou um recebimento, com categoria e data.',
    tips: ['Gastos no crédito já entram parcelados na fatura', 'Filtre por mês, categoria e tipo'],
  },
  {
    icon: CreditCard,
    orbit: [Wallet, ArrowLeftRight, ShieldCheck],
    color: '#f472b6',
    eyebrow: 'Cartões',
    title: 'Faturas sob controle',
    text: 'Cadastre seus cartões e acompanhe limite, faturas e parcelas. Pague faturas total ou parcialmente.',
    tips: ['O limite é liberado quando você paga a fatura', 'Você recebe avisos antes do vencimento'],
  },
  {
    icon: Target,
    orbit: [PiggyBank, Wallet, UsersRound],
    color: '#f59e0b',
    eyebrow: 'Planejamento',
    title: 'Orçamentos, metas e devedores',
    text: 'Defina limites de gasto por categoria, junte dinheiro para seus objetivos e controle quem te deve.',
    tips: ['Orçamentos: limite por categoria e mês', 'Metas: depósitos e retiradas', 'Devedores: dívidas e recebimentos'],
  },
  {
    icon: Palette,
    orbit: [Sparkles, Smartphone, Globe],
    color: '#a78bfa',
    eyebrow: 'Do seu jeito',
    title: 'Personalize a aparência',
    text: 'Escolha tema claro ou escuro, a cor de destaque e os estilos Liquid Glass ou Neon Liquid Glass.',
    tips: ['Configurações → Aparência', 'Ajuste ou desligue as animações'],
  },
  {
    icon: RefreshCw,
    orbit: [Smartphone, Globe, DatabaseBackup],
    color: '#38bdf8',
    eyebrow: 'Seus aparelhos',
    title: 'Sincronize e faça backup',
    text: 'Junte os dados do celular, tablet e computador pelo Wi-Fi com QR code, sem internet. E guarde backups.',
    tips: ['Configurações → Dados e armazenamento', 'Sincronize apenas aparelhos seus'],
  },
]

/** Índice da tela final "Atenção" (depois de todos os passos). */
const ATTENTION = STEPS.length

type Motion = 'next' | 'back' | 'skip-step' | 'skip-all' | 'jump'

type OnboardingProps = {
  onFinish: () => void
}

function StepIllustration({ step }: { step: Step }) {
  const Icon = step.icon

  return (
    <div className="pf-onb-art" style={{ '--onb-color': step.color } as React.CSSProperties}>
      <span className="pf-onb-ring pf-onb-ring-1" />
      <span className="pf-onb-ring pf-onb-ring-2" />
      <span className="pf-onb-glow" />

      {step.orbit.map((OrbitIcon, index) => (
        <span
          key={index}
          className="pf-onb-orbit"
          style={{ '--orbit-index': index } as React.CSSProperties}
        >
          <span className="pf-onb-orbit-chip">
            <OrbitIcon size={18} />
          </span>
        </span>
      ))}

      <span className="pf-onb-core">
        <Icon size={44} strokeWidth={1.6} />
      </span>
    </div>
  )
}

function AttentionCard() {
  const platform = getPlatform()

  return (
    <div className="pf-onb-attention">
      <div className="pf-onb-attention-badge">
        <AlertTriangle size={20} />
        Atenção
      </div>

      <h2>Onde ficam os seus dados</h2>
      <p className="pf-onb-attention-intro">
        O Personal Finance <strong>não usa internet nem servidor</strong>. Tudo fica guardado
        somente no aparelho em que você usa o app.
      </p>

      <div className="pf-onb-platforms">
        <section className={`pf-onb-platform ${platform === 'app' ? 'is-current' : ''}`}>
          <header>
            <Smartphone size={20} />
            <strong>No app (Android)</strong>
            {platform === 'app' && <span className="pf-onb-current">Você está aqui</span>}
          </header>
          <ul>
            <li>Os dados ficam dentro do app, só neste celular ou tablet.</li>
            <li><strong>Desinstalar o app</strong> ou usar “Limpar dados” <strong>apaga tudo</strong>.</li>
            <li>Instalar uma versão nova por cima <strong>mantém</strong> seus dados.</li>
          </ul>
        </section>

        <section className={`pf-onb-platform ${platform === 'web' ? 'is-current' : ''}`}>
          <header>
            <Globe size={20} />
            <strong>No navegador (computador)</strong>
            {platform === 'web' && <span className="pf-onb-current">Você está aqui</span>}
          </header>
          <ul>
            <li>Os dados ficam guardados no navegador deste computador.</li>
            <li><strong>Limpar o histórico / dados de navegação apaga tudo.</strong></li>
            <li>Cada navegador tem dados separados (Chrome ≠ Edge). Janela anônima não guarda nada.</li>
            <li>Abra sempre o mesmo arquivo, no mesmo navegador.</li>
          </ul>
        </section>
      </div>

      <div className="pf-onb-attention-footer">
        <ShieldCheck size={18} />
        <span>
          Faça <strong>backups</strong> com frequência e use a <strong>Sincronização</strong> para ter os
          mesmos dados em todos os seus aparelhos (Configurações → Dados e armazenamento).
        </span>
      </div>
    </div>
  )
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [index, setIndex] = useState(0)
  const [motion, setMotion] = useState<Motion>('jump')
  const [skippingAll, setSkippingAll] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const isAttention = index === ATTENTION
  const step = STEPS[Math.min(index, STEPS.length - 1)]
  const progress = Math.min(1, index / ATTENTION)

  const goTo = useCallback((target: number, kind: Motion) => {
    setMotion(kind)
    setIndex(Math.max(0, Math.min(ATTENTION, target)))
  }, [])

  const next = useCallback(() => goTo(index + 1, 'next'), [goTo, index])
  const back = useCallback(() => goTo(index - 1, 'back'), [goTo, index])
  const skipStep = useCallback(() => goTo(index + 1, 'skip-step'), [goTo, index])

  const skipAll = useCallback(() => {
    // Animação de "embaralhar" as cartas restantes antes de ir para o aviso.
    setSkippingAll(true)
    window.setTimeout(() => {
      setSkippingAll(false)
      goTo(ATTENTION, 'skip-all')
    }, 520)
  }, [goTo])

  const finish = useCallback(() => {
    setLeaving(true)
    window.setTimeout(onFinish, 420)
  }, [onFinish])

  useEffect(() => {
    // preventScroll: sem isso o navegador "rola" a tela e corta o topo no celular.
    dialogRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' && !isAttention) next()
      if (event.key === 'ArrowLeft' && index > 0) back()
      if (event.key === 'Escape' && !isAttention) skipAll()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, back, skipAll, index, isAttention])

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return

    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return

    if (dx < 0 && !isAttention) next()
    if (dx > 0 && index > 0) back()
  }

  return (
    <div
      className={`pf-onb-overlay ${leaving ? 'is-leaving' : ''}`}
      style={{ '--onb-color': isAttention ? '#f59e0b' : step.color } as React.CSSProperties}
    >
      <div className="pf-onb-aurora" aria-hidden="true" />

      <div className={`pf-onb-deck ${skippingAll ? 'is-shuffling' : ''} ${isAttention ? 'is-last' : ''}`}>
      {/* Cartas "atrás" da janela — dão profundidade e voam ao pular o tutorial */}
      <span className="pf-onb-ghost pf-onb-ghost-2" aria-hidden="true" />
      <span className="pf-onb-ghost pf-onb-ghost-1" aria-hidden="true" />

      <div
        ref={dialogRef}
        className="pf-onb-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial do Personal Finance"
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="pf-onb-top">
          <div
            className="pf-onb-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Progresso do tutorial"
          >
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>

          {!isAttention && (
            <button type="button" className="pf-onb-skip-all" onClick={skipAll}>
              Pular tutorial
            </button>
          )}
        </div>

        <div className="pf-onb-stage">
          <div key={index} className={`pf-onb-card motion-${motion}`}>
            {isAttention ? (
              <AttentionCard />
            ) : (
              <>
                <StepIllustration step={step} />
                <span className="pf-onb-eyebrow">{step.eyebrow}</span>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                <ul className="pf-onb-tips">
                  {step.tips.map((tip, tipIndex) => (
                    <li key={tip} style={{ '--tip-index': tipIndex } as React.CSSProperties}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="pf-onb-dots" aria-hidden={isAttention}>
          {STEPS.map((item, dotIndex) => (
            <button
              key={item.title}
              type="button"
              className={`pf-onb-dot ${dotIndex === index ? 'is-active' : ''} ${dotIndex < index ? 'is-done' : ''}`}
              onClick={() => goTo(dotIndex, dotIndex > index ? 'next' : 'back')}
              aria-label={`Ir para o passo ${dotIndex + 1}: ${item.eyebrow}`}
              tabIndex={isAttention ? -1 : 0}
            />
          ))}
          <span
            className={`pf-onb-dot pf-onb-dot-attention ${isAttention ? 'is-active' : ''}`}
            aria-hidden="true"
          />
        </div>

        <div className="pf-onb-actions">
          {isAttention ? (
            <button type="button" className="pf-onb-primary pf-onb-finish" onClick={finish}>
              Entendi, vamos começar
              <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="pf-onb-secondary"
                onClick={back}
                disabled={index === 0}
                aria-label="Passo anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <button type="button" className="pf-onb-link" onClick={skipStep}>
                Pular etapa
              </button>

              <button type="button" className="pf-onb-primary" onClick={next}>
                {index === STEPS.length - 1 ? 'Concluir' : index === 0 ? 'Começar' : 'Próximo'}
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>

        <span className="pf-onb-counter" aria-live="polite">
          {isAttention ? 'Último aviso' : `Passo ${index + 1} de ${STEPS.length}`}
        </span>
      </div>
      </div>
    </div>
  )
}
