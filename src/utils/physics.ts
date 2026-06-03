import type {
  DetourResult,
  SpeedRecommendation,
  VesselInputs,
  VoyageLeg,
  VoyageResult,
  WeatherPoint,
} from '../types'
import { getSpeedLossFactor } from './beaufort'
import { haversineNm } from './haversine'

const BASE_FUEL_MT_PER_DAY_BALLAST = 23.5
const BASE_FUEL_MT_PER_DAY_LADEN = 26.5
const DESIGN_SPEED_KTS = 12
const CO2_FACTOR = 3.1144
const MIN_SOG_KTS = 3

const ECA_ZONES = [
  { lngMin: -5, lngMax: 15, latMin: 45, latMax: 65 },
  { lngMin: -5, lngMax: 3, latMin: 48, latMax: 52 },
]

function isInECA(lat: number, lng: number): boolean {
  return ECA_ZONES.some(
    (zone) =>
      lat >= zone.latMin &&
      lat <= zone.latMax &&
      lng >= zone.lngMin &&
      lng <= zone.lngMax,
  )
}

function getDefaultWeather(lat: number, lng: number): WeatherPoint {
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

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function angularDifferenceDeg(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b))
  return diff > 180 ? 360 - diff : diff
}

function calculateBearingDeg(from: [number, number], to: [number, number]): number {
  const lat1 = toRadians(from[0])
  const lat2 = toRadians(to[0])
  const dLng = toRadians(to[1] - from[1])
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  return normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI)
}

function calculateCurrentComponentKnots(
  routeBearingDeg: number,
  currentDirectionDeg: number,
  currentSpeedKnots: number,
): number {
  const diff = angularDifferenceDeg(routeBearingDeg, currentDirectionDeg)
  return currentSpeedKnots * Math.cos(toRadians(diff))
}

function calculateWavePenaltyKnots(
  stwKnots: number,
  routeBearingDeg: number,
  weather: WeatherPoint,
): number {
  const waveHeightPenalty = Math.max(0, weather.waveHeightMeters - 1.2) * 0.12
  const swellPenalty = Math.max(0, weather.swellHeightMeters - 0.8) * 0.05
  const relativeWave = angularDifferenceDeg(routeBearingDeg, weather.waveDirectionDeg)
  const headingMultiplier =
    relativeWave > 135 ? 1.35 : relativeWave > 65 ? 0.85 : 0.35
  const windPenalty = Math.max(0, weather.windSpeedKnots - 18) * 0.01

  return Math.min(
    stwKnots * 0.35,
    stwKnots * (waveHeightPenalty + swellPenalty + windPenalty) * headingMultiplier,
  )
}

function calculateRiskScore(weather: WeatherPoint): number {
  return Math.min(
    100,
    Math.round(
      weather.beaufortScale * 7 +
        Math.max(0, weather.waveHeightMeters - 2) * 11 +
        Math.max(0, weather.swellHeightMeters - 1) * 7 +
        Math.max(0, weather.windSpeedKnots - 20) * 1.4,
    ),
  )
}

export function getNearestWeatherPoint(
  coord: [number, number],
  weatherPoints: WeatherPoint[],
): WeatherPoint | null {
  if (weatherPoints.length === 0) return null

  let nearest = weatherPoints[0]
  let minDistance = haversineNm(coord, [nearest.lat, nearest.lng])

  for (const weatherPoint of weatherPoints) {
    const distance = haversineNm(coord, [weatherPoint.lat, weatherPoint.lng])
    if (distance < minDistance) {
      minDistance = distance
      nearest = weatherPoint
    }
  }

  return nearest
}

export function calculateFuelPerDay(
  stwKnots: number,
  condition: 'Ballast' | 'Laden',
  beaufortScale: number,
  waveHeightMeters = 1,
): number {
  const baseFuel =
    condition === 'Ballast'
      ? BASE_FUEL_MT_PER_DAY_BALLAST
      : BASE_FUEL_MT_PER_DAY_LADEN

  const speedFactor = Math.pow(stwKnots / DESIGN_SPEED_KTS, 3)
  const weatherResistanceFactor =
    1 +
    Math.max(0, (beaufortScale - 3) * 0.035) +
    Math.max(0, waveHeightMeters - 2) * 0.025

  return baseFuel * speedFactor * weatherResistanceFactor
}

export function calculateVoyage(
  waypoints: [number, number][],
  weatherPoints: WeatherPoint[],
  inputs: VesselInputs,
): VoyageResult {
  const legs: VoyageLeg[] = []
  let totalDistanceNm = 0
  let totalEtaHours = 0
  let totalFuelMT = 0
  let ecaFuelMT = 0
  let nonEcaFuelMT = 0
  let maxBeaufort = 0
  let worstLegIndex = 0
  let galeLegsCount = 0
  let affectedStart = -1
  let affectedEnd = -1

  const departureDate = new Date(inputs.departureDateISO)

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index]
    const to = waypoints[index + 1]
    const midLat = (from[0] + to[0]) / 2
    const midLng = (from[1] + to[1]) / 2
    const weather =
      getNearestWeatherPoint(from, weatherPoints) ?? getDefaultWeather(from[0], from[1])

    const bearingDeg = calculateBearingDeg(from, to)
    const speedLossFactor = getSpeedLossFactor(weather.beaufortScale)
    const currentComponentKnots = calculateCurrentComponentKnots(
      bearingDeg,
      weather.currentDirectionDeg,
      weather.currentSpeedKnots,
    )
    const wavePenaltyKnots = calculateWavePenaltyKnots(
      inputs.stwKnots,
      bearingDeg,
      weather,
    )
    const sogKnots = Math.max(
      inputs.stwKnots * (1 - speedLossFactor) - wavePenaltyKnots + currentComponentKnots,
      MIN_SOG_KTS,
    )
    const speedLossPercent = ((inputs.stwKnots - sogKnots) / inputs.stwKnots) * 100
    const distanceNm = haversineNm(from, to)
    const etaHours = distanceNm / sogKnots

    const fuelPerDay = calculateFuelPerDay(
      inputs.stwKnots,
      inputs.condition,
      weather.beaufortScale,
      weather.waveHeightMeters,
    )
    const calmFuelPerDay = calculateFuelPerDay(inputs.stwKnots, inputs.condition, 3, 1)
    const legFuelMT = fuelPerDay * (etaHours / 24)
    const calmLegFuelMT = calmFuelPerDay * (distanceNm / inputs.stwKnots / 24)
    const weatherFuelDeltaMT = Math.max(0, legFuelMT - calmLegFuelMT)
    const riskScore = calculateRiskScore(weather)

    if (isInECA(midLat, midLng)) {
      ecaFuelMT += legFuelMT
    } else {
      nonEcaFuelMT += legFuelMT
    }

    if (weather.beaufortScale > maxBeaufort) {
      maxBeaufort = weather.beaufortScale
      worstLegIndex = index
    }

    if (weather.beaufortScale >= 6) {
      galeLegsCount += 1
      if (affectedStart === -1) affectedStart = index
      affectedEnd = index
    }

    legs.push({
      index,
      fromCoord: from,
      toCoord: to,
      distanceNm,
      bearingDeg,
      weather,
      stwKnots: inputs.stwKnots,
      sogKnots,
      speedLossPercent,
      currentComponentKnots,
      wavePenaltyKnots,
      riskScore,
      etaHours,
      fuelConsumptionMT: legFuelMT,
      weatherFuelDeltaMT,
      isAlerted: weather.beaufortScale >= 6 || weather.waveHeightMeters >= 3.5,
    })

    totalDistanceNm += distanceNm
    totalEtaHours += etaHours
    totalFuelMT += legFuelMT
  }

  const calmEtaHours = totalDistanceNm / inputs.stwKnots
  const calmFuelMT =
    calculateFuelPerDay(inputs.stwKnots, inputs.condition, 3, 1) * (calmEtaHours / 24)
  const weatherExtraFuelMT = Math.max(0, totalFuelMT - calmFuelMT)
  const ecaFuelCostUSD = ecaFuelMT * inputs.lsmgoPriceUSDPerMT
  const nonEcaFuelCostUSD = nonEcaFuelMT * inputs.lsfoPriceUSDPerMT
  const totalFuelCostUSD = ecaFuelCostUSD + nonEcaFuelCostUSD
  const co2CostUSD = totalFuelMT * CO2_FACTOR * inputs.co2PriceUSDPerMT
  const totalCo2EmissionsMT = totalFuelMT * CO2_FACTOR
  const totalCostUSD = totalFuelCostUSD + co2CostUSD + inputs.canalDuesUSD
  const weatherCostImpactUSD =
    weatherExtraFuelMT * inputs.lsfoPriceUSDPerMT +
    Math.max(0, totalEtaHours - calmEtaHours) * 450

  const arrivalDate = new Date(departureDate.getTime() + totalEtaHours * 3600 * 1000)
  const laycandDate = new Date(inputs.laycandDateISO)
  const laycandMissed = arrivalDate > laycandDate
  const delayHours = laycandMissed
    ? (arrivalDate.getTime() - laycandDate.getTime()) / (3600 * 1000)
    : 0
  const galeRiskPercent =
    waypoints.length > 1 ? (galeLegsCount / (waypoints.length - 1)) * 100 : 0

  return {
    totalDistanceNm,
    totalEtaDays: totalEtaHours / 24,
    totalEtaHours,
    calmEtaHours,
    weatherDelayHours: Math.max(0, totalEtaHours - calmEtaHours),
    averageSogKnots: totalDistanceNm / totalEtaHours,
    totalFuelMT,
    calmFuelMT,
    weatherExtraFuelMT,
    totalCo2EmissionsMT,
    ecaFuelMT,
    nonEcaFuelMT,
    totalCostUSD,
    fuelCostUSD: totalFuelCostUSD,
    co2CostUSD,
    canalDuesUSD: inputs.canalDuesUSD,
    weatherCostImpactUSD,
    ecaFuelCostUSD,
    nonEcaFuelCostUSD,
    laycandMissed,
    delayHours,
    maxBeaufort,
    galeRiskPercent,
    worstLegIndex,
    affectedWaypointStart: affectedStart,
    affectedWaypointEnd: affectedEnd,
    legs,
    arrivalDate,
  }
}

export function generateDetourRoute(
  originalWaypoints: [number, number][],
): [number, number][] {
  return originalWaypoints.map(([lat, lng]) => {
    if (lat > 5 && lat < 20 && lng > 55 && lng < 80) {
      return [lat - 8, lng]
    }

    return [lat, lng]
  })
}

export function hasDetourDifference(
  originalWaypoints: [number, number][],
  detourWaypoints: [number, number][],
): boolean {
  return detourWaypoints.some(
    (waypoint, index) =>
      waypoint[0] !== originalWaypoints[index]?.[0] ||
      waypoint[1] !== originalWaypoints[index]?.[1],
  )
}

export function calculateDetourSavings(
  originalResult: VoyageResult,
  detourWaypoints: [number, number][],
  detourWeatherPoints: WeatherPoint[],
  inputs: VesselInputs,
  detourVoyageResult?: VoyageResult,
): DetourResult {
  const detourResult =
    detourVoyageResult ??
    calculateVoyage(detourWaypoints, detourWeatherPoints, inputs)

  const originalFuelCost =
    originalResult.ecaFuelCostUSD + originalResult.nonEcaFuelCostUSD
  const detourFuelCost =
    detourResult.ecaFuelCostUSD + detourResult.nonEcaFuelCostUSD
  const netSavingUSD = originalResult.totalCostUSD - detourResult.totalCostUSD

  return {
    detourWaypoints,
    extraDistanceNm: Math.abs(
      detourResult.totalDistanceNm - originalResult.totalDistanceNm,
    ),
    extraDays: Math.abs(detourResult.totalEtaDays - originalResult.totalEtaDays),
    maxBeaufortOnDetour: detourResult.maxBeaufort,
    galeRiskOnDetour: detourResult.galeRiskPercent,
    weatherCostSavingUSD: Math.max(netSavingUSD, 0),
    extraFuelCostUSD: Math.max(detourFuelCost - originalFuelCost, 0),
    netSavingUSD,
    isWorthTaking: netSavingUSD > 0,
  }
}

export function recommendSpeedAdjustment(
  voyageResult: VoyageResult,
  currentSTW: number,
): SpeedRecommendation | null {
  if (!voyageResult.laycandMissed || currentSTW <= 0) return null

  const recoverableHours = Math.max(voyageResult.totalEtaHours - voyageResult.delayHours, 1)
  const requiredSTW = (voyageResult.totalEtaHours / recoverableHours) * currentSTW
  const recommendedSTW = Math.min(Math.max(requiredSTW + 0.2, currentSTW + 0.2), 14)
  const extraFuelMT =
    voyageResult.totalFuelMT * (Math.pow(recommendedSTW / currentSTW, 3) - 1)
  const extraCostUSD = extraFuelMT * 650

  return {
    recommendedSTW: Math.round(recommendedSTW * 10) / 10,
    extraFuelMT: Math.round(extraFuelMT * 10) / 10,
    extraCostUSD: Math.round(extraCostUSD),
    message: `Increase speed to ${recommendedSTW.toFixed(1)} kn to recover about ${voyageResult.delayHours.toFixed(0)} hrs delay (+$${Math.round(extraCostUSD).toLocaleString('en-US')} fuel cost).`,
  }
}
