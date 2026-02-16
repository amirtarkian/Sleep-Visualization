export const STAGE_COLORS = {
  awake: '#ef4444',
  rem: '#a78bfa',
  core: '#60a5fa',
  deep: '#1e40af',
} as const

export const SCORE_THRESHOLDS = {
  excellent: { min: 90, color: '#22c55e', label: 'Excellent' },
  good: { min: 75, color: '#3b82f6', label: 'Good' },
  fair: { min: 60, color: '#eab308', label: 'Fair' },
  poor: { min: 40, color: '#f97316', label: 'Poor' },
  veryPoor: { min: 0, color: '#ef4444', label: 'Very Poor' },
} as const

export function getScoreInfo(score: number) {
  if (score >= 90) return SCORE_THRESHOLDS.excellent
  if (score >= 75) return SCORE_THRESHOLDS.good
  if (score >= 60) return SCORE_THRESHOLDS.fair
  if (score >= 40) return SCORE_THRESHOLDS.poor
  return SCORE_THRESHOLDS.veryPoor
}

export const SCORE_WEIGHTS = {
  duration: 0.25,
  efficiency: 0.20,
  deepSleep: 0.20,
  rem: 0.15,
  latency: 0.10,
  waso: 0.10,
} as const

export const SCORE_WEIGHTS_FALLBACK = {
  duration: 0.35,
  efficiency: 0.30,
  latency: 0.15,
  waso: 0.20,
} as const

export const STAGE_ORDER = ['awake', 'rem', 'core', 'deep'] as const

export const GAP_MERGE_THRESHOLD_MS = 3 * 60 * 60 * 1000 // 3 hours
export const NIGHT_CUTOFF_HOUR = 6 // before 6AM = previous night

export const SOURCE_PRIORITY: Record<string, number> = {
  'Apple Watch': 3,
  'iPhone': 2,
}
export const DEFAULT_SOURCE_PRIORITY = 1
