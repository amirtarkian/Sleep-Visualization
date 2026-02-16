import type { SleepStageInterval } from '../providers/types'
import { SOURCE_PRIORITY, DEFAULT_SOURCE_PRIORITY } from './constants'

interface SourcedInterval extends SleepStageInterval {
  sourceName: string
}

function getSourcePriority(sourceName: string): number {
  for (const [key, priority] of Object.entries(SOURCE_PRIORITY)) {
    if (sourceName.includes(key)) return priority
  }
  return DEFAULT_SOURCE_PRIORITY
}

/**
 * Sweep-line deduplication: merge overlapping intervals, prefer higher-priority sources.
 */
export function deduplicateIntervals(intervals: SourcedInterval[]): SleepStageInterval[] {
  if (intervals.length === 0) return []

  // Sort by source priority (desc), then start time (asc)
  const sorted = [...intervals].sort((a, b) => {
    const priDiff = getSourcePriority(b.sourceName) - getSourcePriority(a.sourceName)
    if (priDiff !== 0) return priDiff
    return a.startDate.getTime() - b.startDate.getTime()
  })

  const result: SleepStageInterval[] = []
  const accepted: Array<{ start: number; end: number }> = []

  for (const interval of sorted) {
    const start = interval.startDate.getTime()
    const end = interval.endDate.getTime()

    // Check if this interval overlaps with any accepted interval
    let isOverlapping = false
    for (const acc of accepted) {
      if (start < acc.end && end > acc.start) {
        isOverlapping = true
        break
      }
    }

    if (!isOverlapping) {
      result.push({
        stage: interval.stage,
        startDate: interval.startDate,
        endDate: interval.endDate,
      })
      accepted.push({ start, end })
    }
  }

  // Sort result by start time
  return result.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
}
