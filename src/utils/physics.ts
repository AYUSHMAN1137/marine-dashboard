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

const LSFO_PRICE_PER_MT_USD = 650
const LSMGO_PRICE_PER_MT_USD = 850
const BASE_FUEL_MT_PER_DAY_BALLAST = 23.5
const BASE_FUEL_MT_PER_DAY_LADEN = 26.5
const DESIGN_SPEED_KTS = 12
const CO2_FACTOR = 3.1144
const CO2_PRICE_PER_MT_USD = 80
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
    swellHeightMeters: 0.5,
    beaufortScale: 3,
    isHighRisk: false,
  }
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
): number {
  const baseFuel =
    condition === 'Ballast'
      ? BASE_FUEL_MT_PER_DAY_BALLAST
      : BASE_FUEL_MT_PER_DAY_LADEN

  const speedFactor = Math.pow(stwKnots / DESIGN_SPEED_KTS, 3)
  const weatherResistanceFactor = 1 + Math.max(0, (beaufortScale - 3) * 0.03)

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

    const speedLossFactor = getSpeedLossFactor(weather.beaufortScale)
    const sogKnots = Math.max(inputs.stwKnots * (1 - speedLossFactor), MIN_SOG_KTS)
    const speedLossPercent = ((inputs.stwKnots - sogKnots) / inputs.stwKnots) * 100
    const distanceNm = haversineNm(from, to)
    const etaHours = distanceNm / sogKnots

    const fuelPerDay = calculateFuelPerDay(
      inputs.stwKnots,
      inputs.condition,
      weather.beaufortScale,
    )
    const legFuelMT = fuelPerDay * (etaHours / 24)

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
      weather,
      stwKnots: inputs.stwKnots,
      sogKnots,
      speedLossPercent,
      etaHours,
      fuelConsumptionMT: legFuelMT,
      isAlerted: weather.beaufortScale >= 6,
    })

    totalDistanceNm += distanceNm
    totalEtaHours += etaHours
    totalFuelMT += legFuelMT
  }

  const ecaFuelCostUSD = ecaFuelMT * LSMGO_PRICE_PER_MT_USD
  const nonEcaFuelCostUSD = nonEcaFuelMT * LSFO_PRICE_PER_MT_USD
  const totalFuelCostUSD = ecaFuelCostUSD + nonEcaFuelCostUSD
  const co2CostUSD = totalFuelMT * CO2_FACTOR * CO2_PRICE_PER_MT_USD
  const totalCo2EmissionsMT = totalFuelMT * CO2_FACTOR
  const totalCostUSD = totalFuelCostUSD + co2CostUSD

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
    totalFuelMT,
    totalCo2EmissionsMT,
    ecaFuelMT,
    nonEcaFuelMT,
    totalCostUSD,
    co2CostUSD,
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
  const extraCostUSD = extraFuelMT * LSFO_PRICE_PER_MT_USD

  return {
    recommendedSTW: Math.round(recommendedSTW * 10) / 10,
    extraFuelMT: Math.round(extraFuelMT * 10) / 10,
    extraCostUSD: Math.round(extraCostUSD),
    message: `Increase speed to ${recommendedSTW.toFixed(1)} kn to recover about ${voyageResult.delayHours.toFixed(0)} hrs delay (+$${Math.round(extraCostUSD).toLocaleString('en-US')} fuel cost).`,
  }
}
