import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown, Plus, Settings as SettingsIcon } from 'lucide-react'

import ProfileIcon from './ProfileIcon'
import {
  getFinancialProfiles,
  getFinancialProfilesState,
  PROFILES_CHANGED_EVENT,
} from '../services/financialProfilesStorage'
import { requestOpenProfilesSettings, switchToProfile } from '../services/profileSwitch'

type Props = {
  compact: boolean
  active: boolean
  profileName: string
  profileAvatar: ReactNode
  profileBackground: string
  profileSubtitle?: string
  onOpenSettings: () => void
}

/**
 * Botão do usuário no menu lateral. Ao tocar, abre um menu com:
 * trocar de perfil, criar perfil e Configurações.
 */
export default function SideProfileMenu({
  compact,
  active,
  profileName,
  profileAvatar,
  profileBackground,
  profileSubtitle,
  onOpenSettings,
}: Props) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [position, setPosition] = useState<React.CSSProperties>({})
  const [, setRevision] = useState(0)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  const profiles = getFinancialProfiles()
  const activeId = getFinancialProfilesState().activeProfileId

  function close() {
    if (!open || closing) return
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 170)
  }

  // Lista de perfis atualizada (criou/renomeou em Configurações)
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener(PROFILES_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROFILES_CHANGED_EVENT, refresh)
  }, [])

  // Menu sobe a partir do botão (no trilho do tablet, abre ao lado)
  useLayoutEffect(() => {
    if (!open || !button.current) return
    const rect = button.current.getBoundingClientRect()

    setPosition(
      compact
        ? { left: rect.right + 10, bottom: Math.max(12, window.innerHeight - rect.bottom) }
        : { left: rect.left, bottom: window.innerHeight - rect.top + 8, width: Math.max(250, rect.width) }
    )
  }, [open, compact])

  useEffect(() => {
    if (!open) return

    function onPointer(event: PointerEvent) {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  })

  const choose = (action: () => void) => {
    close()
    action()
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`pf-sidenav-profile ${active || open ? 'is-active' : ''}`}
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Abrir meu perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Meu perfil"
      >
        <span className="pf-sidenav-avatar" style={{ background: profileBackground }}>
          {profileAvatar}
        </span>
        {!compact && (
          <>
            <span className="pf-sidenav-profile-info">
              <strong>{profileName || 'Meu perfil'}</strong>
              <small>{profileSubtitle ? `Perfil: ${profileSubtitle}` : 'Ver opções'}</small>
            </span>
            <ChevronsUpDown size={16} className="pf-sidenav-profile-chevron" />
          </>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={menu}
            className={`pf-side-profile-menu pf-pop ${closing ? 'is-closing' : ''} ${compact ? 'is-side' : ''}`}
            style={position}
            role="menu"
            aria-label="Meu perfil"
          >
            {profiles.length > 1 && (
              <>
                <span className="pf-profile-menu-title">Trocar de perfil</span>
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={profile.id === activeId}
                    className={`pf-profile-menu-item ${profile.id === activeId ? 'is-active' : ''}`}
                    style={{ '--profile-color': profile.color } as React.CSSProperties}
                    onClick={() => choose(() => profile.id !== activeId && switchToProfile(profile.id))}
                  >
                    <span className="pf-profile-badge is-small">
                      <ProfileIcon icon={profile.icon} size={15} />
                    </span>
                    <span>{profile.name}</span>
                    {profile.id === activeId && <Check size={16} />}
                  </button>
                ))}
                <span className="pf-side-profile-divider" aria-hidden="true" />
              </>
            )}

            <button
              type="button"
              role="menuitem"
              className="pf-profile-menu-item is-create"
              onClick={() => choose(() => requestOpenProfilesSettings({ create: true }))}
            >
              <span className="pf-side-profile-icon">
                <Plus size={16} />
              </span>
              <span>Criar perfil</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className="pf-profile-menu-item"
              onClick={() => choose(onOpenSettings)}
            >
              <span className="pf-side-profile-icon">
                <SettingsIcon size={16} />
              </span>
              <span>Configurações</span>
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
