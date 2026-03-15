import type { SleepSession, SleepScore } from '../providers/types'

/** Build a minimal SleepScore with overrides. */
export function makeScore(overrides: Partial<SleepScore> = {}): SleepScore {
  return {
    overall: 75,
    duration: 80,
    efficiency: 80,
    deepSleep: 80,
    rem: 80,
    latency: 80,
    waso: 80,
    timing: 0,
    restoration: 0,
    isFallback: false,
    ...overrides,
  }
}

/** Build a minimal SleepSession with overrides. */
export function makeSession(overrides: Partial<SleepSession> = {}): SleepSession {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 8),
    nightDate: '2024-01-15',
    startDate: new Date('2024-01-15T23:00:00'),
    endDate: new Date('2024-01-16T07:00:00'),
    stages: [],
    score: makeScore(),
    sourceName: 'Apple Watch',
    sourceNames: ['Apple Watch'],
    timeInBed: 480,
    totalSleepTime: 450,
    sleepEfficiency: 90,
    sleepLatency: 10,
    waso: 15,
    deepMinutes: 90,
    remMinutes: 90,
    coreMinutes: 240,
    awakeMinutes: 30,
    deepPercent: 20,
    remPercent: 20,
    corePercent: 53,
    awakePercent: 7,
    avgHeartRate: null,
    minHeartRate: null,
    avgHrv: null,
    avgSpo2: null,
    avgRespiratoryRate: null,
    ...overrides,
  }
}
