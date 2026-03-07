import { describe, it, expect } from 'vitest'
import { scoreDuration, scoreEfficiency, scoreDeepSleep, scoreRem, scoreLatency, scoreWaso, scoreTiming, scoreRestoration, computeSleepScore } from '../lib/sleepScore'
import { getScoreInfo } from '../lib/constants'

describe('scoreDuration', () => {
  it('returns 100 for ideal range (7-9 hours)', () => {
    expect(scoreDuration(420)).toBe(100) // 7h
    expect(scoreDuration(480)).toBe(100) // 8h
    expect(scoreDuration(540)).toBe(100) // 9h
  })

  it('returns 0 for very short sleep', () => {
    expect(scoreDuration(300)).toBe(0) // 5h
  })

  it('degrades below 7 hours', () => {
    const score = scoreDuration(360) // 6h
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('degrades above 9 hours', () => {
    const score = scoreDuration(600) // 10h
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('returns 0 for very long sleep', () => {
    expect(scoreDuration(660)).toBe(0) // 11h
  })
})

describe('scoreEfficiency', () => {
  it('returns 100 for 85%+', () => {
    expect(scoreEfficiency(85)).toBe(100)
    expect(scoreEfficiency(95)).toBe(100)
  })

  it('returns 0 for 65%', () => {
    expect(scoreEfficiency(65)).toBe(0)
  })

  it('degrades between 65-85%', () => {
    const score = scoreEfficiency(75)
    expect(score).toBe(50)
  })
})

describe('scoreDeepSleep', () => {
  it('returns 100 for ideal range (10-25%)', () => {
    expect(scoreDeepSleep(10)).toBe(100)
    expect(scoreDeepSleep(20)).toBe(100)
    expect(scoreDeepSleep(25)).toBe(100)
  })

  it('degrades below 10%', () => {
    const score = scoreDeepSleep(5)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('degrades above 25%', () => {
    const score = scoreDeepSleep(30)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('returns 0 for 0%', () => {
    expect(scoreDeepSleep(0)).toBe(0)
  })
})

describe('scoreRem', () => {
  it('returns 100 for ideal range (20-25%)', () => {
    expect(scoreRem(20)).toBe(100)
    expect(scoreRem(22)).toBe(100)
    expect(scoreRem(25)).toBe(100)
  })

  it('degrades above 25%', () => {
    const score = scoreRem(30)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('degrades below 20%', () => {
    const score = scoreRem(10)
    expect(score).toBe(50)
  })

  it('returns 0 for 0%', () => {
    expect(scoreRem(0)).toBe(0)
  })
})

describe('scoreLatency', () => {
  it('returns 100 for ideal range (10-20 min)', () => {
    expect(scoreLatency(10)).toBe(100)
    expect(scoreLatency(15)).toBe(100)
    expect(scoreLatency(20)).toBe(100)
  })

  it('returns 70 for very fast latency (<5 min)', () => {
    expect(scoreLatency(0)).toBe(70)
    expect(scoreLatency(4)).toBe(70)
  })

  it('scales 70-100 between 5-10 min', () => {
    const score = scoreLatency(7.5)
    expect(score).toBe(85)
  })

  it('degrades above 20 min', () => {
    const score = scoreLatency(30)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('returns 0 for 45 min', () => {
    expect(scoreLatency(45)).toBe(0)
  })
})

describe('scoreWaso', () => {
  it('returns 100 for <=20 min', () => {
    expect(scoreWaso(0)).toBe(100)
    expect(scoreWaso(10)).toBe(100)
    expect(scoreWaso(20)).toBe(100)
  })

  it('degrades above 20 min', () => {
    const score = scoreWaso(30)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('returns 0 for 60 min', () => {
    expect(scoreWaso(60)).toBe(0)
  })
})

describe('scoreTiming', () => {
  it('returns 100 for midnight to 3AM midpoint', () => {
    expect(scoreTiming(0)).toBe(100)
    expect(scoreTiming(90)).toBe(100)
    expect(scoreTiming(180)).toBe(100)
  })

  it('degrades before midnight', () => {
    expect(scoreTiming(-60)).toBe(75)
  })

  it('degrades after 3AM', () => {
    expect(scoreTiming(240)).toBe(75)
  })

  it('returns 0 for extreme times', () => {
    expect(scoreTiming(-240)).toBe(0)
  })
})

describe('scoreRestoration', () => {
  it('returns 100 for >= 10% HR drop', () => {
    expect(scoreRestoration(60, 70)).toBe(100)
  })

  it('returns 50 for no HR drop', () => {
    expect(scoreRestoration(70, 70)).toBe(50)
  })

  it('returns 50 when resting HR is 0', () => {
    expect(scoreRestoration(60, 0)).toBe(50)
  })

  it('returns 30 for HR rise during sleep', () => {
    expect(scoreRestoration(75, 70)).toBe(30)
  })

  it('scales linearly between 50 and 100', () => {
    expect(scoreRestoration(95, 100)).toBe(75)
  })
})

describe('computeSleepScore', () => {
  it('computes full score with stages', () => {
    const score = computeSleepScore({
      totalSleepTime: 480,
      sleepEfficiency: 92,
      deepPercent: 20,
      remPercent: 25,
      sleepLatency: 10,
      waso: 5,
      stages: [{ stage: 'deep' }],
    })
    expect(score.overall).toBeGreaterThanOrEqual(80)
    expect(score.isFallback).toBe(false)
  })

  it('computes fallback score without stages', () => {
    const score = computeSleepScore({
      totalSleepTime: 480,
      sleepEfficiency: 92,
      deepPercent: 0,
      remPercent: 0,
      sleepLatency: 10,
      waso: 5,
      stages: [],
    })
    expect(score.overall).toBeGreaterThan(0)
    expect(score.isFallback).toBe(true)
    expect(score.deepSleep).toBe(0)
    expect(score.rem).toBe(0)
  })

  it('clamps score between 0 and 100', () => {
    const perfect = computeSleepScore({
      totalSleepTime: 480,
      sleepEfficiency: 100,
      deepPercent: 20,
      remPercent: 25,
      sleepLatency: 15,
      waso: 0,
      stages: [{ stage: 'deep' }],
    })
    expect(perfect.overall).toBeLessThanOrEqual(100)

    const terrible = computeSleepScore({
      totalSleepTime: 120,
      sleepEfficiency: 40,
      deepPercent: 0,
      remPercent: 0,
      sleepLatency: 90,
      waso: 90,
      stages: [{ stage: 'awake' }],
    })
    expect(terrible.overall).toBeGreaterThanOrEqual(0)
  })
})

describe('getScoreInfo', () => {
  it('returns Optimal for score >= 85', () => {
    const info = getScoreInfo(85)
    expect(info.label).toBe('Optimal')
    expect(info.min).toBe(85)

    const info2 = getScoreInfo(100)
    expect(info2.label).toBe('Optimal')
  })

  it('returns Good for score 70-84', () => {
    const info = getScoreInfo(70)
    expect(info.label).toBe('Good')
    expect(info.min).toBe(70)

    const info2 = getScoreInfo(84)
    expect(info2.label).toBe('Good')
  })

  it('returns Fair for score 55-69', () => {
    const info = getScoreInfo(55)
    expect(info.label).toBe('Fair')
    expect(info.min).toBe(55)

    const info2 = getScoreInfo(69)
    expect(info2.label).toBe('Fair')
  })

  it('returns Needs Improvement for score < 55', () => {
    const info = getScoreInfo(54)
    expect(info.label).toBe('Needs Improvement')
    expect(info.min).toBe(0)

    const info2 = getScoreInfo(0)
    expect(info2.label).toBe('Needs Improvement')
  })
})
