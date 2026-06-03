import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { VoyageMap } from './components/Map/VoyageMap'
import { DetourPanel } from './components/Panels/DetourPanel'
import { ResultsPanel } from './components/Panels/ResultsPanel'
import { VesselInputPanel } from './components/Panels/VesselInputPanel'
import { WeatherAlertPanel } from './components/Panels/WeatherAlertPanel'
import { ROUTES } from './data/routes'
import {
  fetchRouteWeather,
  generateSimulatedWeather,
} from './services/weatherService'
import type {
  DetourResult,
  VesselInputs,
  VoyageResult,
  WeatherMode,
  WeatherPoint,
} from './types'
import {
  calculateDetourSavings,
  calculateVoyage,
  generateDetourRoute,
  hasDetourDifference,
  recommendSpeedAdjustment,
} from './utils/physics'

const DEFAULT_INPUTS: VesselInputs = {
  stwKnots: 12,
  condition: 'Ballast',
  dwtTons: 50000,
  draftMeters: 12,
  bunkerOnBoardMT: 934,
  lsfoPriceUSDPerMT: 650,
  lsmgoPriceUSDPerMT: 850,
  co2PriceUSDPerMT: 80,
  canalDuesUSD: 230000,
  departureDateISO: '2026-06-10',
  laycandDateISO: '2026-07-08',
  selectedRoute: 'route2',
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function ExecutiveStrip({
  result,
  detour,
  weatherMode,
}: {
  result: VoyageResult | null
  detour: DetourResult | null
  weatherMode: WeatherMode
}) {
  if (!result) return null

  return (
    <div className="executive-strip" aria-label="Executive voyage summary">
      <div>
        <span>Weather Delay</span>
        <strong>{result.weatherDelayHours.toFixed(0)} hrs</strong>
      </div>
      <div>
        <span>Avg SOG</span>
        <strong>{result.averageSogKnots.toFixed(1)} kn</strong>
      </div>
      <div>
        <span>Extra Fuel</span>
        <strong>{result.weatherExtraFuelMT.toFixed(0)} MT</strong>
      </div>
      <div>
        <span>Weather Cost</span>
        <strong>{formatUsd(result.weatherCostImpactUSD)}</strong>
      </div>
      <div>
        <span>Best Action</span>
        <strong>{detour?.isWorthTaking ? 'Take detour' : 'Maintain route'}</strong>
      </div>
      <div>
        <span>Data</span>
        <strong>{weatherMode === 'live' ? 'Live API' : 'Demo model'}</strong>
      </div>
    </div>
  )
}

export default function App() {
  const [inputs, setInputs] = useState<VesselInputs>(DEFAULT_INPUTS)
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('simulated')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [weatherPoints, setWeatherPoints] = useState<WeatherPoint[]>([])
  const [voyageResult, setVoyageResult] = useState<VoyageResult | null>(null)
  const [detourResult, setDetourResult] = useState<DetourResult | null>(null)
  const [detourWeatherPoints, setDetourWeatherPoints] = useState<WeatherPoint[]>([])
  const [detourVoyageResult, setDetourVoyageResult] = useState<VoyageResult | null>(null)
  const [useDetour, setUseDetour] = useState(false)
  const hasAutoCalculated = useRef(false)

  const selectedRoute = ROUTES[inputs.selectedRoute]

  const clearAnalysis = useCallback(() => {
    setUseDetour(false)
    setWeatherPoints([])
    setVoyageResult(null)
    setDetourResult(null)
    setDetourWeatherPoints([])
    setDetourVoyageResult(null)
  }, [])

  const handleInputsChange = useCallback(
    (nextInputs: VesselInputs) => {
      const routeChanged = nextInputs.selectedRoute !== inputs.selectedRoute
      setInputs(nextInputs)
      if (routeChanged) {
        clearAnalysis()
      }
    },
    [clearAnalysis, inputs.selectedRoute],
  )

  const handleWeatherModeChange = useCallback(
    (mode: WeatherMode) => {
      setWeatherMode(mode)
      clearAnalysis()
    },
    [clearAnalysis],
  )

  const activeWaypoints = useMemo(
    () =>
      useDetour && detourResult
        ? detourResult.detourWaypoints
        : selectedRoute.waypoints,
    [detourResult, selectedRoute.waypoints, useDetour],
  )

  const activeWeatherPoints = useMemo(
    () =>
      useDetour && detourWeatherPoints.length > 0
        ? detourWeatherPoints
        : weatherPoints,
    [detourWeatherPoints, useDetour, weatherPoints],
  )

  const activeVoyageResult = useMemo(
    () => (useDetour && detourVoyageResult ? detourVoyageResult : voyageResult),
    [detourVoyageResult, useDetour, voyageResult],
  )

  const loadWeather = useCallback(
    async (waypoints: [number, number][]) => {
      if (weatherMode === 'live') {
        return fetchRouteWeather(waypoints, setLoadingProgress)
      }

      setLoadingProgress(35)
      const simulated = generateSimulatedWeather(waypoints)
      setLoadingProgress(100)
      return simulated
    },
    [weatherMode],
  )

  const handleCalculate = useCallback(async () => {
    setIsLoading(true)
    setUseDetour(false)
    setLoadingProgress(0)
    setDetourResult(null)
    setDetourWeatherPoints([])
    setDetourVoyageResult(null)

    try {
      const route = ROUTES[inputs.selectedRoute]
      const baseWeather = await loadWeather(route.waypoints)
      setWeatherPoints(baseWeather)

      const baseVoyageResult = calculateVoyage(route.waypoints, baseWeather, inputs)
      setVoyageResult(baseVoyageResult)

      if (baseVoyageResult.maxBeaufort >= 6) {
        const detourWaypoints = generateDetourRoute(route.waypoints)

        if (hasDetourDifference(route.waypoints, detourWaypoints)) {
          const detourWeather = await loadWeather(detourWaypoints)
          const detourVoyage = calculateVoyage(detourWaypoints, detourWeather, inputs)
          const detourComparison = calculateDetourSavings(
            baseVoyageResult,
            detourWaypoints,
            detourWeather,
            inputs,
            detourVoyage,
          )

          setDetourWeatherPoints(detourWeather)
          setDetourVoyageResult(detourVoyage)
          setDetourResult(detourComparison)
        }
      }
    } catch (error) {
      console.error('Voyage calculation failed.', error)
    } finally {
      setLoadingProgress(100)
      setIsLoading(false)
    }
  }, [inputs, loadWeather])

  const speedRecommendation = activeVoyageResult
    ? recommendSpeedAdjustment(activeVoyageResult, inputs.stwKnots)
    : null



  return (
    <div className="app">
      <Header />

      <div className="main-layout">
        <aside className="sidebar-left">
          <VesselInputPanel
            inputs={inputs}
            weatherMode={weatherMode}
            onChange={handleInputsChange}
            onWeatherModeChange={handleWeatherModeChange}
            onCalculate={handleCalculate}
            isLoading={isLoading}
          />

          <WeatherAlertPanel
            result={activeVoyageResult}
            speedRecommendation={speedRecommendation}
            isDetourActive={useDetour}
          />

          {detourResult && (
            <DetourPanel
              detour={detourResult}
              isAccepted={useDetour}
              onAcceptDetour={() => setUseDetour(true)}
            />
          )}
        </aside>

        <main className="map-container">
          <ExecutiveStrip
            result={activeVoyageResult}
            detour={detourResult}
            weatherMode={weatherMode}
          />

          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <div>Fetching weather data... {loadingProgress}%</div>
            </div>
          )}

          <VoyageMap
            waypoints={activeWaypoints}
            detourWaypoints={useDetour ? undefined : detourResult?.detourWaypoints}
            weatherPoints={activeWeatherPoints}
            legs={activeVoyageResult?.legs ?? []}
            mapCenter={selectedRoute.mapCenter}
            mapZoom={selectedRoute.mapZoom}
            originName={selectedRoute.from}
            destinationName={selectedRoute.to}
          />
        </main>

        <aside className="sidebar-right">
          <ResultsPanel
            result={activeVoyageResult}
            routeName={
              useDetour ? `${selectedRoute.name} | Detour Active` : selectedRoute.name
            }
            bunkerOnBoardMT={inputs.bunkerOnBoardMT}
            laycandDateISO={inputs.laycandDateISO}
          />
        </aside>
      </div>
    </div>
  )
}
