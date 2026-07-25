import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type {
  HistoricalCountyFeatureCollection,
  HistoricalCountyProperties,
} from '../../types/historicalCounties'
import { devConsole } from '@utils/devConsole'
import { getHistoricalCountiesBaseUrl } from './baseUrl'

const STATE_ABBR_PATTERN = /^[a-z]{2}$/

function parseYear(iso: string | null | undefined): number {
  if (!iso) return Number.NaN
  const year = Number(iso.slice(0, 4))
  return Number.isFinite(year) ? year : Number.NaN
}

export async function fetchHistoricalCountiesState(abbr: string): Promise<HistoricalCountyFeatureCollection> {
  const key = abbr.toLowerCase()
  if (!STATE_ABBR_PATTERN.test(key)) {
    throw new Error(`Invalid state abbreviation: ${abbr}`)
  }
  // Public bucket, unauthenticated. The source app routed this through its
  // axios client purely for convenience, and relied on the absolute URL to skip
  // the Bearer token and 401 handler — so plain fetch is the same request.
  const url = `${getHistoricalCountiesBaseUrl()}/states/${key}.topojson`

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
    }
    const topo = (await res.json()) as Topology
    const obj = topo.objects[key]
    if (!obj) {
      throw new Error(`TopoJSON for ${key} is missing object "${key}"`)
    }
    const fc = feature(topo, obj) as unknown as HistoricalCountyFeatureCollection

    for (const f of fc.features) {
      const p = f.properties as HistoricalCountyProperties
      p.startYear = parseYear(p.START_DATE)
      p.endYear = parseYear(p.END_DATE)
    }
    return fc
  } catch (err) {
    devConsole('error', '[historicalCounties] Error fetching state:', url, err)
    throw err
  }
}
