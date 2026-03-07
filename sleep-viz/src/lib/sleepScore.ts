import type { SleepScore } from '../providers/types'
import { SCORE_WEIGHTS, SCORE_WEIGHTS_FALLBACK } from './constants'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function linearScale(value: number, min: number, max: number): number {
  return clamp(((value - min) / (max - min)) * 100, 0, 100)
}

/** Duration sub-score: 7-9hr ideal range */
export function scoreDuration(totalSleepMinutes: number): number {
  const hours = totalSleepMinutes / 60
  if (hours >= 7 && hours <= 9) return 100
  if (hours < 7) return linearScale(hours, 5, 7) // 5h = 0, 7h = 100
  return linearScale(11 - hours, 0, 2) // 9h = 100, 11h = 0
}

/** Efficiency sub-score: >=85% ideal */
export function scoreEfficiency(efficiency: number): number {
  if (efficiency >= 85) return 100
  return linearScale(efficiency, 65, 85) // 65% = 0, 85% = 100
}

/** Deep sleep sub-score: 10-25% of TST ideal */
export function scoreDeepSleep(deepPercent: number): number {
  if (deepPercent >= 10 && deepPercent <= 25) return 100
  if (deepPercent < 10) return linearScale(deepPercent, 0, 10)
  return linearScale(40 - deepPercent, 0, 15) // 25% = 100, 40% = 0
}

/** REM sub-score: 20-25% of TST ideal */
export function scoreRem(remPercent: number): number {
  if (remPercent >= 20 && remPercent <= 25) return 100
  if (remPercent < 20) return linearScale(remPercent, 0, 20)
  return linearScale(40 - remPercent, 0, 15) // 25% = 100, 40% = 0
}

/** Latency sub-score: 10-20min ideal */
export function scoreLatency(latencyMinutes: number): number {
  if (latencyMinutes >= 10 && latencyMinutes <= 20) return 100
  if (latencyMinutes < 5) return 70
  if (latencyMinutes < 10) return 70 + ((latencyMinutes - 5) / 5) * 30
  return clamp(100 - ((latencyMinutes - 20) / 25) * 100, 0, 100)
}

/** WASO sub-score: <=20min ideal */
export function scoreWaso(wasoMinutes: number): number {
  if (wasoMinutes <= 20) return 100
  return clamp(100 - ((wasoMinutes - 20) / 40) * 100, 0, 100) // 60min = 0
}

/** Timing sub-score: sleep midpoint midnight-3AM ideal */
export function scoreTiming(midpointMinutesFromMidnight: number): number {
  if (midpointMinutesFromMidnight >= 0 && midpointMinutesFromMidnight <= 180) return 100
  const minutesOutside = midpointMinutesFromMidnight < 0
    ? -midpointMinutesFromMidnight
    : midpointMinutesFromMidnight - 180
  return clamp(100 - (minutesOutside / 60) * 25, 0, 100)
}

/** Restoration sub-score: HR drop during sleep */
export function scoreRestoration(sleepingHR: number, restingHR: number): number {
  if (restingHR <= 0) return 50
  const dropPercent = ((restingHR - sleepingHR) / restingHR) * 100
  if (dropPercent >= 10) return 100
  if (dropPercent >= 0) return 50 + dropPercent * 5
  return 30
}

/** Compute full sleep score for a session */
export function computeSleepScore(session: {
  totalSleepTime: number
  sleepEfficiency: number
  deepPercent: number
  remPercent: number
  sleepLatency: number
  waso: number
  stages: unknown[]
  midpointMinutesFromMidnight?: number
  sleepingHR?: number
  restingHR?: number
}): SleepScore {
  const duration = scoreDuration(session.totalSleepTime)
  const efficiency = scoreEfficiency(session.sleepEfficiency)
  const latency = scoreLatency(session.sleepLatency)
  const waso = scoreWaso(session.waso)
  const timing = scoreTiming(session.midpointMinutesFromMidnight ?? 0)
  const restoration = scoreRestoration(session.sleepingHR ?? 0, session.restingHR ?? 0)

  const hasStages = session.stages.length > 0
  const deepSleep = hasStages ? scoreDeepSleep(session.deepPercent) : 0
  const rem = hasStages ? scoreRem(session.remPercent) : 0

  let overall: number
  if (hasStages) {
    overall =
      duration * SCORE_WEIGHTS.duration +
      efficiency * SCORE_WEIGHTS.efficiency +
      deepSleep * SCORE_WEIGHTS.deepSleep +
      rem * SCORE_WEIGHTS.rem +
      latency * SCORE_WEIGHTS.latency +
      waso * SCORE_WEIGHTS.waso +
      timing * SCORE_WEIGHTS.timing +
      restoration * SCORE_WEIGHTS.restoration
  } else {
    overall =
      duration * SCORE_WEIGHTS_FALLBACK.duration +
      efficiency * SCORE_WEIGHTS_FALLBACK.efficiency +
      latency * SCORE_WEIGHTS_FALLBACK.latency +
      waso * SCORE_WEIGHTS_FALLBACK.waso +
      timing * SCORE_WEIGHTS_FALLBACK.timing +
      restoration * SCORE_WEIGHTS_FALLBACK.restoration
  }

  return {
    overall: Math.round(clamp(overall, 0, 100)),
    duration: Math.round(duration),
    efficiency: Math.round(efficiency),
    deepSleep: Math.round(deepSleep),
    rem: Math.round(rem),
    latency: Math.round(latency),
    waso: Math.round(waso),
    timing: Math.round(timing),
    restoration: Math.round(restoration),
    isFallback: !hasStages,
  }
}
