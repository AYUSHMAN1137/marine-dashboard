export function haversineNm(
  point1: [number, number],
  point2: [number, number],
): number {
  const earthRadiusNm = 3440.065
  const lat1 = (point1[0] * Math.PI) / 180
  const lat2 = (point2[0] * Math.PI) / 180
  const dLat = ((point2[0] - point1[0]) * Math.PI) / 180
  const dLng = ((point2[1] - point1[1]) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusNm * c
}

export function totalRouteDistanceNm(waypoints: [number, number][]): number {
  let total = 0
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    total += haversineNm(waypoints[index], waypoints[index + 1])
  }
  return total
}
