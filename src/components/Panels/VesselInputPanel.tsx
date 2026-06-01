import type { VesselInputs } from '../../types'

interface VesselInputPanelProps {
  inputs: VesselInputs
  onChange: (inputs: VesselInputs) => void
  onCalculate: () => void
  isLoading: boolean
}

function numberOrFallback(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

export function VesselInputPanel({
  inputs,
  onChange,
  onCalculate,
  isLoading,
}: VesselInputPanelProps) {
  const update = <K extends keyof VesselInputs>(key: K, value: VesselInputs[K]) =>
    onChange({ ...inputs, [key]: value })

  return (
    <div className="panel">
      <div className="panel-title">
        <span className="dot green" />
        Vessel And Voyage Inputs
      </div>

      <div className="input-group">
        <label htmlFor="route">Route</label>
        <select
          id="route"
          value={inputs.selectedRoute}
          onChange={(event) =>
            update('selectedRoute', event.target.value as VesselInputs['selectedRoute'])
          }
        >
          <option value="route1">Rotterdam to Singapore (Cape)</option>
          <option value="route2">Rotterdam to Singapore (Suez)</option>
        </select>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label htmlFor="speed">Speed (kn)</label>
          <input
            id="speed"
            type="number"
            min="8"
            max="16"
            step="0.5"
            value={inputs.stwKnots}
            onChange={(event) =>
              update('stwKnots', numberOrFallback(event.target.valueAsNumber, inputs.stwKnots))
            }
          />
        </div>

        <div className="input-group">
          <label htmlFor="condition">Condition</label>
          <select
            id="condition"
            value={inputs.condition}
            onChange={(event) =>
              update('condition', event.target.value as VesselInputs['condition'])
            }
          >
            <option value="Ballast">Ballast</option>
            <option value="Laden">Laden</option>
          </select>
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label htmlFor="dwt">DWT (MT)</label>
          <input
            id="dwt"
            type="number"
            value={inputs.dwtTons}
            onChange={(event) =>
              update('dwtTons', numberOrFallback(event.target.valueAsNumber, inputs.dwtTons))
            }
          />
        </div>

        <div className="input-group">
          <label htmlFor="draft">Draft (m)</label>
          <input
            id="draft"
            type="number"
            step="0.5"
            value={inputs.draftMeters}
            onChange={(event) =>
              update(
                'draftMeters',
                numberOrFallback(event.target.valueAsNumber, inputs.draftMeters),
              )
            }
          />
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="bunker">Bunker On Board (MT)</label>
        <input
          id="bunker"
          type="number"
          value={inputs.bunkerOnBoardMT}
          onChange={(event) =>
            update(
              'bunkerOnBoardMT',
              numberOrFallback(event.target.valueAsNumber, inputs.bunkerOnBoardMT),
            )
          }
        />
      </div>

      <div className="input-group">
        <label htmlFor="departure">Departure Date</label>
        <input
          id="departure"
          type="date"
          value={inputs.departureDateISO}
          onChange={(event) => update('departureDateISO', event.target.value)}
        />
      </div>

      <div className="input-group">
        <label htmlFor="laycan">Laycan Date</label>
        <input
          id="laycan"
          type="date"
          value={inputs.laycandDateISO}
          onChange={(event) => update('laycandDateISO', event.target.value)}
        />
      </div>

      <button
        type="button"
        className={`btn-calculate ${isLoading ? 'loading' : ''}`}
        onClick={onCalculate}
        disabled={isLoading}
      >
        {isLoading ? 'Fetching Weather...' : 'Calculate Voyage'}
      </button>

      <div className="input-note">
        Demo mode uses sampled route weather and performance physics for instant analysis.
      </div>
    </div>
  )
}
