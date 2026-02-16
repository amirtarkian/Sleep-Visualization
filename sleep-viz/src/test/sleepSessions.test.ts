import { describe, it, expect } from 'vitest'
import { getNightDate, parseAppleHealthDate, circularMeanTime } from '../lib/dateUtils'

describe('getNightDate', () => {
  it('returns same day for evening bedtime', () => {
    const date = new Date('2024-01-15T23:30:00')
    expect(getNightDate(date)).toBe('2024-01-15')
  })

  it('returns previous day for after-midnight bedtime', () => {
    const date = new Date('2024-01-16T01:30:00')
    expect(getNightDate(date)).toBe('2024-01-15')
  })

  it('returns same day for bedtime at exactly 6AM', () => {
    const date = new Date('2024-01-15T06:00:00')
    expect(getNightDate(date)).toBe('2024-01-15')
  })

  it('returns previous day for bedtime at 5:59AM', () => {
    const date = new Date('2024-01-15T05:59:00')
    expect(getNightDate(date)).toBe('2024-01-14')
  })
})

describe('parseAppleHealthDate', () => {
  it('parses standard Apple Health format', () => {
    const date = parseAppleHealthDate('2024-12-01 23:15:00 -0600')
    expect(date).toBeInstanceOf(Date)
    expect(date.getTime()).not.toBeNaN()
  })

  it('handles positive timezone offset', () => {
    const date = parseAppleHealthDate('2024-06-15 08:30:00 +0530')
    expect(date).toBeInstanceOf(Date)
    expect(date.getTime()).not.toBeNaN()
  })

  it('falls back for non-standard format', () => {
    const date = parseAppleHealthDate('2024-01-15T23:00:00Z')
    expect(date).toBeInstanceOf(Date)
  })
})

describe('circularMeanTime', () => {
  it('computes mean of similar times', () => {
    // 11PM and 1AM should average to midnight
    const mean = circularMeanTime([-60, 60]) // -60 = 11PM, 60 = 1AM
    expect(Math.abs(mean)).toBeLessThan(30) // close to midnight
  })

  it('returns 0 for empty array', () => {
    expect(circularMeanTime([])).toBe(0)
  })
})
