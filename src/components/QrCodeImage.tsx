import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type QrCodeImageProps = {
  value: string
  label: string
}

/** Desenha um QR code (sempre preto no branco, para facilitar a leitura). */
export default function QrCodeImage({ value, label }: QrCodeImageProps) {
  const [image, setImage] = useState<{ value: string; url: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 720,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(
      url => {
        if (!cancelled) setImage({ value, url })
      },
      () => {
        if (!cancelled) setFailed(true)
      }
    )

    return () => {
      cancelled = true
    }
  }, [value])

  if (failed) {
    return <p className="sync-error">Não foi possível desenhar o QR code. Use o código em texto.</p>
  }

  if (!image || image.value !== value) {
    return <div className="sync-qr-box sync-qr-loading">Gerando QR code…</div>
  }

  return (
    <div className="sync-qr-box">
      <img src={image.url} alt={label} />
    </div>
  )
}
