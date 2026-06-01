export const BEAUFORT_SPEED_LOSS_FACTORS: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0.01,
  4: 0.03,
  5: 0.07,
  6: 0.12,
  7: 0.18,
  8: 0.25,
  9: 0.33,
  10: 0.4,
  11: 0.5,
  12: 0.6,
}

export function getSpeedLossFactor(beaufortScale: number): number {
  const bf = Math.min(Math.max(0, Math.round(beaufortScale)), 12)
  return BEAUFORT_SPEED_LOSS_FACTORS[bf] ?? 0
}

export function windSpeedKnotsToBeaufort(knots: number): number {
  if (knots < 1) return 0
  if (knots < 4) return 1
  if (knots < 7) return 2
  if (knots < 11) return 3
  if (knots < 17) return 4
  if (knots < 22) return 5
  if (knots < 28) return 6
  if (knots < 34) return 7
  if (knots < 41) return 8
  if (knots < 48) return 9
  if (knots < 56) return 10
  if (knots < 64) return 11
  return 12
}

export function beaufortToDescription(bf: number): string {
  const descriptions: Record<number, string> = {
    0: 'Calm',
    1: 'Light Air',
    2: 'Light Breeze',
    3: 'Gentle Breeze',
    4: 'Moderate Breeze',
    5: 'Fresh Breeze',
    6: 'Strong Breeze',
    7: 'Near Gale',
    8: 'Gale',
    9: 'Severe Gale',
    10: 'Storm',
    11: 'Violent Storm',
    12: 'Hurricane',
  }

  return descriptions[Math.min(Math.max(0, Math.round(bf)), 12)] ?? 'Unknown'
}

export function beaufortToColor(bf: number): string {
  if (bf <= 3) return '#00ff88'
  if (bf <= 5) return '#ffdd00'
  if (bf <= 7) return '#ff8800'
  return '#ff3333'
}
