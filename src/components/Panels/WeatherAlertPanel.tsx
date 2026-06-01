import type { SpeedRecommendation, VoyageResult } from '../../types'
import { beaufortToDescription } from '../../utils/beaufort'

interface WeatherAlertPanelProps {
  result: VoyageResult | null
  speedRecommendation: SpeedRecommendation | null
  isDetourActive?: boolean
}

export function WeatherAlertPanel({
  result,
  speedRecommendation,
  isDetourActive = false,
}: WeatherAlertPanelProps) {
  if (!result || result.maxBeaufort < 6) return null

  const startWp = result.affectedWaypointStart >= 0 ? result.affectedWaypointStart + 1 : 0
  const endWp = result.affectedWaypointEnd >= 0 ? result.affectedWaypointEnd + 1 : 0

  return (
    <div className="alert-panel danger-panel">
      <div className="alert-header">
        Weather Alert - {isDetourActive ? 'Accepted Detour' : 'Main Route'}
      </div>

      <div className="alert-body">
        <div>High-risk weather corridor detected on the active route.</div>
        <div>
          Gale risk {result.galeRiskPercent.toFixed(1)}% | Max BF {result.maxBeaufort} (
          {beaufortToDescription(result.maxBeaufort)})
        </div>
        <div>
          Affected waypoints: WP{startWp} to WP{endWp}
        </div>
      </div>

      {result.laycandMissed && (
        <div className="laycan-miss">
          Laycan at risk: projected delay {result.delayHours.toFixed(0)} hrs.
        </div>
      )}

      {speedRecommendation && (
        <div className="speed-recommendation">{speedRecommendation.message}</div>
      )}
    </div>
  )
}
