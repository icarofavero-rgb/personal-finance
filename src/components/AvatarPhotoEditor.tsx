import { useEffect, useRef, useState } from 'react'
import { ImagePlus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import PfModal from './PfModal'
import {
  clampCrop,
  coverScale,
  cropDrawRect,
  MAX_ZOOM,
  MIN_ZOOM,
  type CropState,
} from '../services/avatarCrop'

type AvatarPhotoEditorProps = {
  /** Endereço da foto escolhida (object URL); null = janela fechada. */
  source: string | null
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
  onPickAnother: () => void
}

/** Tamanho do círculo de ajuste na tela e da imagem final guardada. */
const VIEW = 240
const OUTPUT = 320

const START: CropState = { zoom: 1, x: 0, y: 0 }

/**
 * Janela para ajustar a foto do perfil: arraste para posicionar,
 * use o controle (ou a roda do mouse / pinça com dois dedos) para o zoom.
 */
export default function AvatarPhotoEditor({ source, onCancel, onConfirm, onPickAnother }: AvatarPhotoEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<CropState>(START)
  const [failed, setFailed] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ distance: number; zoom: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!source) return

    let active = true
    const img = new Image()
    img.onload = () => {
      if (!active) return
      setImage(img)
      setCrop(START)
      setFailed(false)
    }
    img.onerror = () => active && setFailed(true)
    img.src = source

    return () => {
      active = false
    }
  }, [source])

  const width = image?.naturalWidth ?? 1
  const height = image?.naturalHeight ?? 1
  const update = (next: CropState) => setCrop(clampCrop(next, width, height, VIEW))

  // Roda do mouse = zoom (precisa ser "não passivo" para não rolar a página)
  useEffect(() => {
    const element = stage.current
    if (!element || !image) return

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      setCrop(current =>
        clampCrop({ ...current, zoom: current.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08) }, width, height, VIEW)
      )
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [image, width, height])

  function distance() {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) gesture.current = { distance: distance(), zoom: crop.zoom }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return

    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.current.size >= 2 && gesture.current) {
      // Pinça: afastar os dedos aumenta o zoom
      const zoom = gesture.current.zoom * (distance() / gesture.current.distance)
      setCrop(current => clampCrop({ ...current, zoom }, width, height, VIEW))
      return
    }

    const dx = event.clientX - previous.x
    const dy = event.clientY - previous.y
    setCrop(current => clampCrop({ ...current, x: current.x + dx, y: current.y + dy }, width, height, VIEW))
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current = null
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 20 : 6
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    update({ ...crop, x: crop.x + move[0], y: crop.y + move[1] })
  }

  function handleConfirm() {
    if (!image) return

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const context = canvas.getContext('2d')
    if (!context) return

    const rect = cropDrawRect(crop, width, height, VIEW, OUTPUT)
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
    onConfirm(canvas.toDataURL('image/jpeg', 0.86))
  }

  const scale = coverScale(width, height, VIEW, crop.zoom)

  return (
    <PfModal
      open={source !== null}
      title="Ajustar foto"
      subtitle="Arraste para posicionar e use o zoom para enquadrar."
      onClose={onCancel}
    >
      <div className="pf-photo-editor">
        <div
          ref={stage}
          className="pf-photo-stage"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="img"
          aria-label="Prévia da foto. Arraste ou use as setas para posicionar."
        >
          {image && (
            <img
              src={image.src}
              alt=""
              draggable={false}
              style={{
                width: width * scale,
                height: height * scale,
                transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px)`,
              }}
            />
          )}
          {!image && !failed && <span className="pf-photo-loading">Carregando foto…</span>}
          {failed && <span className="pf-photo-loading">Não foi possível abrir essa imagem.</span>}
          <span className="pf-photo-ring" aria-hidden="true" />
        </div>

        <div className="pf-photo-zoom">
          <button
            type="button"
            className="pf-photo-zoom-button"
            aria-label="Diminuir zoom"
            onClick={() => update({ ...crop, zoom: crop.zoom - 0.25 })}
            disabled={!image || crop.zoom <= MIN_ZOOM}
          >
            <ZoomOut size={18} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            aria-label="Zoom da foto"
            disabled={!image}
            onChange={event => update({ ...crop, zoom: Number(event.target.value) })}
            style={{ '--pf-range-fill': `${((crop.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` } as React.CSSProperties}
          />
          <button
            type="button"
            className="pf-photo-zoom-button"
            aria-label="Aumentar zoom"
            onClick={() => update({ ...crop, zoom: crop.zoom + 0.25 })}
            disabled={!image || crop.zoom >= MAX_ZOOM}
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="pf-photo-tools">
          <button type="button" className="pf-photo-button" onClick={onPickAnother}>
            <ImagePlus size={16} /> Trocar foto
          </button>
          <button type="button" className="pf-photo-button" onClick={() => setCrop(START)} disabled={!image}>
            <RotateCcw size={16} /> Centralizar
          </button>
        </div>

        <div className="pf-photo-actions">
          <button type="button" className="pf-photo-button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={handleConfirm} disabled={!image}>
            Usar esta foto
          </button>
        </div>
      </div>
    </PfModal>
  )
}
