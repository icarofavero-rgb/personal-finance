import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react'

import ProfileIcon from './ProfileIcon'
import {
  getFinancialProfiles,
  getFinancialProfilesState,
  PROFILES_CHANGED_EVENT,
} from '../services/financialProfilesStorage'
import { requestOpenProfilesSettings, switchToProfile } from '../services/profileSwitch'

/**
 * Botão no topo da tela com o perfil aberto. Só aparece quando existe
 * mais de um perfil. Tocar abre a lista para trocar de perfil.
 */
export default function ProfileSwitcher() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const [, setRevision] = useState(0)

  // Perfil criado/renomeado/excluído em Configurações: atualiza o botão
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener(PROFILES_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(PROFILES_CHANGED_EVENT, refresh)
  }, [])

  const profiles = getFinancialProfiles()
  const activeId = getFinancialProfilesState().activeProfileId
  const active = profiles.find(item => item.id === activeId) ?? profiles[0]

  function close() {
    if (!open) return
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 180)
  }

  useEffect(() => {
    if (!open) return

    function onPointer(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) close()
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

  if (profiles.length < 2 || !active) return null

  return (
    <div className="pf-profile-switcher" ref={wrapper} style={{ '--profile-color': active.color } as React.CSSProperties}>
      <button
        type="button"
        className="pf-profile-switcher-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Perfil aberto: ${active.name}. Trocar de perfil`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="pf-profile-badge is-small">
          <ProfileIcon icon={active.icon} size={15} />
        </span>
        <span className="pf-profile-switcher-name">{active.name}</span>
        <ChevronsUpDown size={15} />
      </button>

      {open && (
        <div className={`pf-profile-menu pf-pop ${closing ? 'is-closing' : ''}`} role="menu">
          <span className="pf-profile-menu-title">Trocar de perfil</span>

          {profiles.map(profile => (
            <button
              key={profile.id}
              type="button"
              role="menuitemradio"
              aria-checked={profile.id === activeId}
              className={`pf-profile-menu-item ${profile.id === activeId ? 'is-active' : ''}`}
              style={{ '--profile-color': profile.color } as React.CSSProperties}
              onClick={() => (profile.id === activeId ? close() : switchToProfile(profile.id))}
            >
              <span className="pf-profile-badge is-small">
                <ProfileIcon icon={profile.icon} size={15} />
              </span>
              <span>{profile.name}</span>
              {profile.id === activeId && <Check size={16} />}
            </button>
          ))}

          <button
            type="button"
            role="menuitem"
            className="pf-profile-menu-item is-manage"
            onClick={() => {
              close()
              requestOpenProfilesSettings()
            }}
          >
            <Settings2 size={16} />
            <span>Gerenciar perfis</span>
          </button>
        </div>
      )}
    </div>
  )
}
