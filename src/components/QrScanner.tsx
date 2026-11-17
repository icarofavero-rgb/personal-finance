import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

type QrScannerProps = {
  /** Chamado com o texto do primeiro QR code válido encontrado */
  onCode: (text: string) => void
  /** Aceita só códigos com este prefixo (ignora outros QR codes) */
  prefix?: string
}

const MAX_SCAN_WIDTH = 640

/** Lê QR codes pela câmera (traseira, quando houver). */
export default function QrScanner({ onCode, prefix }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodeRef = useRef(onCode)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onCodeRef.current = onCode
  }, [onCode])

  useEffect(() => {
    let stream: MediaStream | null = null
    let frame = 0
    let stopped = false

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    function scan() {
      if (stopped) return

      const video = videoRef.current

      if (video && context && video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const scale = Math.min(1, MAX_SCAN_WIDTH / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(pixels.data, pixels.width, pixels.height, {
          inversionAttempts: 'dontInvert',
        })

        if (result?.data && (!prefix || result.data.startsWith(prefix))) {
          stopped = true
          onCodeRef.current(result.data)
          return
        }
      }

      frame = requestAnimationFrame(scan)
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'Este navegador não permite usar a câmera aqui. ' +
          'Use a opção de colar o código em texto.'
        )
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch {
        setError(
          'Não foi possível abrir a câmera. Verifique se o app tem ' +
          'permissão para usá-la, ou cole o código em texto.'
        )
        return
      }

      if (stopped) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      const video = videoRef.current
      if (!video) return

      video.srcObject = stream
      await video.play().catch(() => {})
      frame = requestAnimationFrame(scan)
    }

    void start()

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [prefix])

  if (error) {
    return <p className="sync-error">{error}</p>
  }

  return (
    <div className="sync-scanner">
      <video ref={videoRef} muted playsInline aria-label="Imagem da câmera" />
      <div className="sync-scanner-frame" aria-hidden="true" />
    </div>
  )
}
