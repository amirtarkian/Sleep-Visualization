export const STAGE_COLORS = {
  awake: '#ef4444',
  rem: '#a78bfa',
  core: '#60a5fa',
  deep: '#1e40af',
} as const

export const SCORE_THRESHOLDS = {
  optimal: { min: 85, color: '#22c55e', label: 'Optimal' },
  good: { min: 70, color: '#3b82f6', label: 'Good' },
  fair: { min: 55, color: '#eab308', label: 'Fair' },
  needsImprovement: { min: 0, color: '#ef4444', label: 'Needs Improvement' },
} as const

export function getScoreInfo(score: number) {
  if (score >= 85) return SCORE_THRESHOLDS.optimal
  if (score >= 70) return SCORE_THRESHOLDS.good
  if (score >= 55) return SCORE_THRESHOLDS.fair
  return SCORE_THRESHOLDS.needsImprovement
}

export const READINESS_COLORS = { ring: '#f59e0b' } as const

export const SCORE_WEIGHT_LABELS = [
  { key: 'duration', label: 'Duration', weight: '30%' },
  { key: 'efficiency', label: 'Efficiency', weight: '15%' },
  { key: 'deepSleep', label: 'Deep Sleep', weight: '12%' },
  { key: 'rem', label: 'REM Sleep', weight: '10%' },
  { key: 'latency', label: 'Latency', weight: '8%' },
  { key: 'waso', label: 'WASO', weight: '8%' },
  { key: 'timing', label: 'Timing', weight: '8%' },
  { key: 'restoration', label: 'Restoration', weight: '9%' },
] as const

export const SCORE_WEIGHTS = {
  duration: 0.30,
  efficiency: 0.15,
  deepSleep: 0.12,
  rem: 0.10,
  latency: 0.08,
  waso: 0.08,
  timing: 0.08,
  restoration: 0.09,
} as const

export const SCORE_WEIGHTS_FALLBACK = {
  duration: 0.40,
  efficiency: 0.25,
  latency: 0.10,
  waso: 0.10,
  timing: 0.08,
  restoration: 0.07,
} as const

export const STAGE_ORDER = ['awake', 'rem', 'core', 'deep'] as const

export const GAP_MERGE_THRESHOLD_MS = 3 * 60 * 60 * 1000 // 3 hours
export const NIGHT_CUTOFF_HOUR = 6 // before 6AM = previous night

export const SOURCE_PRIORITY: Record<string, number> = {
  'Apple Watch': 3,
  'iPhone': 2,
}
export const DEFAULT_SOURCE_PRIORITY = 1
