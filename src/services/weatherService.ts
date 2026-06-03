import type { WeatherPoint } from '../types'
import { windSpeedKnotsToBeaufort } from '../utils/beaufort'

const MARINE_API = 'https://marine-api.open-meteo.com/v1/marine'
const WIND_API = 'https://api.open-meteo.com/v1/forecast'
const SAMPLE_RATE = 6

function seededNoise(lat: number, lng: number, offset: number): number {
  const raw = Math.sin(lat * 12.9898 + lng * 78.233 + offset * 19.19) * 43758.5453
  return raw - Math.floor(raw)
}

function buildFallbackWeather(lat: number, lng: number): WeatherPoint {
  return {
    lat,
    lng,
    windSpeedKnots: 8,
    windDirectionDeg: 180,
    waveHeightMeters: 1,
    waveDirectionDeg: 180,
    swellHeightMeters: 0.5,
    currentSpeedKnots: 0,
    currentDirectionDeg: 0,
    beaufortScale: 3,
    isHighRisk: false,
    dataSource: 'fallback',
  }
}

async function fetchSinglePoint(lat: number, lng: number): Promise<WeatherPoint> {
  try {
    const marineResponse = await fetch(
      `${MARINE_API}?latitude=${lat}&longitude=${lng}` +
        '&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_direction,ocean_current_velocity,ocean_current_direction' +
        '&forecast_days=1&timezone=UTC&cell_selection=sea&length_unit=metric',
    )
    const windResponse = await fetch(
      `${WIND_API}?latitude=${lat}&longitude=${lng}` +
        '&hourly=wind_speed_10m,wind_direction_10m' +
        '&forecast_days=1&timezone=UTC&wind_speed_unit=kn',
    )

    if (!marineResponse.ok || !windResponse.ok) {
      throw new Error('Weather API request failed.')
    }

    const marineData = await marineResponse.json()
    const windData = await windResponse.json()
    const hourIndex = 12

    const waveHeight = marineData?.hourly?.wave_height?.[hourIndex] ?? 0.5
    const waveDirection = marineData?.hourly?.wave_direction?.[hourIndex] ?? 180
    const swellHeight = marineData?.hourly?.swell_wave_height?.[hourIndex] ?? 0.3
    const currentSpeedKmh =
      marineData?.hourly?.ocean_current_velocity?.[hourIndex] ?? 0
    const currentDirection =
      marineData?.hourly?.ocean_current_direction?.[hourIndex] ?? 0
    const windSpeed = windData?.hourly?.wind_speed_10m?.[hourIndex] ?? 5
    const windDirection = windData?.hourly?.wind_direction_10m?.[hourIndex] ?? 180
    const beaufortScale = windSpeedKnotsToBeaufort(windSpeed)
    const currentSpeedKnots = currentSpeedKmh * 0.539957

    return {
      lat,
      lng,
      windSpeedKnots: Math.round(windSpeed * 10) / 10,
      windDirectionDeg: Math.round(windDirection),
      waveHeightMeters: Math.round(waveHeight * 10) / 10,
      waveDirectionDeg: Math.round(waveDirection),
      swellHeightMeters: Math.round(swellHeight * 10) / 10,
      currentSpeedKnots: Math.round(currentSpeedKnots * 10) / 10,
      currentDirectionDeg: Math.round(currentDirection),
      beaufortScale,
      isHighRisk: beaufortScale >= 6 || waveHeight >= 3.5,
      dataSource: 'open-meteo',
    }
  } catch (error) {
    console.warn(`Weather fetch failed for ${lat},${lng}`, error)
    return buildFallbackWeather(lat, lng)
  }
}

export async function fetchRouteWeather(
  waypoints: [number, number][],
  onProgress?: (percent: number) => void,
): Promise<WeatherPoint[]> {
  const sampledWaypoints = waypoints.filter((_, index) => index % SAMPLE_RATE === 0)
  const results: WeatherPoint[] = []

  if (sampledWaypoints.length === 0) {
    onProgress?.(100)
    return results
  }

  for (let index = 0; index < sampledWaypoints.length; index += 1) {
    const [lat, lng] = sampledWaypoints[index]
    const weather = await fetchSinglePoint(lat, lng)
    results.push(weather)
    onProgress?.(Math.round(((index + 1) / sampledWaypoints.length) * 100))
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  return results
}

export function generateSimulatedWeather(
  waypoints: [number, number][],
): WeatherPoint[] {
  return waypoints
    .filter((_, index) => index % SAMPLE_RATE === 0)
    .map(([lat, lng]) => {
      const seaNoise = seededNoise(lat, lng, 1)
      const windNoise = seededNoise(lat, lng, 2)
      const directionNoise = seededNoise(lat, lng, 3)
      const currentNoise = seededNoise(lat, lng, 4)
      const currentDirectionNoise = seededNoise(lat, lng, 5)

      const isArabianSea = lat > 5 && lat < 20 && lng > 55 && lng < 80
      const isNorthAtlantic = lat > 35 && lng < -20
      const isMediterranean = lat > 30 && lat < 45 && lng > -5 && lng < 40

      let windSpeed = 10 + windNoise * 10
      let waveHeight = 1 + seaNoise * 1.4
      let currentSpeed = 0.2 + currentNoise * 0.8

      if (isArabianSea) {
        windSpeed = 28 + windNoise * 8
        waveHeight = 4 + seaNoise * 2
        currentSpeed = 1 + currentNoise * 1.1
      } else if (isNorthAtlantic) {
        windSpeed = 19 + windNoise * 7
        waveHeight = 2.2 + seaNoise * 1.6
        currentSpeed = 0.6 + currentNoise * 0.8
      } else if (isMediterranean) {
        windSpeed = 8 + windNoise * 5
        waveHeight = 0.5 + seaNoise * 0.8
        currentSpeed = 0.1 + currentNoise * 0.4
      }

      const beaufortScale = windSpeedKnotsToBeaufort(windSpeed)
      const waveDirectionDeg = Math.round((directionNoise * 220 + 80) % 360)

      return {
        lat,
        lng,
        windSpeedKnots: Math.round(windSpeed * 10) / 10,
        windDirectionDeg: Math.round(directionNoise * 360),
        waveHeightMeters: Math.round(waveHeight * 10) / 10,
        waveDirectionDeg,
        swellHeightMeters: Math.round(waveHeight * 0.65 * 10) / 10,
        currentSpeedKnots: Math.round(currentSpeed * 10) / 10,
        currentDirectionDeg: Math.round(currentDirectionNoise * 360),
        beaufortScale,
        isHighRisk: beaufortScale >= 6 || waveHeight >= 3.5,
        dataSource: 'simulated',
      }
    })
}
