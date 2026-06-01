import { useEffect } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { VoyageLeg, WeatherPoint } from '../../types'
import { beaufortToColor } from '../../utils/beaufort'
import { WindArrow } from './WindArrow'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function coloredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width: 16px; height: 16px; background: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function MapFlyTo({
  points,
}: {
  points: [number, number][]
}) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 5)
      return
    }

    map.fitBounds(points, {
      padding: [40, 40],
      maxZoom: 5,
    })
  }, [map, points])

  return null
}

interface VoyageMapProps {
  waypoints: [number, number][]
  detourWaypoints?: [number, number][]
  weatherPoints: WeatherPoint[]
  legs: VoyageLeg[]
  mapCenter: [number, number]
  mapZoom: number
  originName: string
  destinationName: string
}

export function VoyageMap({
  waypoints,
  detourWaypoints,
  weatherPoints,
  legs,
  mapCenter,
  mapZoom,
  originName,
  destinationName,
}: VoyageMapProps) {
  const routeLegs =
    legs.length > 0
      ? legs
      : waypoints.slice(0, -1).map((fromCoord, index) => ({
          index,
          fromCoord,
          toCoord: waypoints[index + 1],
          isAlerted: false,
        }))

  return (
    <div className="voyage-map-shell">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri"
        />

        <MapFlyTo points={waypoints} />

        {waypoints.length > 1 && (
          <Polyline
            positions={waypoints}
            pathOptions={{ color: '#14324f', weight: 5, opacity: 0.6 }}
          />
        )}

        {routeLegs.map((leg) => (
          <Polyline
            key={`leg-${leg.index}`}
            positions={[leg.fromCoord, leg.toCoord]}
            pathOptions={{
              color: leg.isAlerted ? '#ff4d4f' : '#48a7ff',
              weight: leg.isAlerted ? 4 : 3,
              opacity: 0.95,
            }}
          />
        ))}

        {detourWaypoints && detourWaypoints.length > 1 && (
          <Polyline
            positions={detourWaypoints}
            pathOptions={{
              color: '#ff8c00',
              weight: 3,
              opacity: 0.9,
              dashArray: '10 8',
            }}
          />
        )}

        {weatherPoints.map((weatherPoint, index) => (
          <CircleMarker
            key={`weather-${index}`}
            center={[weatherPoint.lat, weatherPoint.lng]}
            radius={weatherPoint.isHighRisk ? 8 : 5}
            pathOptions={{
              color: beaufortToColor(weatherPoint.beaufortScale),
              fillColor: beaufortToColor(weatherPoint.beaufortScale),
              fillOpacity: 0.85,
              weight: 1.25,
            }}
          >
            <Popup>
              <div className="map-popup">
                <strong>Weather Snapshot</strong>
                <div>Wind: {weatherPoint.windSpeedKnots} kn</div>
                <div>Beaufort: BF {weatherPoint.beaufortScale}</div>
                <div>Wave Height: {weatherPoint.waveHeightMeters} m</div>
                <div>Swell Height: {weatherPoint.swellHeightMeters} m</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {weatherPoints.map((weatherPoint, index) => (
          <WindArrow key={`wind-${index}`} point={weatherPoint} />
        ))}

        {waypoints[0] && (
          <Marker position={waypoints[0]} icon={coloredIcon('#00ff88')}>
            <Popup>{originName}</Popup>
          </Marker>
        )}

        {waypoints.length > 1 && (
          <Marker
            position={waypoints[waypoints.length - 1]}
            icon={coloredIcon('#00d4ff')}
          >
            <Popup>{destinationName}</Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="map-legend">
        <div className="legend-kicker">
          {originName} {'->'} {destinationName}
        </div>
        <div className="legend-title">Map Legend</div>
        <div className="legend-item">
          <span className="legend-line legend-main" />
          <span>Main route</span>
        </div>
        <div className="legend-item">
          <span className="legend-line legend-alert" />
          <span>Bad weather segment</span>
        </div>
        <div className="legend-item">
          <span className="legend-line legend-detour" />
          <span>Suggested detour</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-risk" />
          <span>Weather sample node</span>
        </div>
      </div>
    </div>
  )
}
