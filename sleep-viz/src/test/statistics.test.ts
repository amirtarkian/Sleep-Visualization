import { describe, it, expect } from 'vitest'
import { computeSessionStats } from '../lib/statistics'
import type { SleepStageInterval } from '../providers/types'

// Helper: creates dates that properly cross midnight
function makeDate(dayOffset: number, hours: number, minutes: number = 0): Date {
  const base = new Date('2024-01-15T00:00:00')
  base.setDate(base.getDate() + dayOffset)
  base.setHours(hours, minutes, 0, 0)
  return base
}

describe('computeSessionStats', () => {
  it('computes basic stats from stages', () => {
    const start = makeDate(0, 23, 0) // Jan 15 23:00
    const end = makeDate(1, 7, 0)    // Jan 16 07:00

    const stages: SleepStageInterval[] = [
      { stage: 'awake', startDate: makeDate(0, 23, 0), endDate: makeDate(0, 23, 10) },
      { stage: 'core', startDate: makeDate(0, 23, 10), endDate: makeDate(1, 0, 30) },
      { stage: 'deep', startDate: makeDate(1, 0, 30), endDate: makeDate(1, 2, 0) },
      { stage: 'core', startDate: makeDate(1, 2, 0), endDate: makeDate(1, 4, 0) },
      { stage: 'rem', startDate: makeDate(1, 4, 0), endDate: makeDate(1, 5, 30) },
      { stage: 'core', startDate: makeDate(1, 5, 30), endDate: makeDate(1, 7, 0) },
    ]

    const stats = computeSessionStats(start, end, stages)

    expect(stats.timeInBed).toBe(480)
    expect(stats.sleepLatency).toBe(10)
    expect(stats.deepMinutes).toBe(90)
    expect(stats.remMinutes).toBe(90)
    expect(stats.totalSleepTime).toBeGreaterThan(0)
    expect(stats.sleepEfficiency).toBeGreaterThan(0)
    expect(stats.sleepEfficiency).toBeLessThanOrEqual(100)
  })

  it('handles empty stages gracefully', () => {
    const start = makeDate(0, 23, 0)
    const end = new Date(start.getTime() + 8 * 60 * 60 * 1000)

    const stats = computeSessionStats(start, end, [])

    expect(stats.timeInBed).toBe(480)
    expect(stats.totalSleepTime).toBeGreaterThan(0) // estimated
    expect(stats.sleepEfficiency).toBe(85) // default
    expect(stats.deepMinutes).toBe(0)
    expect(stats.remMinutes).toBe(0)
  })

  it('computes WASO correctly', () => {
    const start = makeDate(0, 23, 0)  // Jan 15 23:00
    const end = makeDate(1, 7, 0)     // Jan 16 07:00

    const stages: SleepStageInterval[] = [
      { stage: 'core', startDate: makeDate(0, 23, 0), endDate: makeDate(1, 1, 0) },
      { stage: 'awake', startDate: makeDate(1, 1, 0), endDate: makeDate(1, 1, 15) }, // 15 min WASO
      { stage: 'deep', startDate: makeDate(1, 1, 15), endDate: makeDate(1, 3, 0) },
      { stage: 'awake', startDate: makeDate(1, 3, 0), endDate: makeDate(1, 3, 5) }, // 5 min WASO
      { stage: 'rem', startDate: makeDate(1, 3, 5), endDate: makeDate(1, 7, 0) },
    ]

    const stats = computeSessionStats(start, end, stages)
    expect(stats.waso).toBe(20) // 15 + 5
  })
})
