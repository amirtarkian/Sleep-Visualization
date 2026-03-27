import { describe, it, expect } from 'vitest'
import { computeInsights } from '../lib/insights'
import type { SleepSession, SleepScore } from '../providers/types'

function makeSession(overrides: Partial<SleepSession> & { nightDate: string }): SleepSession {
  const defaults: SleepSession = {
    id: overrides.nightDate,
    nightDate: overrides.nightDate,
    startDate: new Date(`${overrides.nightDate}T23:00:00`),
    endDate: new Date(`${overrides.nightDate}T07:00:00`),
    stages: [],
    score: { overall: 75, duration: 80, efficiency: 85, deepSleep: 70, rem: 70, latency: 80, waso: 80, timing: 90, restoration: 75, isFallback: false },
    sourceName: 'Apple Watch',
    sourceNames: ['Apple Watch'],
    timeInBed: 480,
    totalSleepTime: 450,
    sleepEfficiency: 93,
    sleepLatency: 12,
    waso: 15,
    deepMinutes: 80,
    remMinutes: 90,
    coreMinutes: 250,
    awakeMinutes: 30,
    deepPercent: 18,
    remPercent: 20,
    corePercent: 55,
    awakePercent: 7,
    avgHeartRate: 62,
    minHeartRate: 52,
    avgHrv: 45,
    avgSpo2: 96.5,
    avgRespiratoryRate: 14,
  }
  return { ...defaults, ...overrides, score: { ...defaults.score, ...(overrides.score || {}) } } as SleepSession
}

function makeDateRange(startDate: string, count: number): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

describe('computeInsights', () => {
  it('returns empty array for fewer than 7 sessions', () => {
    const sessions = makeDateRange('2026-01-01', 5).map(d => makeSession({ nightDate: d }))
    expect(computeInsights(sessions)).toEqual([])
  })

  it('returns at most 5 insights', () => {
    const sessions = makeDateRange('2026-01-01', 30).map((d, i) =>
      makeSession({
        nightDate: d,
        startDate: new Date(`${d}T${i % 3 === 0 ? '23:00' : '01:00'}:00`),
        score: { overall: 50 + (i % 3 === 0 ? 30 : 0) } as SleepScore,
        avgHrv: 30 + i * 0.5,
        minHeartRate: 60 - i * 0.3,
      })
    )
    const insights = computeInsights(sessions)
    expect(insights.length).toBeLessThanOrEqual(5)
    expect(insights.length).toBeGreaterThan(0)
  })

  it('detects bedtime correlation when early bedtime scores higher', () => {
    const sessions = makeDateRange('2026-01-01', 30).map((d, i) => {
      const isEarly = i % 2 === 0
      return makeSession({
        nightDate: d,
        startDate: new Date(`${d}T${isEarly ? '22:00' : '01:00'}:00`),
        score: { overall: isEarly ? 85 : 60 } as SleepScore,
      })
    })
    const insights = computeInsights(sessions)
    const bedtime = insights.find(i => i.id === 'corr-bedtime')
    expect(bedtime).toBeDefined()
    expect(bedtime!.category).toBe('correlation')
  })

  it('detects weekend effect on deep sleep', () => {
    const sessions = makeDateRange('2026-01-05', 28).map(d => {
      const day = new Date(d).getDay()
      const isWeekend = day === 5 || day === 6
      return makeSession({
        nightDate: d,
        deepPercent: isWeekend ? 8 : 20,
      })
    })
    const insights = computeInsights(sessions)
    const weekend = insights.find(i => i.id === 'pat-weekend-deep')
    expect(weekend).toBeDefined()
    expect(weekend!.category).toBe('pattern')
  })

  it('detects sleep streak', () => {
    const sessions = makeDateRange('2026-01-01', 14).map(d =>
      makeSession({ nightDate: d, score: { overall: 80 } as SleepScore })
    )
    const insights = computeInsights(sessions)
    const streak = insights.find(i => i.id === 'pat-streak')
    expect(streak).toBeDefined()
    expect(streak!.description).toContain('14-night streak')
  })

  it('detects HRV trend', () => {
    const sessions = makeDateRange('2026-01-01', 14).map((d, i) =>
      makeSession({ nightDate: d, avgHrv: 30 + i * 2 })
    )
    const insights = computeInsights(sessions)
    const hrv = insights.find(i => i.id === 'bio-hrv')
    expect(hrv).toBeDefined()
    expect(hrv!.direction).toBe('positive')
  })

  it('detects low SpO2', () => {
    const sessions = makeDateRange('2026-01-01', 14).map(d =>
      makeSession({ nightDate: d, avgSpo2: 93 })
    )
    const insights = computeInsights(sessions)
    const spo2 = insights.find(i => i.id === 'bio-spo2-low')
    expect(spo2).toBeDefined()
    expect(spo2!.direction).toBe('negative')
  })

  it('detects bounce-back recovery pattern', () => {
    const sessions = makeDateRange('2026-01-01', 20).map((d, i) =>
      makeSession({
        nightDate: d,
        score: { overall: i % 2 === 0 ? 50 : 80 } as SleepScore,
      })
    )
    const insights = computeInsights(sessions)
    const recovery = insights.find(i => i.id === 'pat-recovery')
    expect(recovery).toBeDefined()
  })

  it('all insights have required fields', () => {
    const sessions = makeDateRange('2026-01-01', 30).map((d, i) =>
      makeSession({
        nightDate: d,
        score: { overall: 50 + i } as SleepScore,
        avgHrv: 30 + i,
      })
    )
    const insights = computeInsights(sessions)
    for (const insight of insights) {
      expect(insight.id).toBeTruthy()
      expect(['correlation', 'pattern', 'biometric']).toContain(insight.category)
      expect(insight.title).toBeTruthy()
      expect(insight.description).toBeTruthy()
      expect(insight.significance).toBeGreaterThan(0)
      expect(insight.significance).toBeLessThanOrEqual(1)
      expect(['positive', 'negative', 'neutral']).toContain(insight.direction)
    }
  })
})
