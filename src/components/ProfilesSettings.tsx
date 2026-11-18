import { useState } from 'react'
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'

import ConfirmDialog from './ConfirmDialog'
import ProfileIcon, { PROFILE_ICON_OPTIONS } from './ProfileIcon'
import {
  createFinancialProfile,
  deleteFinancialProfile,
  getFinancialProfiles,
  getFinancialProfilesState,
  PROFILE_COLORS,
  updateFinancialProfile,
  type FinancialProfile,
} from '../services/financialProfilesStorage'
import { DEFAULT_PROFILE_ID } from '../services/profileScope'
import { switchToProfile } from '../services/profileSwitch'

type ProfilesSettingsProps = {
  onMessage: (message: string, type?: 'success' | 'error') => void
}

type Draft = { id: string | null; name: string; color: string; icon: string }

const EMPTY_DRAFT: Draft = { id: null, name: '', color: PROFILE_COLORS[1], icon: 'briefcase' }

/**
 * Configurações → Perfis: cada perfil tem as próprias entradas, saídas,
 * cartões, metas... A sincronização e o backup levam todos juntos.
 */
export default function ProfilesSettings({ onMessage }: ProfilesSettingsProps) {
  const [profiles, setProfiles] = useState(getFinancialProfiles)
  const activeId = getFinancialProfilesState().activeProfileId
  const [draft, setDraft] = useState<Draft | null>(null)
  const [toDelete, setToDelete] = useState<FinancialProfile | null>(null)

  const refresh = () => setProfiles(getFinancialProfiles())

  function save() {
    if (!draft) return

    try {
      if (draft.id) {
        updateFinancialProfile(draft.id, { name: draft.name, color: draft.color, icon: draft.icon })
        onMessage('Perfil atualizado!')
      } else {
        createFinancialProfile(draft.name, draft.color, draft.icon)
        onMessage('Perfil criado! Toque em “Abrir” para usar.')
      }

      setDraft(null)
      refresh()
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.', 'error')
    }
  }

  function confirmDelete() {
    if (!toDelete) return

    const wasActive = toDelete.id === activeId

    try {
      deleteFinancialProfile(toDelete.id)
      setToDelete(null)

      // Se apagou o perfil aberto, volta para o principal
      if (wasActive) {
        switchToProfile(DEFAULT_PROFILE_ID)
        return
      }

      refresh()
      onMessage('Perfil excluído.')
    } catch (error) {
      setToDelete(null)
      onMessage(error instanceof Error ? error.message : 'Não foi possível excluir o perfil.', 'error')
    }
  }

  return (
    <div className="settings-appearance pf-profiles-settings">
      <div className="settings-appearance-group">
        <h3>Seus perfis</h3>
        <p>
          Cada perfil tem as próprias entradas, saídas, cartões, metas, orçamentos e lembretes. Aparência e
          layout são os mesmos para todos.
        </p>

        <ul className="pf-profiles-list">
          {profiles.map(profile => {
            const active = profile.id === activeId

            return (
              <li
                key={profile.id}
                className={`pf-profile-row ${active ? 'is-active' : ''}`}
                style={{ '--profile-color': profile.color } as React.CSSProperties}
              >
                <span className="pf-profile-badge">
                  <ProfileIcon icon={profile.icon} size={20} />
                </span>

                <span className="pf-profile-text">
                  <strong>{profile.name}</strong>
                  <small>
                    {profile.id === DEFAULT_PROFILE_ID ? 'Perfil principal' : 'Perfil adicional'}
                    {active ? ' · aberto agora' : ''}
                  </small>
                </span>

                <span className="pf-profile-actions">
                  {active ? (
                    <span className="pf-profile-current">
                      <Check size={15} /> Em uso
                    </span>
                  ) : (
                    <button type="button" className="pf-profile-open" onClick={() => switchToProfile(profile.id)}>
                      Abrir
                    </button>
                  )}

                  <button
                    type="button"
                    className="pf-profile-icon-button"
                    aria-label={`Editar ${profile.name}`}
                    onClick={() => setDraft({ id: profile.id, name: profile.name, color: profile.color, icon: profile.icon })}
                  >
                    <Pencil size={16} />
                  </button>

                  {profile.id !== DEFAULT_PROFILE_ID && (
                    <button
                      type="button"
                      className="pf-profile-icon-button is-danger"
                      aria-label={`Excluir ${profile.name}`}
                      onClick={() => setToDelete(profile)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>

        {!draft && (
          <button type="button" className="pf-profile-add" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            <Plus size={18} /> Novo perfil
          </button>
        )}
      </div>

      {draft && (
        <div className="settings-appearance-group pf-profile-editor" style={{ '--profile-color': draft.color } as React.CSSProperties}>
          <h3>{draft.id ? 'Editar perfil' : 'Novo perfil'}</h3>

          <div className="pf-profile-preview">
            <span className="pf-profile-badge is-large">
              <ProfileIcon icon={draft.icon} size={26} />
            </span>
            <strong>{draft.name.trim() || 'Nome do perfil'}</strong>
          </div>

          <label className="pf-profile-label" htmlFor="pf-profile-name">
            Nome
          </label>
          <input
            id="pf-profile-name"
            className="pf-profile-input"
            value={draft.name}
            maxLength={40}
            placeholder="Ex.: Trabalho, Casa, Loja"
            onChange={event => setDraft({ ...draft, name: event.target.value })}
            onKeyDown={event => event.key === 'Enter' && save()}
            autoFocus
          />

          <span className="pf-profile-label">Cor</span>
          <div className="pf-profile-colors" role="radiogroup" aria-label="Cor do perfil">
            {PROFILE_COLORS.map(color => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={draft.color === color}
                aria-label={`Cor ${color}`}
                className={`pf-profile-color ${draft.color === color ? 'is-selected' : ''}`}
                style={{ background: color }}
                onClick={() => setDraft({ ...draft, color })}
              />
            ))}
          </div>

          <span className="pf-profile-label">Ícone</span>
          <div className="pf-profile-icons" role="radiogroup" aria-label="Ícone do perfil">
            {PROFILE_ICON_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={draft.icon === option.id}
                aria-label={option.label}
                title={option.label}
                className={`pf-profile-icon-choice ${draft.icon === option.id ? 'is-selected' : ''}`}
                onClick={() => setDraft({ ...draft, icon: option.id })}
              >
                <option.icon size={19} strokeWidth={1.9} />
              </button>
            ))}
          </div>

          <div className="settings-form-actions pf-profile-editor-actions">
            <button type="button" className="pf-ghost-button" onClick={() => setDraft(null)}>
              <X size={16} /> Cancelar
            </button>
            <button type="button" className="primary-button" onClick={save}>
              {draft.id ? 'Salvar perfil' : 'Criar perfil'}
            </button>
          </div>
        </div>
      )}

      <div className="pf-profiles-note">
        <RefreshCw size={18} />
        <span>
          Ao sincronizar com outro aparelho ou fazer backup, <strong>todos os perfis vão juntos</strong>,
          cada um com os seus próprios dados.
        </span>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Excluir o perfil “${toDelete?.name ?? ''}”?`}
        message="Todas as entradas, saídas, cartões e metas deste perfil serão apagados neste aparelho e nos aparelhos sincronizados. Essa ação não poderá ser desfeita."
        confirmLabel="Excluir perfil"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
