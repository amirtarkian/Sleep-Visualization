import type { SleepSession } from '../providers/types'
import { bedtimeMinutes } from './dateUtils'

export type InsightCategory = 'correlation' | 'pattern' | 'biometric'
export type InsightDirection = 'positive' | 'negative' | 'neutral'

export interface Insight {
  id: string
  category: InsightCategory
  title: string
  description: string
  significance: number // 0-1
  metric: string
  direction: InsightDirection
}

export function computeInsights(sessions: SleepSession[]): Insight[] {
  if (sessions.length < 7) return []

  const sorted = [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate))
  // Pre-compute day-of-week per session to avoid repeated Date allocations
  const dayOfWeek = new Map<string, number>()
  for (const s of sorted) {
    dayOfWeek.set(s.nightDate, new Date(s.nightDate + 'T00:00:00').getDay())
  }
  const insights: Insight[] = []

  // --- Correlations ---
  insights.push(...bedtimeCorrelation(sorted))
  insights.push(...durationCorrelation(sorted))
  insights.push(...consistencyCorrelation(sorted))
  insights.push(...weekendCorrelation(sorted, dayOfWeek))
  insights.push(...deepSleepCorrelation(sorted))

  // --- Patterns ---
  insights.push(...weekendEffect(sorted, dayOfWeek))
  insights.push(...streakDetection(sorted))
  insights.push(...recoveryPattern(sorted))
  insights.push(...trendMomentum(sorted))

  // --- Biometrics ---
  insights.push(...hrvTrend(sorted))
  insights.push(...restingHrTrend(sorted))
  insights.push(...spo2Stability(sorted))

  // Sort by significance descending and return top 5
  return insights
    .filter(i => i.significance > 0.1)
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 5)
}

// --- Correlation helpers ---

function bedtimeCorrelation(sessions: SleepSession[]): Insight[] {
  const early: number[] = []
  const mid: number[] = []
  const late: number[] = []

  for (const s of sessions) {
    const bt = bedtimeMinutes(s.startDate)
    const score = s.score.overall
    if (bt <= -90) early.push(score)
    else if (bt <= 0) mid.push(score)
    else late.push(score)
  }

  const best = [
    { label: 'before 10:30pm', avg: avg(early), count: early.length },
    { label: 'between 10:30pm-midnight', avg: avg(mid), count: mid.length },
    { label: 'after midnight', avg: avg(late), count: late.length },
  ].filter(b => b.count >= 3).sort((a, b) => b.avg - a.avg)

  if (best.length < 2) return []

  const diff = best[0].avg - best[best.length - 1].avg
  if (diff < 3) return []

  return [{
    id: 'corr-bedtime',
    category: 'correlation',
    title: 'Best Bedtime Window',
    description: `You score ${Math.round(diff)} pts higher ${best[0].label} vs. ${best[best.length - 1].label}.`,
    significance: Math.min(diff / 20, 1),
    metric: 'bedtime',
    direction: 'positive',
  }]
}

function durationCorrelation(sessions: SleepSession[]): Insight[] {
  const ideal = sessions.filter(s => s.totalSleepTime >= 420 && s.totalSleepTime <= 540)
  const outside = sessions.filter(s => s.totalSleepTime < 420 || s.totalSleepTime > 540)

  if (ideal.length < 3 || outside.length < 3) return []

  const idealAvg = avg(ideal.map(s => s.score.overall))
  const outsideAvg = avg(outside.map(s => s.score.overall))
  const diff = idealAvg - outsideAvg

  if (diff < 3) return []

  return [{
    id: 'corr-duration',
    category: 'correlation',
    title: 'Duration Sweet Spot',
    description: `Nights with 7-9h sleep score ${Math.round(diff)} pts higher than shorter/longer nights.`,
    significance: Math.min(diff / 20, 1),
    metric: 'duration',
    direction: 'positive',
  }]
}

function consistencyCorrelation(sessions: SleepSession[]): Insight[] {
  if (sessions.length < 14) return []

  const weeks: { variance: number; avgScore: number }[] = []
  for (let i = 0; i <= sessions.length - 7; i += 7) {
    const week = sessions.slice(i, i + 7)
    const bedtimes = week.map(s => bedtimeMinutes(s.startDate))
    const meanBt = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length
    const variance = bedtimes.reduce((sum, bt) => sum + (bt - meanBt) ** 2, 0) / bedtimes.length
    const avgScore = avg(week.map(s => s.score.overall))
    weeks.push({ variance, avgScore })
  }

  if (weeks.length < 2) return []

  const medianVariance = medianVal(weeks.map(w => w.variance))
  const consistent = weeks.filter(w => w.variance <= medianVariance)
  const inconsistent = weeks.filter(w => w.variance > medianVariance)

  if (consistent.length === 0 || inconsistent.length === 0) return []

  const conAvg = avg(consistent.map(w => w.avgScore))
  const inconAvg = avg(inconsistent.map(w => w.avgScore))
  const diff = conAvg - inconAvg

  if (diff < 2) return []

  return [{
    id: 'corr-consistency',
    category: 'correlation',
    title: 'Consistency Pays Off',
    description: `Weeks with regular bedtimes average ${Math.round(diff)} pts higher.`,
    significance: Math.min(diff / 15, 1),
    metric: 'consistency',
    direction: 'positive',
  }]
}

function weekendCorrelation(sessions: SleepSession[], dayOfWeek: Map<string, number>): Insight[] {
  // nightDate = date sleep started. Fri/Sat nights = weekend nights.
  const weekday = sessions.filter(s => {
    const day = dayOfWeek.get(s.nightDate)!
    return day >= 0 && day <= 4 // Sun-Thu nights
  })
  const weekend = sessions.filter(s => {
    const day = dayOfWeek.get(s.nightDate)!
    return day === 5 || day === 6 // Fri-Sat nights
  })

  if (weekday.length < 3 || weekend.length < 3) return []

  const weekdayAvg = avg(weekday.map(s => s.score.overall))
  const weekendAvg = avg(weekend.map(s => s.score.overall))
  const diff = Math.abs(weekdayAvg - weekendAvg)

  if (diff < 3) return []

  const better = weekdayAvg > weekendAvg ? 'weeknights' : 'weekends'
  const worse = weekdayAvg > weekendAvg ? 'weekends' : 'weeknights'

  return [{
    id: 'corr-weekend',
    category: 'correlation',
    title: 'Weekday vs. Weekend',
    description: `You score ${Math.round(diff)} pts higher on ${better} than ${worse}.`,
    significance: Math.min(diff / 15, 1),
    metric: 'weekend',
    direction: weekdayAvg > weekendAvg ? 'negative' : 'positive',
  }]
}

function deepSleepCorrelation(sessions: SleepSession[]): Insight[] {
  if (sessions.length < 10) return []

  const pairs: { deep: number; nextScore: number }[] = []
  for (let i = 0; i < sessions.length - 1; i++) {
    if (sessions[i].deepPercent > 0) {
      pairs.push({ deep: sessions[i].deepPercent, nextScore: sessions[i + 1].score.overall })
    }
  }

  if (pairs.length < 7) return []

  const medianDeep = medianVal(pairs.map(p => p.deep))
  const highDeep = pairs.filter(p => p.deep >= medianDeep)
  const lowDeep = pairs.filter(p => p.deep < medianDeep)

  if (highDeep.length === 0 || lowDeep.length === 0) return []

  const highAvg = avg(highDeep.map(p => p.nextScore))
  const lowAvg = avg(lowDeep.map(p => p.nextScore))
  const diff = highAvg - lowAvg

  if (diff < 3) return []

  return [{
    id: 'corr-deep-lag',
    category: 'correlation',
    title: 'Deep Sleep Carryover',
    description: `Nights after high deep sleep (>${Math.round(medianDeep)}%) score ${Math.round(diff)} pts higher.`,
    significance: Math.min(diff / 15, 1),
    metric: 'deepSleep',
    direction: 'positive',
  }]
}

// --- Pattern helpers ---

function weekendEffect(sessions: SleepSession[], dayOfWeek: Map<string, number>): Insight[] {
  const friSat = sessions.filter(s => {
    const day = dayOfWeek.get(s.nightDate)!
    return day === 5 || day === 6
  })
  const other = sessions.filter(s => {
    const day = dayOfWeek.get(s.nightDate)!
    return day !== 5 && day !== 6
  })

  if (friSat.length < 3 || other.length < 5) return []

  const friSatDeep = avg(friSat.map(s => s.deepPercent))
  const otherDeep = avg(other.map(s => s.deepPercent))
  const diff = otherDeep - friSatDeep

  if (Math.abs(diff) < 2) return []

  return [{
    id: 'pat-weekend-deep',
    category: 'pattern',
    title: 'Weekend Effect',
    description: diff > 0
      ? `Deep sleep drops ${diff.toFixed(1)}% on Fri/Sat nights vs. weeknights.`
      : `Deep sleep rises ${Math.abs(diff).toFixed(1)}% on Fri/Sat nights vs. weeknights.`,
    significance: Math.min(Math.abs(diff) / 10, 1),
    metric: 'deepSleep',
    direction: diff > 0 ? 'negative' : 'positive',
  }]
}

function streakDetection(sessions: SleepSession[]): Insight[] {
  let maxStreak = 0
  let currentStreak = 0

  for (const s of sessions) {
    if (s.score.overall >= 70) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  if (maxStreak < 5) return []

  return [{
    id: 'pat-streak',
    category: 'pattern',
    title: 'Sleep Streak',
    description: `${maxStreak}-night streak of "Good" or better sleep (score ≥70).`,
    significance: Math.min(maxStreak / 14, 1),
    metric: 'score',
    direction: 'positive',
  }]
}

function recoveryPattern(sessions: SleepSession[]): Insight[] {
  if (sessions.length < 10) return []

  const recoveries: number[] = []
  for (let i = 0; i < sessions.length - 1; i++) {
    if (sessions[i].score.overall < 60) {
      recoveries.push(sessions[i + 1].score.overall - sessions[i].score.overall)
    }
  }

  if (recoveries.length < 3) return []

  const avgRecovery = avg(recoveries)
  if (avgRecovery < 5) return []

  return [{
    id: 'pat-recovery',
    category: 'pattern',
    title: 'Bounce-Back Sleeper',
    description: `After a poor night (<60), you recover by ~${Math.round(avgRecovery)} pts the next night.`,
    significance: Math.min(avgRecovery / 20, 1),
    metric: 'score',
    direction: 'positive',
  }]
}

function trendMomentum(sessions: SleepSession[]): Insight[] {
  if (sessions.length < 14) return []

  const avgs: number[] = []
  for (let i = 6; i < sessions.length; i++) {
    const window = sessions.slice(i - 6, i + 1)
    avgs.push(avg(window.map(s => s.score.overall)))
  }

  if (avgs.length < 3) return []

  const deltas: number[] = []
  for (let i = 1; i < avgs.length; i++) {
    deltas.push(avgs[i] - avgs[i - 1])
  }

  const recentDelta = avg(deltas.slice(-7))
  if (Math.abs(recentDelta) < 0.3) return []

  const accelerating = recentDelta > 0
  return [{
    id: 'pat-momentum',
    category: 'pattern',
    title: accelerating ? 'Building Momentum' : 'Losing Momentum',
    description: accelerating
      ? `Your 7-day average is climbing (+${recentDelta.toFixed(1)} pts/night).`
      : `Your 7-day average is slipping (${recentDelta.toFixed(1)} pts/night).`,
    significance: Math.min(Math.abs(recentDelta) / 2, 1),
    metric: 'score',
    direction: accelerating ? 'positive' : 'negative',
  }]
}

// --- Biometric helpers ---

function hrvTrend(sessions: SleepSession[]): Insight[] {
  const data = sessions.filter(s => s.avgHrv !== null).map(s => s.avgHrv!)
  if (data.length < 7) return []

  const slope = linearSlope(data)
  if (Math.abs(slope) < 0.05) return []

  const totalChange = slope * data.length
  const rising = slope > 0

  return [{
    id: 'bio-hrv',
    category: 'biometric',
    title: rising ? 'HRV Trending Up' : 'HRV Trending Down',
    description: rising
      ? `HRV improved ~${Math.round(Math.abs(totalChange))}ms over this period.`
      : `HRV declined ~${Math.round(Math.abs(totalChange))}ms over this period.`,
    significance: Math.min(Math.abs(totalChange) / 15, 1),
    metric: 'hrv',
    direction: rising ? 'positive' : 'negative',
  }]
}

function restingHrTrend(sessions: SleepSession[]): Insight[] {
  const data = sessions.filter(s => s.minHeartRate !== null).map(s => s.minHeartRate!)
  if (data.length < 7) return []

  const slope = linearSlope(data)
  if (Math.abs(slope) < 0.05) return []

  const totalChange = slope * data.length
  const improving = slope < 0

  return [{
    id: 'bio-rhr',
    category: 'biometric',
    title: improving ? 'Resting HR Improving' : 'Resting HR Rising',
    description: improving
      ? `Resting HR dropped ~${Math.round(Math.abs(totalChange))} bpm over this period.`
      : `Resting HR rose ~${Math.round(Math.abs(totalChange))} bpm over this period.`,
    significance: Math.min(Math.abs(totalChange) / 10, 1),
    metric: 'restingHr',
    direction: improving ? 'positive' : 'negative',
  }]
}

function spo2Stability(sessions: SleepSession[]): Insight[] {
  const data = sessions.filter(s => s.avgSpo2 !== null).map(s => s.avgSpo2!)
  if (data.length < 7) return []

  const mean = avg(data)
  const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length
  const stdDev = Math.sqrt(variance)

  if (mean < 95) {
    return [{
      id: 'bio-spo2-low',
      category: 'biometric',
      title: 'SpO2 Below Normal',
      description: `Average SpO2 is ${mean.toFixed(1)}% (normal: ≥95%). Consider consulting a physician.`,
      significance: Math.min((95 - mean) / 5, 1),
      metric: 'spo2',
      direction: 'negative',
    }]
  }

  if (stdDev < 1) return []

  return [{
    id: 'bio-spo2-var',
    category: 'biometric',
    title: 'SpO2 Variability',
    description: `SpO2 fluctuates ±${stdDev.toFixed(1)}% between nights (avg ${mean.toFixed(1)}%).`,
    significance: Math.min(stdDev / 3, 1),
    metric: 'spo2',
    direction: 'negative',
  }]
}

// --- Utilities ---

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function medianVal(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
}
