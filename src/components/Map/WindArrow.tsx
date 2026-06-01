import { useMemo } from 'react'
import L from 'leaflet'
import { Marker } from 'react-leaflet'
import type { WeatherPoint } from '../../types'

interface WindArrowProps {
  point: WeatherPoint
}

function createWindIcon(directionDeg: number, color: string) {
  return L.divIcon({
    className: 'wind-arrow-icon',
    html: `<div style="transform: rotate(${directionDeg}deg); color: ${color};">▲</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export function WindArrow({ point }: WindArrowProps) {
  const icon = useMemo(
    () =>
      createWindIcon(
        point.windDirectionDeg,
        point.isHighRisk ? '#ff8c00' : '#7fd9ff',
      ),
    [point.isHighRisk, point.windDirectionDeg],
  )

  return <Marker position={[point.lat, point.lng]} icon={icon} interactive={false} />
}
