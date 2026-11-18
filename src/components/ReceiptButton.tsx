import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Paperclip, Trash2 } from 'lucide-react'

import PfModal from './PfModal'
import ConfirmDialog from './ConfirmDialog'
import {
  ATTACHMENTS_CHANGED_EVENT,
  compressImage,
  deleteAttachment,
  getAttachment,
  getAttachmentIds,
  saveAttachment,
} from '../services/attachments'

/** Lista (compartilhada) das transações que têm foto. */
function useHasAttachment(transactionId: string): boolean {
  const [has, setHas] = useState(false)

  useEffect(() => {
    let active = true
    const load = () => void getAttachmentIds().then(ids => active && setHas(ids.has(transactionId)))
    load()
    window.addEventListener(ATTACHMENTS_CHANGED_EVENT, load)
    return () => {
      active = false
      window.removeEventListener(ATTACHMENTS_CHANGED_EVENT, load)
    }
  }, [transactionId])

  return has
}

type Props = {
  transactionId: string
  description: string
  onMessage: (type: 'success' | 'error', message: string) => void
}

/** Botão na transação: ver, tirar ou trocar a foto do comprovante. */
export default function ReceiptButton({ transactionId, description, onMessage }: Props) {
  const has = useHasAttachment(transactionId)
  const [open, setOpen] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    void getAttachment(transactionId).then(data => active && setImage(data))
    return () => {
      active = false
    }
  }, [open, transactionId])

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBusy(true)
    try {
      const data = await compressImage(file)
      await saveAttachment(transactionId, data)
      setImage(data)
      onMessage('success', 'Comprovante salvo!')
    } catch (error) {
      onMessage('error', error instanceof Error ? error.message : 'Não foi possível salvar a foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`edit-button receipt-button ${has ? "has-receipt" : ""}`}
        aria-label={has ? `Ver comprovante de ${description}` : `Adicionar comprovante a ${description}`}
        title={has ? 'Ver comprovante' : 'Adicionar comprovante'}
        onClick={() => setOpen(true)}
      >
        <Paperclip size={16} strokeWidth={1.8} />
      </button>

      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={handleFile} />

      <PfModal
        open={open}
        title="Comprovante"
        subtitle={description}
        onClose={() => {
          setOpen(false)
          setImage(null)
        }}
      >
        <div className="pf-receipt">
          {image ? (
            <a className="pf-receipt-image" href={image} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
              <img src={image} alt={`Comprovante de ${description}`} />
            </a>
          ) : (
            <div className="pf-receipt-empty">
              <Paperclip size={30} />
              <strong>{busy ? 'Salvando a foto…' : 'Nenhum comprovante ainda'}</strong>
              <p>Tire uma foto da nota ou do recibo, ou escolha uma imagem da galeria.</p>
            </div>
          )}

          <div className="pf-receipt-actions">
            <button type="button" className="primary-button" disabled={busy} onClick={() => camera.current?.click()}>
              <Camera size={16} /> {image ? 'Tirar outra' : 'Tirar foto'}
            </button>
            <button type="button" className="pf-ghost-button" disabled={busy} onClick={() => gallery.current?.click()}>
              <ImagePlus size={16} /> Galeria
            </button>
            {image && (
              <button type="button" className="pf-ghost-button is-danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} /> Remover
              </button>
            )}
          </div>

          <small className="pf-receipt-note">
            As fotos ficam neste aparelho e vão junto no backup (JSON). Elas não passam pela sincronização.
          </small>
        </div>
      </PfModal>

      <ConfirmDialog
        open={confirmDelete}
        title="Remover comprovante?"
        message="A foto será apagada. A transação continua como está."
        confirmLabel="Remover"
        onConfirm={() => {
          setConfirmDelete(false)
          void deleteAttachment(transactionId).then(() => setImage(null))
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
