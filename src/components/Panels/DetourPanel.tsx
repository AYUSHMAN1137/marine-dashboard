import type { DetourResult } from '../../types'

interface DetourPanelProps {
  detour: DetourResult | null
  onAcceptDetour: () => void
  isAccepted: boolean
}

function formatUsd(value: number): string {
  const prefix = value < 0 ? '-$' : '$'
  return `${prefix}${Math.round(Math.abs(value)).toLocaleString('en-US')}`
}

export function DetourPanel({
  detour,
  onAcceptDetour,
  isAccepted,
}: DetourPanelProps) {
  if (!detour) return null

  return (
    <div className="alert-panel success-panel">
      <div className="alert-header">Suggested Detour</div>

      <div className="alert-body">
        <div>8 degree south deviation to bypass the monsoon corridor.</div>
        <div>
          +{Math.round(detour.extraDistanceNm)} nm | +{detour.extraDays.toFixed(1)} days
        </div>
        <div>Gale risk on detour: {detour.galeRiskOnDetour.toFixed(1)}%</div>
        <div>Max BF on detour: BF {detour.maxBeaufortOnDetour}</div>
        <div>Weather cost saving: {formatUsd(detour.weatherCostSavingUSD)}</div>
        <div className="net-saving">
          Net impact after fuel delta: {formatUsd(detour.netSavingUSD)}
        </div>
      </div>

      <button
        type="button"
        className="btn-accept-detour"
        onClick={onAcceptDetour}
        disabled={isAccepted}
      >
        {isAccepted ? 'Detour Active' : 'Accept Detour Route'}
      </button>
    </div>
  )
}
