import { describe, expect, it } from 'vitest'
import { computeGenealogyMapZoomIdentityTransform } from '@genealogy/map/genealogyMapZoomFit'

describe('computeGenealogyMapZoomIdentityTransform', () => {
  it('uses singlePointScale when bbox has zero width and height', () => {
    const t = computeGenealogyMapZoomIdentityTransform({
      width: 200,
      height: 200,
      padding: 32,
      x0: 50,
      y0: 50,
      x1: 50,
      y1: 50,
      scaleExtent: [0.8, 6],
      singlePointScale: 3,
    })
    expect(t.k).toBe(3)
    expect(t.x).toBeCloseTo(200 / 2 - 50 * 3)
    expect(t.y).toBeCloseTo(200 / 2 - 50 * 3)
  })

  it('fits a box inside the padded viewport and clamps scale to scaleExtent max', () => {
    const t = computeGenealogyMapZoomIdentityTransform({
      width: 100,
      height: 100,
      padding: 10,
      x0: 0,
      y0: 0,
      x1: 10,
      y1: 10,
      scaleExtent: [0.8, 6],
      singlePointScale: 3,
    })
    // target 80×80, box 10×10 → raw fit 8, clamped to max 6
    expect(t.k).toBe(6)
    expect(t.x).toBeCloseTo(50 - 5 * 6)
    expect(t.y).toBeCloseTo(50 - 5 * 6)
  })

  it('raises scale to at least scaleExtent min when the box is huge', () => {
    const t = computeGenealogyMapZoomIdentityTransform({
      width: 100,
      height: 100,
      padding: 0,
      x0: 0,
      y0: 0,
      x1: 1000,
      y1: 1000,
      scaleExtent: [0.8, 6],
      singlePointScale: 3,
    })
    expect(t.k).toBe(0.8)
  })
})
