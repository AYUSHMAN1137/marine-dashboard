export interface WeatherPoint {
  lat: number
  lng: number
  windSpeedKnots: number
  windDirectionDeg: number
  waveHeightMeters: number
  waveDirectionDeg: number
  swellHeightMeters: number
  currentSpeedKnots: number
  currentDirectionDeg: number
  beaufortScale: number
  isHighRisk: boolean
  dataSource: 'simulated' | 'open-meteo' | 'fallback'
}

export interface VoyageLeg {
  index: number
  fromCoord: [number, number]
  toCoord: [number, number]
  distanceNm: number
  bearingDeg: number
  weather: WeatherPoint
  stwKnots: number
  sogKnots: number
  speedLossPercent: number
  currentComponentKnots: number
  wavePenaltyKnots: number
  riskScore: number
  etaHours: number
  fuelConsumptionMT: number
  weatherFuelDeltaMT: number
  isAlerted: boolean
}

export interface VoyageResult {
  totalDistanceNm: number
  totalEtaDays: number
  totalEtaHours: number
  calmEtaHours: number
  weatherDelayHours: number
  averageSogKnots: number
  totalFuelMT: number
  calmFuelMT: number
  weatherExtraFuelMT: number
  totalCo2EmissionsMT: number
  ecaFuelMT: number
  nonEcaFuelMT: number
  totalCostUSD: number
  fuelCostUSD: number
  co2CostUSD: number
  canalDuesUSD: number
  weatherCostImpactUSD: number
  ecaFuelCostUSD: number
  nonEcaFuelCostUSD: number
  laycandMissed: boolean
  delayHours: number
  maxBeaufort: number
  galeRiskPercent: number
  worstLegIndex: number
  affectedWaypointStart: number
  affectedWaypointEnd: number
  legs: VoyageLeg[]
  arrivalDate: Date
}

export interface DetourResult {
  detourWaypoints: [number, number][]
  extraDistanceNm: number
  extraDays: number
  maxBeaufortOnDetour: number
  galeRiskOnDetour: number
  weatherCostSavingUSD: number
  extraFuelCostUSD: number
  netSavingUSD: number
  isWorthTaking: boolean
}

export interface SpeedRecommendation {
  recommendedSTW: number
  extraFuelMT: number
  extraCostUSD: number
  message: string
}

export interface VesselInputs {
  stwKnots: number
  condition: 'Ballast' | 'Laden'
  dwtTons: number
  draftMeters: number
  bunkerOnBoardMT: number
  lsfoPriceUSDPerMT: number
  lsmgoPriceUSDPerMT: number
  co2PriceUSDPerMT: number
  canalDuesUSD: number
  departureDateISO: string
  laycandDateISO: string
  selectedRoute: 'route1' | 'route2'
}

export type WeatherMode = 'simulated' | 'live'

export interface RouteData {
  id: 'route1' | 'route2'
  name: string
  from: string
  to: string
  waypoints: [number, number][]
  mapCenter: [number, number]
  mapZoom: number
}
