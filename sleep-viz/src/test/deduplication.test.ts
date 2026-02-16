import { describe, it, expect } from 'vitest'
import { deduplicateIntervals } from '../lib/deduplication'

function makeDate(minutesFromStart: number): Date {
  const base = new Date('2024-01-15T23:00:00')
  return new Date(base.getTime() + minutesFromStart * 60000)
}

describe('deduplicateIntervals', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateIntervals([])).toEqual([])
  })

  it('passes through non-overlapping intervals', () => {
    const intervals = [
      { stage: 'deep' as const, startDate: makeDate(0), endDate: makeDate(60), sourceName: 'Apple Watch' },
      { stage: 'core' as const, startDate: makeDate(60), endDate: makeDate(120), sourceName: 'Apple Watch' },
    ]
    const result = deduplicateIntervals(intervals)
    expect(result).toHaveLength(2)
  })

  it('prefers higher priority source for overlaps', () => {
    const intervals = [
      { stage: 'deep' as const, startDate: makeDate(0), endDate: makeDate(60), sourceName: 'Apple Watch' },
      { stage: 'core' as const, startDate: makeDate(0), endDate: makeDate(60), sourceName: 'iPhone' },
    ]
    const result = deduplicateIntervals(intervals)
    expect(result).toHaveLength(1)
    expect(result[0].stage).toBe('deep') // Apple Watch has higher priority
  })

  it('removes overlapping lower priority intervals', () => {
    const intervals = [
      { stage: 'deep' as const, startDate: makeDate(0), endDate: makeDate(90), sourceName: 'Apple Watch' },
      { stage: 'rem' as const, startDate: makeDate(30), endDate: makeDate(120), sourceName: 'SomeApp' },
    ]
    const result = deduplicateIntervals(intervals)
    expect(result).toHaveLength(1)
    expect(result[0].stage).toBe('deep')
  })

  it('sorts result by start time', () => {
    const intervals = [
      { stage: 'rem' as const, startDate: makeDate(120), endDate: makeDate(180), sourceName: 'Apple Watch' },
      { stage: 'deep' as const, startDate: makeDate(0), endDate: makeDate(60), sourceName: 'Apple Watch' },
      { stage: 'core' as const, startDate: makeDate(60), endDate: makeDate(120), sourceName: 'Apple Watch' },
    ]
    const result = deduplicateIntervals(intervals)
    expect(result).toHaveLength(3)
    expect(result[0].stage).toBe('deep')
    expect(result[1].stage).toBe('core')
    expect(result[2].stage).toBe('rem')
  })
})
