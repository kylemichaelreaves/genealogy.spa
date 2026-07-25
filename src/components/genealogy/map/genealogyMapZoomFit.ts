import * as d3 from 'd3'

export type GenealogyMapZoomFitParams = {
  width: number
  height: number
  /** Same padding as used for `fitExtent` content box (e.g. ZOOM_FIT_PADDING). */
  padding: number
  x0: number
  y0: number
  x1: number
  y1: number
  scaleExtent: readonly [number, number]
  singlePointScale: number
}

/**
 * Maps a projected-axis bounding box to a d3 zoom identity transform (same math
 * for fitting to person points or county path bounds).
 */
export function computeGenealogyMapZoomIdentityTransform(
  params: GenealogyMapZoomFitParams,
): d3.ZoomTransform {
  const { width, height, padding, x0, y0, x1, y1, scaleExtent, singlePointScale } = params
  const dx = x1 - x0
  const dy = y1 - y0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2

  const targetWidth = Math.max(1, width - padding * 2)
  const targetHeight = Math.max(1, height - padding * 2)
  const [minScale, maxScale] = scaleExtent

  let scale: number
  if (dx <= 0 && dy <= 0) {
    scale = singlePointScale
  } else {
    const fit = Math.min(targetWidth / Math.max(dx, 1), targetHeight / Math.max(dy, 1))
    scale = Math.min(maxScale, Math.max(minScale, fit))
  }

  const tx = width / 2 - cx * scale
  const ty = height / 2 - cy * scale
  return d3.zoomIdentity.translate(tx, ty).scale(scale)
}

export function applyGenealogyMapZoomTransition(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>,
  transform: d3.ZoomTransform,
  durationMs: number,
): void {
  svg.transition().duration(durationMs).call(zoomBehavior.transform, transform)
}
