/**
 * Contas do ajuste da foto de perfil.
 *
 * A foto aparece dentro de um círculo de tamanho `view` (em px). Ela sempre
 * cobre o círculo inteiro: no zoom 1 o lado menor da foto encaixa no círculo.
 * `x` e `y` são o quanto o centro da foto foi arrastado para longe do centro.
 */

export type CropState = { zoom: number; x: number; y: number }

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

/** Escala que faz a foto cobrir o círculo, já com o zoom aplicado. */
export function coverScale(width: number, height: number, view: number, zoom: number) {
  return Math.max(view / width, view / height) * zoom
}

/** Impede que o arraste deixe um "buraco" vazio dentro do círculo. */
export function clampCrop(
  crop: CropState,
  width: number,
  height: number,
  view: number
): CropState {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom))
  const scale = coverScale(width, height, view, zoom)
  const limitX = Math.max(0, (width * scale - view) / 2)
  const limitY = Math.max(0, (height * scale - view) / 2)

  return {
    zoom,
    x: Math.min(limitX, Math.max(-limitX, crop.x)),
    y: Math.min(limitY, Math.max(-limitY, crop.y)),
  }
}

/** Onde desenhar a foto num quadrado de `output` px para gerar o avatar. */
export function cropDrawRect(
  crop: CropState,
  width: number,
  height: number,
  view: number,
  output: number
) {
  const scale = coverScale(width, height, view, crop.zoom)
  const factor = output / view
  const drawWidth = width * scale * factor
  const drawHeight = height * scale * factor

  return {
    x: (output - drawWidth) / 2 + crop.x * factor,
    y: (output - drawHeight) / 2 + crop.y * factor,
    width: drawWidth,
    height: drawHeight,
  }
}
