import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import jsQR from 'jsqr'

import { SIGNAL_PREFIX } from './signalCodec'

/** Desenha o QR em pixels (como a câmera veria) e tenta ler de volta. */
function renderAndRead(text: string, scale = 4): string | null {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' })
  const margin = 2
  const modules = qr.modules.size
  const size = (modules + margin * 2) * scale
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255)

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!qr.modules.get(row, col)) continue

      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = (col + margin) * scale + dx
          const y = (row + margin) * scale + dy
          const index = (y * size + x) * 4
          pixels[index] = pixels[index + 1] = pixels[index + 2] = 0
        }
      }
    }
  }

  return jsQR(pixels, size, size)?.data ?? null
}

describe('QR code da sincronização', () => {
  it('um código do tamanho real (~600 caracteres) é lido de volta', () => {
    const code =
      SIGNAL_PREFIX +
      Array.from({ length: 600 }, (_, index) =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[(index * 7919) % 64]
      ).join('')

    expect(renderAndRead(code)).toBe(code)
  })
})
