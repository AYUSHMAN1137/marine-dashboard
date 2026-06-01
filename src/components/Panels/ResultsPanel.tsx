import type { VoyageResult } from '../../types'

interface ResultsPanelProps {
  result: VoyageResult | null
  routeName: string
  bunkerOnBoardMT: number
  laycandDateISO: string
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function formatMt(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} MT`
}

export function ResultsPanel({
  result,
  routeName,
  bunkerOnBoardMT,
  laycandDateISO,
}: ResultsPanelProps) {
  if (!result) {
    return (
      <div className="panel">
        <div className="panel-title">
          <span className="dot cyan" />
          Voyage Results
        </div>
        <div className="placeholder-text">
          Configure vessel details and click Calculate Voyage to see ETA, bunker,
          cost, and weather risk.
        </div>
      </div>
    )
  }

  const totalBunkerCost = result.ecaFuelCostUSD + result.nonEcaFuelCostUSD
  const bunkerMargin = bunkerOnBoardMT - result.totalFuelMT
  const worstLeg = result.legs[result.worstLegIndex]
  const laycanDate = new Date(laycandDateISO)

  return (
    <div className="panel">
      <div className="panel-title">
        <span className="dot cyan" />
        Voyage Results
      </div>

      <div className="panel-subtitle">{routeName}</div>

      <div className="total-cost">
        <div className="total-cost-label">Total Voyage Cost</div>
        <div className="total-cost-value">{formatUsd(result.totalCostUSD)}</div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Distance</div>
          <div className="stat-value">{Math.round(result.totalDistanceNm).toLocaleString()} nm</div>
        </div>
        <div className="stat">
          <div className="stat-label">Voyage Days</div>
          <div className="stat-value">{result.totalEtaDays.toFixed(1)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Max Beaufort</div>
          <div className={`stat-value ${result.maxBeaufort >= 6 ? 'danger' : 'safe'}`}>
            BF {result.maxBeaufort}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Gale Risk</div>
          <div className={`stat-value ${result.galeRiskPercent >= 10 ? 'danger' : 'safe'}`}>
            {result.galeRiskPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="section-divider" />

      <div className="fuel-breakdown">
        <div className="fuel-row">
          <span>ECA Fuel (LSMGO)</span>
          <span>{formatMt(result.ecaFuelMT)}</span>
          <span className="danger">{formatUsd(result.ecaFuelCostUSD)}</span>
        </div>
        <div className="fuel-row">
          <span>Non-ECA Fuel (LSFO)</span>
          <span>{formatMt(result.nonEcaFuelMT)}</span>
          <span>{formatUsd(result.nonEcaFuelCostUSD)}</span>
        </div>
        <div className="fuel-row total-row">
          <span>Total Bunker</span>
          <span>{formatMt(result.totalFuelMT)}</span>
          <span>{formatUsd(totalBunkerCost)}</span>
        </div>
      </div>

      <div className="section-divider" />

      <div className="eta-box">
        <div className="eta-label">Estimated Arrival</div>
        <div className="eta-value">
          {result.arrivalDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}{' '}
          |{' '}
          {result.arrivalDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
          })}{' '}
          UTC
        </div>
      </div>

      <div className="section-divider" />

      <div className="mini-metric">
        <span>Laycan Deadline</span>
        <strong>
          {laycanDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </strong>
      </div>
      <div className="mini-metric">
        <span>Laycan Status</span>
        <strong className={result.laycandMissed ? 'danger' : 'safe'}>
          {result.laycandMissed
            ? `Miss by ${result.delayHours.toFixed(0)} hrs`
            : 'On track'}
        </strong>
      </div>
      <div className="mini-metric">
        <span>CO2 Exposure</span>
        <strong>{Math.round(result.totalCo2EmissionsMT).toLocaleString('en-US')} MT</strong>
      </div>
      <div className="mini-metric">
        <span>CO2 Cost</span>
        <strong>{formatUsd(result.co2CostUSD)}</strong>
      </div>

      <div className="section-divider" />

      <div className="insight-card">
        <div className="eta-label">Worst Weather Impact</div>
        <div className="insight-text">
          At {worstLeg.stwKnots.toFixed(1)} kn STW, the worst leg drops to{' '}
          {worstLeg.sogKnots.toFixed(1)} kn SOG due to BF{' '}
          {worstLeg.weather.beaufortScale} weather.
        </div>
        <div className="insight-subtext">
          Speed loss {worstLeg.speedLossPercent.toFixed(1)}% | Wave{' '}
          {worstLeg.weather.waveHeightMeters.toFixed(1)} m | Fuel on leg{' '}
          {worstLeg.fuelConsumptionMT.toFixed(1)} MT
        </div>
      </div>

      <div className="section-divider" />

      <div className="mini-metric">
        <span>Bunker On Board</span>
        <strong>{formatMt(bunkerOnBoardMT)}</strong>
      </div>
      <div className="mini-metric">
        <span>Bunker Margin</span>
        <strong className={bunkerMargin >= 0 ? 'safe' : 'danger'}>
          {Math.round(bunkerMargin).toLocaleString('en-US')} MT
        </strong>
      </div>
    </div>
  )
}
