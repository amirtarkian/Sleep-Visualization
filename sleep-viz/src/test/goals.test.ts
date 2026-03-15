import { describe, it, expect } from 'vitest'
import {
  checkDurationGoalMet,
  checkScoreGoalMet,
  checkBedtimeGoalMet,
  computeStreak,
  computeOptimalBedtime,
} from '../lib/goals'
import { makeScore, makeSession } from './testUtils'

describe('checkDurationGoalMet', () => {
  it('returns true when totalSleepTime >= target', () => {
    const session = makeSession({ totalSleepTime: 480 })
    expect(checkDurationGoalMet(session, 480)).toBe(true)
    expect(checkDurationGoalMet(session, 420)).toBe(true)
  })

  it('returns false when totalSleepTime < target', () => {
    const session = makeSession({ totalSleepTime: 360 })
    expect(checkDurationGoalMet(session, 420)).toBe(false)
  })
})

describe('checkScoreGoalMet', () => {
  it('returns true when score.overall >= target', () => {
    const session = makeSession({ score: makeScore({ overall: 80 }) })
    expect(checkScoreGoalMet(session, 75)).toBe(true)
    expect(checkScoreGoalMet(session, 80)).toBe(true)
  })

  it('returns false when score.overall < target', () => {
    const session = makeSession({ score: makeScore({ overall: 70 }) })
    expect(checkScoreGoalMet(session, 75)).toBe(false)
  })
})

describe('checkBedtimeGoalMet', () => {
  it('returns true when bedtime is within the target window', () => {
    // startDate is 23:00 = 23*60 = 1380 minutes from midnight
    const session = makeSession({
      startDate: new Date('2024-01-15T23:00:00'),
    })
    expect(checkBedtimeGoalMet(session, 1350, 1410)).toBe(true) // 22:30 - 23:30
  })

  it('returns false when bedtime is outside the target window', () => {
    // startDate is 23:00 = 1380 min
    const session = makeSession({
      startDate: new Date('2024-01-15T23:00:00'),
    })
    expect(checkBedtimeGoalMet(session, 1200, 1320)).toBe(false) // 20:00 - 22:00
  })

  it('handles bedtimes after midnight (early morning hours)', () => {
    // startDate is 00:30 -> hours=0, minutes=30 -> bedtimeMin = 0*60+30 = 30
    // Since hours < 12, adds 1440: bedtimeMin = 30 + 1440 = 1470
    const session = makeSession({
      startDate: new Date('2024-01-16T00:30:00'),
    })
    expect(checkBedtimeGoalMet(session, 1440, 1500)).toBe(true) // 24:00 - 25:00 (midnight - 1AM)
  })

  it('returns true at exact boundary', () => {
    // startDate is 22:30 = 1350 min
    const session = makeSession({
      startDate: new Date('2024-01-15T22:30:00'),
    })
    expect(checkBedtimeGoalMet(session, 1350, 1380)).toBe(true) // exactly at start
  })
})

describe('computeStreak', () => {
  it('returns 0 for empty sessions', () => {
    expect(computeStreak([], () => true)).toBe(0)
  })

  it('returns count of consecutive passing sessions from the end', () => {
    // 3 passing, then 1 failing, then 2 passing at the end
    const sessions = [
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 300 }), // fails
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 500 }),
    ]
    const streak = computeStreak(sessions, s => s.totalSleepTime >= 420)
    expect(streak).toBe(2)
  })

  it('returns 3 for 3 consecutive passing then 1 fail', () => {
    const sessions = [
      makeSession({ totalSleepTime: 300 }), // fails
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 500 }),
    ]
    const streak = computeStreak(sessions, s => s.totalSleepTime >= 420)
    expect(streak).toBe(3)
  })

  it('returns 0 when the most recent session fails', () => {
    const sessions = [
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 500 }),
      makeSession({ totalSleepTime: 300 }), // most recent fails
    ]
    const streak = computeStreak(sessions, s => s.totalSleepTime >= 420)
    expect(streak).toBe(0)
  })

  it('returns total count when all sessions pass', () => {
    const sessions = Array.from({ length: 5 }, () =>
      makeSession({ totalSleepTime: 500 })
    )
    const streak = computeStreak(sessions, s => s.totalSleepTime >= 420)
    expect(streak).toBe(5)
  })
})

describe('computeOptimalBedtime', () => {
  it('returns null with fewer than 3 sessions', () => {
    const sessions = [makeSession(), makeSession()]
    expect(computeOptimalBedtime(sessions)).toBeNull()
  })

  it('returns a bedtime window with 3+ sessions', () => {
    // All sessions start at 23:00 (1380 minutes from midnight)
    const sessions = Array.from({ length: 3 }, (_, i) =>
      makeSession({
        startDate: new Date(`2024-01-${15 + i}T23:00:00`),
        score: makeScore({ overall: 80 }),
      })
    )
    const result = computeOptimalBedtime(sessions)
    expect(result).not.toBeNull()
    expect(result!.startHour).toBeDefined()
    expect(result!.startMin).toBeDefined()
    expect(result!.endHour).toBeDefined()
    expect(result!.endMin).toBeDefined()
  })

  it('computes bedtime window centered around best-scoring sessions', () => {
    // Top-scoring sessions all start at 22:45 (1365 min from midnight)
    // Window should be +-15 minutes around that: 22:30 - 23:00
    const sessions = [
      // Lower scores
      makeSession({
        startDate: new Date('2024-01-15T21:00:00'),
        score: makeScore({ overall: 50 }),
      }),
      makeSession({
        startDate: new Date('2024-01-16T21:00:00'),
        score: makeScore({ overall: 50 }),
      }),
      makeSession({
        startDate: new Date('2024-01-17T21:00:00'),
        score: makeScore({ overall: 50 }),
      }),
      // Higher scores — these define the optimal window
      makeSession({
        startDate: new Date('2024-01-18T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
      makeSession({
        startDate: new Date('2024-01-19T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
      makeSession({
        startDate: new Date('2024-01-20T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
      makeSession({
        startDate: new Date('2024-01-21T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
      makeSession({
        startDate: new Date('2024-01-22T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
      makeSession({
        startDate: new Date('2024-01-23T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
      makeSession({
        startDate: new Date('2024-01-24T22:45:00'),
        score: makeScore({ overall: 90 }),
      }),
    ]
    const result = computeOptimalBedtime(sessions)
    expect(result).not.toBeNull()
    // The start should be around 22:30 and end around 23:00
    expect(result!.startHour).toBe(22)
    expect(result!.startMin).toBe(30)
    expect(result!.endHour).toBe(23)
    expect(result!.endMin).toBe(0)
  })

  it('handles sessions with 7+ entries properly', () => {
    const sessions = Array.from({ length: 7 }, (_, i) =>
      makeSession({
        startDate: new Date(`2024-01-${15 + i}T23:00:00`),
        score: makeScore({ overall: 70 + i }),
      })
    )
    const result = computeOptimalBedtime(sessions)
    expect(result).not.toBeNull()
    // All start at 23:00, so optimal window should be around 22:45 - 23:15
    expect(result!.startHour).toBe(22)
    expect(result!.startMin).toBe(45)
    expect(result!.endHour).toBe(23)
    expect(result!.endMin).toBe(15)
  })
})
