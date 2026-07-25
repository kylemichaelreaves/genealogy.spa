/**
 * Shared tuning for the genealogy D3 map (projection fit, node sizing, zoom).
 * Used by {@link createGenealogyMap} and related helpers.
 */

/** FIPS codes for the southern US — filter state features so the map fits that region. */
export const GENEALOGY_MAP_SOUTHERN_STATE_FIPS = new Set([
  '01', // Alabama
  '05', // Arkansas
  '12', // Florida
  '13', // Georgia
  '21', // Kentucky
  '22', // Louisiana
  '28', // Mississippi
  '37', // North Carolina
  '40', // Oklahoma
  '45', // South Carolina
  '47', // Tennessee
  '48', // Texas
  '51', // Virginia
  '54', // West Virginia
])

export const GENEALOGY_MAP_SELECT_NODE_RADIUS = 9
export const GENEALOGY_MAP_DEFAULT_NODE_RADIUS = 6
/** Circle `r` in map units — shrinks as zoom scale increases so nodes do not cover county highlights. */
export const GENEALOGY_MAP_CIRCLE_R_MIN = 1.5
export const GENEALOGY_MAP_CIRCLE_R_MAX = 8
export const GENEALOGY_MAP_CIRCLE_STROKE_BASE = 1.5
export const GENEALOGY_MAP_PADDING = 16

export const GENEALOGY_MAP_ZOOM_TRANSITION_MS = 600
export const GENEALOGY_MAP_ZOOM_FIT_PADDING = 32
export const GENEALOGY_MAP_SINGLE_POINT_SCALE = 3

/** Squared distance (px) below which pointerup counts as a click, not a drag. */
export const GENEALOGY_MAP_CLICK_DISTANCE_PX_SQ = 25
