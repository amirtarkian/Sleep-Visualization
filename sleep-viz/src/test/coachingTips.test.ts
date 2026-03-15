import { describe, it, expect } from 'vitest'
import { generateTips } from '../lib/coachingTips'
import { makeScore, makeSession } from './testUtils'

describe('generateTips', () => {
  it('returns empty array for empty sessions', () => {
    expect(generateTips([])).toEqual([])
  })

  it('generates "Low Deep Sleep" tip when deepPercent < 10% for 3+ nights', () => {
    const sessions = Array.from({ length: 3 }, (_, i) =>
      makeSession({
        nightDate: `2024-01-${15 + i}`,
        deepPercent: 8,
      })
    )
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'low-deep-sleep')).toBe(true)
    const tip = tips.find(t => t.id === 'low-deep-sleep')!
    expect(tip.title).toBe('Low Deep Sleep')
    expect(tip.type).toBe('warning')
    expect(tip.priority).toBe(1)
  })

  it('does NOT generate "Low Deep Sleep" when only 2 nights below 10%', () => {
    const sessions = [
      makeSession({ deepPercent: 8 }),
      makeSession({ deepPercent: 8 }),
      makeSession({ deepPercent: 20 }),
    ]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'low-deep-sleep')).toBe(false)
  })

  it('generates "Low Sleep Efficiency" tip when latest efficiency < 85%', () => {
    const sessions = [makeSession({ sleepEfficiency: 80 })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'low-efficiency')).toBe(true)
    const tip = tips.find(t => t.id === 'low-efficiency')!
    expect(tip.title).toBe('Sleep Efficiency Below Target')
    expect(tip.type).toBe('warning')
  })

  it('does NOT generate efficiency tip when efficiency >= 85%', () => {
    const sessions = [makeSession({ sleepEfficiency: 90 })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'low-efficiency')).toBe(false)
  })

  it('generates "Slow Sleep Onset" tip when latency > 30 min', () => {
    const sessions = [makeSession({ sleepLatency: 45 })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'high-latency')).toBe(true)
    const tip = tips.find(t => t.id === 'high-latency')!
    expect(tip.title).toBe('Taking Too Long to Fall Asleep')
    expect(tip.type).toBe('warning')
  })

  it('does NOT generate latency tip when latency <= 30 min', () => {
    const sessions = [makeSession({ sleepLatency: 30 })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'high-latency')).toBe(false)
  })

  it('generates "Possible Sleep Debt" tip when latency < 5 min', () => {
    const sessions = [makeSession({ sleepLatency: 3 })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'sleep-debt')).toBe(true)
    const tip = tips.find(t => t.id === 'sleep-debt')!
    expect(tip.title).toBe('Possible Sleep Debt')
    expect(tip.type).toBe('warning')
    expect(tip.priority).toBe(3)
  })

  it('does NOT generate sleep debt tip when latency >= 5 min', () => {
    const sessions = [makeSession({ sleepLatency: 5 })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'sleep-debt')).toBe(false)
  })

  it('generates positive "Excellent Sleep" tip when score >= 85', () => {
    const sessions = [makeSession({ score: makeScore({ overall: 90 }) })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'great-score')).toBe(true)
    const tip = tips.find(t => t.id === 'great-score')!
    expect(tip.title).toBe('Excellent Sleep!')
    expect(tip.type).toBe('positive')
    expect(tip.priority).toBe(10)
  })

  it('does NOT generate positive tip when score < 85', () => {
    const sessions = [makeSession({ score: makeScore({ overall: 80 }) })]
    const tips = generateTips(sessions)
    expect(tips.some(t => t.id === 'great-score')).toBe(false)
  })

  it('returns at most 3 tips, sorted by priority', () => {
    // Trigger multiple tips: low deep sleep (3 nights), low efficiency, high latency, sleep debt
    // Actually sleep debt and high latency are mutually exclusive (latency can't be both > 30 and < 5)
    // So trigger: low deep (priority 1), low efficiency (priority 2), high latency (priority 2)
    const sessions = Array.from({ length: 3 }, () =>
      makeSession({
        deepPercent: 5,
        sleepEfficiency: 70,
        sleepLatency: 45,
        score: makeScore({ overall: 60 }),
      })
    )
    const tips = generateTips(sessions)
    expect(tips.length).toBeLessThanOrEqual(3)
    // Should be sorted by priority (ascending)
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i].priority).toBeGreaterThanOrEqual(tips[i - 1].priority)
    }
  })

  it('prioritizes higher priority (lower number) tips when more than 3 are generated', () => {
    // Generate: low deep sleep (1), declining trend (1), low efficiency (2), high latency (2)
    // That needs 6+ sessions for declining trend
    const sessions = [
      // First 3: high scores
      ...Array.from({ length: 3 }, (_, i) =>
        makeSession({
          nightDate: `2024-01-${10 + i}`,
          deepPercent: 5,
          sleepEfficiency: 70,
          sleepLatency: 45,
          score: makeScore({ overall: 85 }),
        })
      ),
      // Last 3: low scores (triggers declining trend)
      ...Array.from({ length: 3 }, (_, i) =>
        makeSession({
          nightDate: `2024-01-${13 + i}`,
          deepPercent: 5,
          sleepEfficiency: 70,
          sleepLatency: 45,
          score: makeScore({ overall: 60 }),
        })
      ),
    ]
    const tips = generateTips(sessions)
    expect(tips.length).toBe(3)
    // Priority 1 tips should come first
    expect(tips[0].priority).toBe(1)
  })
})
