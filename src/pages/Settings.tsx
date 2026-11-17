
import { useState } from 'react'
import {
  UserRound,
  Palette,
  Bell,
  ShieldCheck,
  Database,
  HardDrive,
  Cat,
  Dog,
  Bot,
  Ghost,
  Gamepad2,
  Rocket,
  Star,
  Layers,
  CheckCircle2,
  DatabaseBackup,
  RefreshCw,
} from 'lucide-react'

import AvatarColorPicker from '../components/AvatarColorPicker'
import '../styles/settings.css'
import { getStorageDiagnostics } from '../services/storageDiagnostics'
import {
  getSecurityDiagnostics,
} from '../services/securityDiagnostics'

import {
  getAppearancePreferences,
  saveAppearancePreferences,
  applyAccentColor,
  applyNeonIntensity,
  applyAppTheme,
  applyVisualStyle,
  applyAnimationPreference,
  type AppearancePreferences,
} from '../services/appearanceStorage'

import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../services/notificationPreferencesStorage'

import {
  getUserPreferences,
  saveUserPreferences,
} from '../services/userPreferencesStorage'

import Toast, {
  type ToastMessage,
} from '../components/Toast'

type SettingsSection =
  | 'profile'
  | 'appearance'
  | 'notifications'
  | 'security'
  | 'storage'

const sections = [
  {
    id: 'profile',
    label: 'Perfil e preferências',
    icon: UserRound,
    description: 'Gerencie suas informações pessoais.',
  },
  {
    id: 'appearance',
    label: 'Aparência',
    icon: Palette,
    description: 'Personalize o visual do aplicativo.',
  },
  {
    id: 'notifications',
    label: 'Notificações',
    icon: Bell,
    description: 'Configure os avisos do sistema.',
  },
  {
    id: 'security',
    label: 'Privacidade e segurança',
    icon: ShieldCheck,
    description: 'Gerencie suas preferências de segurança.',
  },
  {
    id: 'storage',
    label: 'Dados e armazenamento',
    icon: Database,
    description: 'Consulte as opções de armazenamento.',
  },
] as const

type SettingsProps = {
  initialSection?: SettingsSection
  onNotificationPreferencesChanged?: () => void
  onOpenBackup?: () => void
  onOpenSync?: () => void
}

const profileAvatars = [
  { id: 'initial', label: 'Inicial', icon: null },
  { id: 'user', label: 'Pessoa', icon: UserRound },
  { id: 'cat', label: 'Gato', icon: Cat },
  { id: 'dog', label: 'Cachorro', icon: Dog },
  { id: 'robot', label: 'Robô', icon: Bot },
  { id: 'ghost', label: 'Fantasma', icon: Ghost },
  { id: 'gamer', label: 'Gamer', icon: Gamepad2 },
  { id: 'rocket', label: 'Foguete', icon: Rocket },
  { id: 'star', label: 'Estrela', icon: Star },
] as const

type ProfileAvatarId =
  (typeof profileAvatars)[number]['id']

export default function Settings({
  initialSection = 'profile',
  onNotificationPreferencesChanged,
  onOpenBackup,
  onOpenSync,
}: SettingsProps) {

  const [activeSection, setActiveSection] =
    useState<SettingsSection>(initialSection)


const [selectedAvatar, setSelectedAvatar] =
  useState<ProfileAvatarId>(() => {
    const saved = getUserPreferences().avatar

    return profileAvatars.some(
      avatar => avatar.id === saved
    )
      ? (saved as ProfileAvatarId)
      : 'initial'
  })

const [userName, setUserName] = useState(
  () => getUserPreferences().name
)

const [avatarColor1, setAvatarColor1] = useState(
  () => getUserPreferences().avatarColor1
)

const [avatarColor2, setAvatarColor2] = useState(
  () => getUserPreferences().avatarColor2
)

const [activeAvatarColor, setActiveAvatarColor] =
  useState<1 | 2 | null>(null)

const avatarGradient = `linear-gradient(
  135deg,
  ${avatarColor1},
  ${avatarColor2}
)`
const [securityDiagnostics, setSecurityDiagnostics] =
  useState(() => getSecurityDiagnostics())

const [toast, setToast] = useState<ToastMessage | null>(null)

  const selectedSection =
    sections.find(section => section.id === activeSection)!

const [storageDiagnostics, setStorageDiagnostics] =
  useState(() => getStorageDiagnostics())

  const Icon = selectedSection.icon

const [appearance, setAppearance] =
  useState<AppearancePreferences>(
    () => getAppearancePreferences()
  )

const [notificationPreferences, setNotificationPreferences] =
  useState<NotificationPreferences>(
    () => getNotificationPreferences()
  )


function handleSaveNotifications() {
  try {
    saveNotificationPreferences(notificationPreferences)

    onNotificationPreferencesChanged?.()

    setToast({
      id: crypto.randomUUID(),
      type: 'success',
      message: 'Preferências de notificações salvas!',
    })
  } catch {
    setToast({
      id: crypto.randomUUID(),
      type: 'error',
      message: 'Não foi possível salvar as notificações.',
    })
  }
}


function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()

  const normalizedName = userName.trim()

  if (!normalizedName) {
    setToast({
      id: crypto.randomUUID(),
      type: 'error',
      message: 'Digite um nome válido.',
    })
    return
  }

  try {
saveUserPreferences({
  name: normalizedName,
  avatar: selectedAvatar,
  avatarColor1,
  avatarColor2,
})
window.dispatchEvent(
  new Event('personal-finance-profile-updated')
)
    setUserName(normalizedName)

    setToast({
      id: crypto.randomUUID(),
      type: 'success',
      message: 'Perfil atualizado com sucesso!',
    })
  } catch {
    setToast({
      id: crypto.randomUUID(),
      type: 'error',
      message: 'Não foi possível salvar o perfil.',
    })
  }
}

function handleSaveAppearance() {
  try {
    saveAppearancePreferences(appearance)

    applyAccentColor(appearance.accentColor)
    applyNeonIntensity(appearance.neonIntensity)
    applyAppTheme(appearance.theme)
    applyVisualStyle(appearance.visualStyle)
    applyAnimationPreference(appearance.animations)

    setToast({
      id: crypto.randomUUID(),
      type: 'success',
      message: 'Preferências de aparência salvas!',
    })

  } catch {
    setToast({
      id: crypto.randomUUID(),
      type: 'error',
      message: 'Não foi possível salvar a aparência.',
    })
  }
}


return (
  <div className="settings-page">
    <header className="settings-page-heading">
      <span className="eyebrow">
        PERSONALIZAÇÃO
      </span>

      <h1>
        Minhas configurações<span className="neon-dot">.</span>
      </h1>

      <p>
        Personalize sua experiência e gerencie
        as preferências do aplicativo.
      </p>
    </header>

    <div className="settings-layout">

        <nav
          className="settings-sidebar"
          aria-label="Categorias das configurações"
        >
          {sections.map(section => {
            const SectionIcon = section.icon

            return (
              <button
                key={section.id}
                type="button"
                className={`settings-nav-item ${
                  activeSection === section.id ? 'active' : ''
                }`}
                onClick={() => {
  if (section.id === 'storage') {
    setStorageDiagnostics(getStorageDiagnostics())
  }

  if (section.id === 'security') {
    setSecurityDiagnostics(getSecurityDiagnostics())
  }

  setActiveSection(section.id)
}}
              >
                <SectionIcon size={19} />
                <span>{section.label}</span>
              </button>
            )
          })}
        </nav>

        <section className="settings-content">
          <div className="settings-content-header">
            <div className="settings-section-icon">
              <Icon size={22} />
            </div>

            <div>
              <h2>{selectedSection.label}</h2>
              <p>{selectedSection.description}</p>
            </div>
          </div>

          
{activeSection === 'profile' ? (
  <form
    className="settings-profile-form"
    onSubmit={handleSaveProfile}
  >


<div className="settings-profile-card">
<div
  className="settings-profile-avatar"
  style={{
    background: avatarGradient,
    color: '#ffffff',
  }}
>
    {selectedAvatar === 'initial' ? (
      userName.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U'
    ) : (
      (() => {
        const avatar = profileAvatars.find(
          item => item.id === selectedAvatar
        )

        const AvatarIcon = avatar?.icon

        return AvatarIcon
          ? <AvatarIcon size={28} strokeWidth={1.8} />
          : null
      })()
    )}
  </div>

  <div className="settings-profile-info">
    <strong>{userName.trim() || 'Meu perfil'}</strong>
    <span>Perfil pessoal</span>
    <small>Informações armazenadas neste dispositivo</small>
  </div>
</div>

<div className="settings-avatar-section">
  <div className="settings-avatar-heading">
    <strong>Escolher avatar</strong>
    <p>Personalize o ícone do seu perfil.</p>
  </div>

  <div className="settings-avatar-grid">
    {profileAvatars.map(avatar => {
      const AvatarIcon = avatar.icon

      return (
        <button
          key={avatar.id}
          type="button"
          className={`settings-avatar-option ${
            selectedAvatar === avatar.id ? 'selected' : ''
          }`}
          aria-label={`Avatar ${avatar.label}`}
          aria-pressed={selectedAvatar === avatar.id}
          onClick={() => setSelectedAvatar(avatar.id)}
        >
          <span className="settings-avatar-option-icon">
            {AvatarIcon ? (
              <AvatarIcon size={24} strokeWidth={1.8} />
            ) : (
              userName.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'U'
            )}
          </span>

          <small>{avatar.label}</small>
        </button>
      )
    })}
  </div>
</div>


<div className="settings-avatar-gradient">
  <div className="settings-avatar-gradient-heading">
    <strong>Personalizar degradê</strong>
    <p>Escolha duas cores para o fundo do seu avatar.</p>
  </div>

  <div className="settings-avatar-gradient-panel">
    <div
      className="settings-avatar-gradient-preview"
      style={{ background: avatarGradient }}
      aria-label="Prévia das cores do degradê"
    />


<div className="settings-avatar-gradient-controls">
  <div className="settings-avatar-gradient-color">
    <button
      type="button"
      className="settings-avatar-color-trigger"
      style={{ background: avatarColor1 }}
      aria-label="Editar primeira cor"
      aria-expanded={activeAvatarColor === 1}
      onClick={() =>
        setActiveAvatarColor(previous =>
          previous === 1 ? null : 1
        )
      }
    />
    <span>Primeira cor</span>
  </div>

  <div className="settings-avatar-gradient-color">
    <button
      type="button"
      className="settings-avatar-color-trigger"
      style={{ background: avatarColor2 }}
      aria-label="Editar segunda cor"
      aria-expanded={activeAvatarColor === 2}
      onClick={() =>
        setActiveAvatarColor(previous =>
          previous === 2 ? null : 2
        )
      }
    />
    <span>Segunda cor</span>
  </div>
</div>

{activeAvatarColor !== null && (
  <div className="settings-avatar-picker-container">
    <AvatarColorPicker
      key={activeAvatarColor}
      value={
        activeAvatarColor === 1
          ? avatarColor1
          : avatarColor2
      }
      onChange={
        activeAvatarColor === 1
          ? setAvatarColor1
          : setAvatarColor2
      }
    />

    <button
      type="button"
      className="settings-avatar-picker-close"
      onClick={() => setActiveAvatarColor(null)}
    >
      Concluir
    </button>
  </div>
)}

  </div>
</div>



    <div className="settings-form-field">
      <label htmlFor="settings-user-name">
        Nome de exibição
      </label>

      <input
        id="settings-user-name"
        type="text"
        value={userName}
        onChange={event => setUserName(event.target.value)}
        placeholder="Como deseja ser chamado?"
        maxLength={60}
        autoComplete="nickname"
      />

      <p>
        Esse nome será utilizado na saudação do Dashboard
        e no perfil do aplicativo.
      </p>
    </div>

    <div className="settings-form-actions">
      <button type="submit" className="primary-button">
        Salvar alterações
      </button>
    </div>
  </form>

) : activeSection === 'appearance' ? (
  <div className="settings-appearance">

<div className="settings-appearance-group">
  <h3>Estilo visual</h3>
  <p>
    Escolha a identidade visual do Personal Finance.
  </p>

  <div className="settings-choice-grid">
    {([
      ['classic', 'Clássico'],
      ['apple-glass', 'Apple Liquid Glass'],
      ['neon-glass', 'Neon Liquid Glass'],
    ] as const).map(([value, label]) => (
      <button
        key={value}
        type="button"
        className={`settings-choice ${
          appearance.visualStyle === value
            ? 'selected'
            : ''
        }`}
        aria-pressed={appearance.visualStyle === value}
        onClick={() =>
          setAppearance(previous => ({
            ...previous,
            visualStyle: value,
          }))
        }
      >
        {label}
      </button>
    ))}
  </div>
</div>

    <div className="settings-appearance-group">
      <h3>Tema do aplicativo</h3>
      <p>Escolha como deseja visualizar o Personal Finance.</p>

      <div className="settings-choice-grid">
        {([
          ['dark', 'Escuro'],
          ['light', 'Claro'],
          ['system', 'Automático'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`settings-choice ${
              appearance.theme === value ? 'selected' : ''
            }`}
            aria-pressed={appearance.theme === value}
            onClick={() =>
              setAppearance(previous => ({
                ...previous,
                theme: value,
              }))
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    <div className="settings-appearance-group">
      <h3>Cor de destaque</h3>
      <p>Selecione a cor principal dos elementos interativos.</p>

      <div className="settings-choice-grid">
        
{([
  ['purple', 'Roxo'],
  ['blue', 'Azul'],
  ['cyan', 'Ciano'],
  ['green', 'Verde'],
  ['yellow', 'Amarelo'],
  ['orange', 'Laranja'],
  ['red', 'Vermelho'],
  ['pink', 'Rosa'],
  ['white', 'Branco'],
] as const).map(([value, label]) => (

          <button
            key={value}
            type="button"
            className={`settings-choice ${
              appearance.accentColor === value ? 'selected' : ''
            }`}
            aria-pressed={appearance.accentColor === value}
            onClick={() =>
              setAppearance(previous => ({
                ...previous,
                accentColor: value,
              }))
            }
          >
            <span
              className={`settings-color-dot settings-color-${value}`}
            />
            {label}
          </button>
        ))}
      </div>
    </div>

    <div className="settings-appearance-group">
      <h3>Intensidade do neon</h3>
      <p>Controle o destaque luminoso dos elementos visuais.</p>

      <div className="settings-choice-grid">
        {([
          ['off', 'Desativado'],
          ['subtle', 'Suave'],
          ['intense', 'Intenso'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`settings-choice ${
              appearance.neonIntensity === value ? 'selected' : ''
            }`}
            aria-pressed={appearance.neonIntensity === value}
            onClick={() =>
              setAppearance(previous => ({
                ...previous,
                neonIntensity: value,
              }))
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>

<div className="settings-appearance-group">
  <h3>Animações do Liquid Glass</h3>

  <p>
    Controle os movimentos decorativos do fundo.
    Essa configuração não altera os dados financeiros.
  </p>

  <div className="settings-choice-grid">
    {([
      ['normal', 'Normal'],
      ['reduced', 'Reduzido'],
      ['off', 'Desativado'],
    ] as const).map(([value, label]) => (
      <button
        key={value}
        type="button"
        className={`settings-choice ${
          appearance.animations === value
            ? 'selected'
            : ''
        }`}
        aria-pressed={appearance.animations === value}
        onClick={() =>
          setAppearance(previous => ({
            ...previous,
            animations: value,
          }))
        }
      >
        {label}
      </button>
    ))}
  </div>
</div>

    <div className="settings-form-actions">
      <button
        type="button"
        className="primary-button"
        onClick={handleSaveAppearance}
      >
        Salvar aparência
      </button>
    </div>

  </div>


) : activeSection === 'notifications' ? (
  <div className="settings-appearance">
    <div className="settings-appearance-group">
      <h3>Preferências de notificações</h3>
      
<p>
  Personalize os avisos financeiros exibidos no painel
  de notificações do Personal Finance.
</p>


      <label className="settings-notification-option">
        <span>
          <strong>Ativar notificações</strong>
          <small>
            Controle geral dos avisos financeiros.
          </small>
        </span>
        <input
  type="checkbox"
  className="settings-toggle-input"
  role="switch"
  aria-label="Ativar notificações"
  checked={notificationPreferences.enabled}
  onChange={event =>
    setNotificationPreferences(previous => ({
      ...previous,
      enabled: event.target.checked,
    }))
  }
/>

      </label>
    </div>

    <div className="settings-appearance-group">
      <h3>Tipos de avisos</h3>

      {([
        {
          key: 'cardInvoices',
          label: 'Faturas de cartões',
          description: 'Avisos sobre vencimentos de faturas.',
        },
        {
          key: 'paymentReminders',
          label: 'Lembretes de pagamento',
          description: 'Avisos sobre pagamentos programados.',
        },
        {
          key: 'financialGoals',
          label: 'Metas financeiras',
          description: 'Avisos relacionados às suas metas.',
        },
      ] as const).map(option => (
        <label
          key={option.key}
          className="settings-notification-option"
        >
          <span>
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </span>

         
<input
  type="checkbox"
  className="settings-toggle-input"
  role="switch"
  aria-label={option.label}
  disabled={!notificationPreferences.enabled}
  checked={notificationPreferences[option.key]}
  onChange={event =>
    setNotificationPreferences(previous => ({
      ...previous,
      [option.key]: event.target.checked,
    }))
  }
/>

        </label>
      ))}
    </div>

    <div className="settings-appearance-group">
      <h3>Antecedência dos avisos</h3>
      <p>
        Defina quantos dias antes do vencimento deseja
        ser avisado quando o sistema estiver disponível.
      </p>

      <div className="settings-choice-grid">
        {([1, 3, 5, 7] as const).map(days => (
          <button
            key={days}
            type="button"
            disabled={!notificationPreferences.enabled}
            className={`settings-choice ${
              notificationPreferences.daysBeforeDue === days
                ? 'selected'
                : ''
            }`}
            aria-pressed={
              notificationPreferences.daysBeforeDue === days
            }
            onClick={() =>
              setNotificationPreferences(previous => ({
                ...previous,
                daysBeforeDue: days,
              }))
            }
          >
            {days} {days === 1 ? 'dia' : 'dias'}
          </button>
        ))}
      </div>
    </div>

    <div className="settings-appearance-group">
      
<p>
  Os avisos de vencimento de faturas são calculados
  automaticamente e exibidos no sino do aplicativo.
  Notificações externas e outros tipos de lembretes
  serão implementados futuramente.
</p>

    </div>

    <div className="settings-form-actions">
      <button
        type="button"
        className="primary-button"
        onClick={handleSaveNotifications}
      >
        Salvar notificações
      </button>
    </div>
  </div>
) : activeSection === 'security' ? (

  <div className="settings-appearance">
    <div className="settings-appearance-group">
      <h3>Estado de segurança</h3>
      <p>
        Consulte o estado do armazenamento e a presença
        de operações de recuperação pendentes.
      </p>

      <div className="settings-storage-grid">
        <div className="settings-storage-card">
          <Database size={22} />
          <strong>
            {securityDiagnostics.storageAvailable
              ? 'Disponível'
              : 'Indisponível'}
          </strong>
          <span>Leitura do armazenamento</span>
        </div>

        <div className="settings-storage-card">
          <ShieldCheck size={22} />
          <strong>
            {securityDiagnostics.pendingBackupRestore
              ? 'Pendente'
              : 'Não detectada'}
          </strong>
          <span>Restauração de backup</span>
        </div>

        <div className="settings-storage-card">
          <ShieldCheck size={22} />
          <strong>
            {securityDiagnostics.pendingCardPayment
              ? 'Pendente'
              : 'Não detectado'}
          </strong>
          <span>Registro de recuperação de pagamento</span>
        </div>

        <div className="settings-storage-card">
          <ShieldCheck size={22} />
          <strong>
            {securityDiagnostics.pendingSnapshotRecovery
              ? 'Presente'
              : 'Não detectado'}
          </strong>
          <span>Snapshot de recuperação</span>
        </div>
      </div>
    </div>

    {securityDiagnostics.warnings.length > 0 && (
      <div className="settings-appearance-group">
        <h3>Avisos de segurança</h3>

        {securityDiagnostics.warnings.map((warning, index) => (
          <p key={`${index}-${warning}`}>
            ⚠️ {warning}
          </p>
        ))}
      </div>
    )}

    <div className="settings-appearance-group">
      <h3>Proteção dos dados</h3>
      <p>
        Os registros de recuperação ajudam o aplicativo
        a identificar operações interrompidas.
        A ausência desses registros não comprova que
        todos os dados estejam íntegros.
      </p>
      <p>
        Caso exista uma pendência, não exclua manualmente
        as chaves do armazenamento. Utilize os mecanismos
        de recuperação do aplicativo.
      </p>
    </div>

    <div className="settings-form-actions">
      <button
        type="button"
        className="primary-button"
        onClick={() =>
          setSecurityDiagnostics(getSecurityDiagnostics())
        }
      >
        Atualizar diagnóstico
      </button>
    </div>
  </div>

) : activeSection === 'storage' ? (
  <div className="settings-appearance">

<div className="settings-appearance-group">
  <h3>Backup e restauração</h3>

  <p>
    Exporte uma cópia de segurança de todos os seus
    dados ou restaure um backup anterior.
  </p>

  <button
    type="button"
    className="primary-button"
    onClick={() => onOpenBackup?.()}
    disabled={!onOpenBackup}
  >
    <DatabaseBackup size={18} />
    Abrir Backup e restauração
  </button>
</div>

<div className="settings-appearance-group">
  <h3>Sincronização entre aparelhos</h3>

  <p>
    Junte os dados do celular, tablet e computador
    pelo Wi-Fi, com QR code, sem usar a internet.
  </p>

  <button
    type="button"
    className="primary-button"
    onClick={() => onOpenSync?.()}
    disabled={!onOpenSync}
  >
    <RefreshCw size={18} />
    Abrir Sincronização
  </button>
</div>

    <div className="settings-appearance-group">
      <h3>Armazenamento local</h3>
      <p>
        Consulte informações sobre os dados armazenados
        neste navegador.
      </p>

      <div className="settings-storage-grid">

  <div className="settings-storage-card">
    <Database size={22} />
    <strong>{storageDiagnostics.totalKeys}</strong>
    <span>Registros de armazenamento</span>
  </div>

  <div className="settings-storage-card">
    <Layers size={22} />
    <strong>{storageDiagnostics.financialKeys}</strong>
    <span>Chaves do Personal Finance</span>
  </div>

  <div className="settings-storage-card">
    <HardDrive size={22} />
    <strong>
      {storageDiagnostics.estimatedKilobytes.toLocaleString('pt-BR')} KB
    </strong>
    <span>Espaço estimado</span>
  </div>

  <div className="settings-storage-card">
    <CheckCircle2 size={22} />
    <strong>
      {storageDiagnostics.available
        ? 'Disponível'
        : 'Indisponível'}
    </strong>
    <span>Leitura do armazenamento</span>
     </div>
    </div>

     <div className="settings-appearance-group">
      <h3>Privacidade dos dados</h3>
      <p>
        Os dados financeiros deste aplicativo são
        armazenados localmente neste navegador.
      </p>
    </div>

    <div className="settings-form-actions">
      {/* Aqui fica o botão Atualizar informações */}
    </div>

  </div>

    <div className="settings-form-actions">
      <button
        type="button"
        className="primary-button"
        onClick={() =>
          setStorageDiagnostics(getStorageDiagnostics())
        }
      >
        Atualizar informações
      </button>
    </div>

  </div>
) : (
  <div className="settings-placeholder">
    <p>
      As opções desta categoria serão adicionadas
      nas próximas etapas.
    </p>
  </div>
)}


        </section>
      </div>

<Toast
  key={toast?.id ?? 'settings-toast'}
  toast={toast}
  onClose={() => setToast(null)}
/>

    </div>
  )
}
