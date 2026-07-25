const DEFAULT_BASE_URL = 'https://historical-counties.s3.us-east-1.amazonaws.com'

export function getHistoricalCountiesBaseUrl(): string {
  const raw = import.meta.env.VITE_HISTORICAL_COUNTIES_BASE_URL ?? DEFAULT_BASE_URL
  return raw.replace(/\/$/, '')
}
