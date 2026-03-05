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
  if (hours < 7) return linearScale(hours, 4, 7) // 4h = 0, 7h = 100
  return linearScale(11 - hours, 0, 2) * 100 / 100 // 9h = 100, 11h = 0
}

/** Efficiency sub-score: >=90% ideal */
export function scoreEfficiency(efficiency: number): number {
  if (efficiency >= 90) return 100
  return linearScale(efficiency, 60, 90) // 60% = 0, 90% = 100
}

/** Deep sleep sub-score: 15-25% of TST ideal */
export function scoreDeepSleep(deepPercent: number): number {
  if (deepPercent >= 15 && deepPercent <= 25) return 100
  if (deepPercent < 15) return linearScale(deepPercent, 0, 15)
  return linearScale(40 - deepPercent, 0, 15) // 25% = 100, 40% = 0
}

/** REM sub-score: 20-30% of TST ideal */
export function scoreRem(remPercent: number): number {
  if (remPercent >= 20 && remPercent <= 30) return 100
  if (remPercent < 20) return linearScale(remPercent, 0, 20)
  return linearScale(45 - remPercent, 0, 15) // 30% = 100, 45% = 0
}

/** Latency sub-score: <=15min ideal */
export function scoreLatency(latencyMinutes: number): number {
  if (latencyMinutes <= 15) return 100
  return clamp(100 - ((latencyMinutes - 15) / 45) * 100, 0, 100) // 60min = 0
}

/** WASO sub-score: <=10min ideal */
export function scoreWaso(wasoMinutes: number): number {
  if (wasoMinutes <= 10) return 100
  return clamp(100 - ((wasoMinutes - 10) / 50) * 100, 0, 100) // 60min = 0
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
}): SleepScore {
  const duration = scoreDuration(session.totalSleepTime)
  const efficiency = scoreEfficiency(session.sleepEfficiency)
  const latency = scoreLatency(session.sleepLatency)
  const waso = scoreWaso(session.waso)

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
      waso * SCORE_WEIGHTS.waso
  } else {
    overall =
      duration * SCORE_WEIGHTS_FALLBACK.duration +
      efficiency * SCORE_WEIGHTS_FALLBACK.efficiency +
      latency * SCORE_WEIGHTS_FALLBACK.latency +
      waso * SCORE_WEIGHTS_FALLBACK.waso
  }

  return {
    overall: Math.round(clamp(overall, 0, 100)),
    duration: Math.round(duration),
    efficiency: Math.round(efficiency),
    deepSleep: Math.round(deepSleep),
    rem: Math.round(rem),
    latency: Math.round(latency),
    waso: Math.round(waso),
    timing: 0,
    restoration: 0,
    isFallback: !hasStages,
  }
}
