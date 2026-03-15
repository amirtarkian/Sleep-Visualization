import { describe, it, expect } from 'vitest'
import { generateWeeklyReport, generateMonthlyReport } from '../lib/reports'
import { makeScore, makeSession } from './testUtils'

describe('generateWeeklyReport', () => {
  it('returns sensible defaults for empty sessions', () => {
    const report = generateWeeklyReport([])
    expect(report.avgScore).toBe(0)
    expect(report.avgDuration).toBe(0)
    expect(report.bestNight).toBeNull()
    expect(report.worstNight).toBeNull()
    expect(report.trendDirection).toBe('stable')
    expect(report.insights).toEqual([])
    expect(report.recommendations).toEqual([])
    expect(report.weeklyBreakdown).toEqual([])
  })

  it('computes average score and duration', () => {
    const sessions = [
      makeSession({ score: makeScore({ overall: 80 }), totalSleepTime: 480 }),
      makeSession({ score: makeScore({ overall: 70 }), totalSleepTime: 420 }),
      makeSession({ score: makeScore({ overall: 90 }), totalSleepTime: 540 }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.avgScore).toBe(80)
    expect(report.avgDuration).toBe(480)
  })

  it('identifies best and worst nights', () => {
    const sessions = [
      makeSession({ id: 'worst', score: makeScore({ overall: 50 }) }),
      makeSession({ id: 'middle', score: makeScore({ overall: 75 }) }),
      makeSession({ id: 'best', score: makeScore({ overall: 95 }) }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.bestNight).not.toBeNull()
    expect(report.bestNight!.id).toBe('best')
    expect(report.worstNight).not.toBeNull()
    expect(report.worstNight!.id).toBe('worst')
  })

  it('generates insights and recommendations', () => {
    const sessions = [
      makeSession({ totalSleepTime: 350, sleepEfficiency: 80, deepPercent: 10 }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.insights.length).toBeGreaterThan(0)
    expect(report.recommendations.length).toBeGreaterThan(0)
  })

  it('uses only last 7 sessions for weekly report', () => {
    // Create 10 sessions: first 3 have low scores, last 7 have high scores
    const sessions = [
      ...Array.from({ length: 3 }, () =>
        makeSession({ score: makeScore({ overall: 30 }), totalSleepTime: 300 })
      ),
      ...Array.from({ length: 7 }, () =>
        makeSession({ score: makeScore({ overall: 80 }), totalSleepTime: 480 })
      ),
    ]
    const report = generateWeeklyReport(sessions)
    // The weekly report should only use the last 7, all scoring 80
    expect(report.avgScore).toBe(80)
    expect(report.avgDuration).toBe(480)
  })
})

describe('generateMonthlyReport', () => {
  it('returns sensible defaults for empty sessions', () => {
    const report = generateMonthlyReport([])
    expect(report.avgScore).toBe(0)
    expect(report.avgDuration).toBe(0)
    expect(report.bestNight).toBeNull()
    expect(report.worstNight).toBeNull()
    expect(report.trendDirection).toBe('stable')
  })

  it('computes weekly breakdown for sessions across multiple weeks', () => {
    // Sessions across 2 weeks (Monday 2024-01-15 and Monday 2024-01-22)
    const sessions = [
      makeSession({
        nightDate: '2024-01-15',
        score: makeScore({ overall: 70 }),
        totalSleepTime: 420,
      }),
      makeSession({
        nightDate: '2024-01-16',
        score: makeScore({ overall: 80 }),
        totalSleepTime: 480,
      }),
      makeSession({
        nightDate: '2024-01-22',
        score: makeScore({ overall: 90 }),
        totalSleepTime: 540,
      }),
      makeSession({
        nightDate: '2024-01-23',
        score: makeScore({ overall: 85 }),
        totalSleepTime: 510,
      }),
    ]
    const report = generateMonthlyReport(sessions)
    expect(report.weeklyBreakdown.length).toBe(2)
    // First week: avg score = (70+80)/2 = 75
    expect(report.weeklyBreakdown[0].avgScore).toBe(75)
    expect(report.weeklyBreakdown[0].nightCount).toBe(2)
    // Second week: avg score = (90+85)/2 = 88 (rounded)
    expect(report.weeklyBreakdown[1].avgScore).toBe(88)
    expect(report.weeklyBreakdown[1].nightCount).toBe(2)
  })
})

describe('trend direction', () => {
  it('returns improving when second half scores higher', () => {
    const sessions = [
      makeSession({ score: makeScore({ overall: 60 }) }),
      makeSession({ score: makeScore({ overall: 62 }) }),
      makeSession({ score: makeScore({ overall: 80 }) }),
      makeSession({ score: makeScore({ overall: 82 }) }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.trendDirection).toBe('improving')
  })

  it('returns declining when second half scores lower', () => {
    const sessions = [
      makeSession({ score: makeScore({ overall: 85 }) }),
      makeSession({ score: makeScore({ overall: 83 }) }),
      makeSession({ score: makeScore({ overall: 65 }) }),
      makeSession({ score: makeScore({ overall: 63 }) }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.trendDirection).toBe('declining')
  })

  it('returns stable when scores are similar', () => {
    const sessions = [
      makeSession({ score: makeScore({ overall: 75 }) }),
      makeSession({ score: makeScore({ overall: 76 }) }),
      makeSession({ score: makeScore({ overall: 74 }) }),
      makeSession({ score: makeScore({ overall: 77 }) }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.trendDirection).toBe('stable')
  })

  it('returns stable for fewer than 4 sessions', () => {
    const sessions = [
      makeSession({ score: makeScore({ overall: 50 }) }),
      makeSession({ score: makeScore({ overall: 90 }) }),
    ]
    const report = generateWeeklyReport(sessions)
    expect(report.trendDirection).toBe('stable')
  })
})
