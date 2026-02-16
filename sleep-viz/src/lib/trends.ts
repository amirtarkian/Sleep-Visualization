import type { SleepSession, TrendData } from '../providers/types'
import { bedtimeMinutes, dateToMinutesFromMidnight, circularMeanTime } from './dateUtils'

export function computeTrends(sessions: SleepSession[]): TrendData {
  if (sessions.length === 0) {
    return {
      dates: [], scores: [], durations: [], efficiencies: [],
      deepPercents: [], remPercents: [], corePercents: [],
      avgBedtimes: [], avgWakeTimes: [],
      sleepDebt: 0, avgScore7d: 0, avgScore30d: 0, sri: 0,
      trendDirection: 'stable',
    }
  }

  const sorted = [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate))

  const dates = sorted.map(s => s.nightDate)
  const scores = sorted.map(s => s.score.overall)
  const durations = sorted.map(s => s.totalSleepTime)
  const efficiencies = sorted.map(s => s.sleepEfficiency)
  const deepPercents = sorted.map(s => s.deepPercent)
  const remPercents = sorted.map(s => s.remPercent)
  const corePercents = sorted.map(s => s.corePercent)

  const bedtimes = sorted.map(s => bedtimeMinutes(s.startDate))
  const wakeTimes = sorted.map(s => dateToMinutesFromMidnight(s.endDate))

  // Rolling averages
  const last7 = sorted.slice(-7)
  const last30 = sorted.slice(-30)
  const avgScore7d = last7.reduce((sum, s) => sum + s.score.overall, 0) / last7.length
  const avgScore30d = last30.reduce((sum, s) => sum + s.score.overall, 0) / last30.length

  // Sleep debt: hours below 8hr target over last 14 nights
  const last14 = sorted.slice(-14)
  const sleepDebt = last14.reduce((debt, s) => debt + Math.max(0, 480 - s.totalSleepTime) / 60, 0)

  // SRI (Sleep Regularity Index): standard deviation of bedtimes
  const bedtimeMean = circularMeanTime(bedtimes.slice(-14))
  const bedtimeVariance = bedtimes.slice(-14).reduce((sum, t) => {
    const diff = t - bedtimeMean
    return sum + diff * diff
  }, 0) / Math.max(bedtimes.slice(-14).length, 1)
  const sri = Math.sqrt(bedtimeVariance)

  // Trend direction: simple linear regression on last 14 scores
  const recentScores = scores.slice(-14)
  const trendDirection = computeTrendDirection(recentScores)

  return {
    dates, scores, durations, efficiencies,
    deepPercents, remPercents, corePercents,
    avgBedtimes: bedtimes, avgWakeTimes: wakeTimes,
    sleepDebt: Math.round(sleepDebt * 10) / 10,
    avgScore7d: Math.round(avgScore7d),
    avgScore30d: Math.round(avgScore30d),
    sri: Math.round(sri),
    trendDirection,
  }
}

function computeTrendDirection(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 3) return 'stable'

  const n = values.length
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  if (slope > 0.5) return 'improving'
  if (slope < -0.5) return 'declining'
  return 'stable'
}
