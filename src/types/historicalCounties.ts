import type { Feature, FeatureCollection, Geometry } from 'geojson'

/**
 * Newberry AHCB-derived feature properties for a single historical county
 * polygon. `START_DATE` / `END_DATE` are ISO 8601 strings; `startYear` /
 * `endYear` are pre-extracted integers added at fetch time so the map can
 * filter by playhead year without re-parsing strings on every frame.
 */
export type HistoricalCountyProperties = {
  ID: string
  ID_NUM: number
  NAME: string
  FULL_NAME: string
  STATE_TERR: string
  state_abbr: string
  FIPS: string
  VERSION: number
  START_DATE: string
  END_DATE: string
  CHANGE: string | null
  CITATION: string | null
  CNTY_TYPE: string | null
  CROSS_REF: string | null
  END_N: string | null
  NAME_START: string | null
  START_N: string | null
  AREA_SQMI: number | null
  startYear: number
  endYear: number
}

export type HistoricalCountyFeature = Feature<Geometry, HistoricalCountyProperties>
export type HistoricalCountyFeatureCollection = FeatureCollection<Geometry, HistoricalCountyProperties>

export type HistoricalCountiesStateEntry = {
  name: string
  abbr: string
  key: string
  object: string
  feature_count: number
  bbox: [number, number, number, number]
  date_range: {
    earliest_start: string | null
    latest_end: string | null
  }
  size_bytes: number
}

export type HistoricalCountiesIndex = {
  version: number
  format: 'topojson'
  states: Record<string, HistoricalCountiesStateEntry>
}
