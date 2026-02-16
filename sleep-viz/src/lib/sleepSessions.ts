import type { SleepStageInterval, SleepSession, BiometricRecord } from '../providers/types'
import { GAP_MERGE_THRESHOLD_MS } from './constants'
import { getNightDate } from './dateUtils'
import { computeSessionStats } from './statistics'
import { computeSleepScore } from './sleepScore'
import { computeBiometricSummary, filterBiometricsForSession } from './biometrics'
import { deduplicateIntervals } from './deduplication'

interface RawSleepRecord {
  type: string // HKCategoryValueSleepAnalysis...
  startDate: Date
  endDate: Date
  sourceName: string
  value?: string
}

const STAGE_MAP: Record<string, SleepStageInterval['stage']> = {
  'HKCategoryValueSleepAnalysisAsleepDeep': 'deep',
  'HKCategoryValueSleepAnalysisAsleepCore': 'core',
  'HKCategoryValueSleepAnalysisAsleepREM': 'rem',
  'HKCategoryValueSleepAnalysisAwake': 'awake',
  'HKCategoryValueSleepAnalysisAsleepUnspecified': 'core',
  'HKCategoryValueSleepAnalysisInBed': 'awake',
}

/**
 * Group raw sleep records into sessions (merge gaps < 3hr).
 */
export function groupIntoSessions(
  records: RawSleepRecord[],
  biometricRecords: BiometricRecord[],
): SleepSession[] {
  if (records.length === 0) return []

  // Convert to stage intervals with source info
  const intervals = records
    .filter(r => STAGE_MAP[r.value ?? r.type])
    .map(r => ({
      stage: STAGE_MAP[r.value ?? r.type],
      startDate: r.startDate,
      endDate: r.endDate,
      sourceName: r.sourceName,
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  if (intervals.length === 0) return []

  // Group by proximity (< 3hr gap)
  const groups: Array<typeof intervals> = [[intervals[0]]]
  for (let i = 1; i < intervals.length; i++) {
    const lastGroup = groups[groups.length - 1]
    const lastEnd = Math.max(...lastGroup.map(iv => iv.endDate.getTime()))
    const gap = intervals[i].startDate.getTime() - lastEnd

    if (gap < GAP_MERGE_THRESHOLD_MS) {
      lastGroup.push(intervals[i])
    } else {
      groups.push([intervals[i]])
    }
  }

  // Convert each group to a session
  return groups.map((group, idx) => {
    const deduplicated = deduplicateIntervals(group)
    const sessionStart = new Date(Math.min(...group.map(iv => iv.startDate.getTime())))
    const sessionEnd = new Date(Math.max(...group.map(iv => iv.endDate.getTime())))
    const nightDate = getNightDate(sessionStart)
    const sourceNames = [...new Set(group.map(g => g.sourceName))]
    const primarySource = sourceNames[0] || 'Unknown'
    const id = `import-${nightDate}-${idx}`

    const stats = computeSessionStats(sessionStart, sessionEnd, deduplicated)
    const sessionBio = filterBiometricsForSession(biometricRecords, { startDate: sessionStart, endDate: sessionEnd })
    const bioSummary = computeBiometricSummary(sessionBio)

    const session: SleepSession = {
      id,
      nightDate,
      startDate: sessionStart,
      endDate: sessionEnd,
      stages: deduplicated,
      sourceName: primarySource,
      sourceNames,
      ...stats,
      ...bioSummary,
      score: { overall: 0, duration: 0, efficiency: 0, deepSleep: 0, rem: 0, latency: 0, waso: 0, isFallback: false },
    }

    session.score = computeSleepScore(session)
    return session
  })
}
