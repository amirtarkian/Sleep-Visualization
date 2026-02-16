import type { SleepSession } from '../providers/types'
import { differenceInMinutes } from 'date-fns'

export function computeSessionStats(
  startDate: Date,
  endDate: Date,
  stages: SleepSession['stages'],
): Pick<SleepSession,
  'timeInBed' | 'totalSleepTime' | 'sleepEfficiency' | 'sleepLatency' | 'waso' |
  'deepMinutes' | 'remMinutes' | 'coreMinutes' | 'awakeMinutes' |
  'deepPercent' | 'remPercent' | 'corePercent' | 'awakePercent'
> {
  const timeInBed = differenceInMinutes(endDate, startDate)

  let deepMinutes = 0
  let remMinutes = 0
  let coreMinutes = 0
  let awakeMinutes = 0

  for (const stage of stages) {
    const duration = differenceInMinutes(stage.endDate, stage.startDate)
    switch (stage.stage) {
      case 'deep': deepMinutes += duration; break
      case 'rem': remMinutes += duration; break
      case 'core': coreMinutes += duration; break
      case 'awake': awakeMinutes += duration; break
    }
  }

  const totalSleepTime = deepMinutes + remMinutes + coreMinutes
  const sleepEfficiency = timeInBed > 0 ? (totalSleepTime / timeInBed) * 100 : 0

  // Sleep latency: time from session start to first non-awake stage
  let sleepLatency = 0
  if (stages.length > 0) {
    const sortedStages = [...stages].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    const firstSleep = sortedStages.find(s => s.stage !== 'awake')
    if (firstSleep) {
      sleepLatency = differenceInMinutes(firstSleep.startDate, startDate)
    }
  }

  // WASO: total awake time after first sleep onset
  let waso = 0
  if (stages.length > 0) {
    const sortedStages = [...stages].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    const firstSleepIndex = sortedStages.findIndex(s => s.stage !== 'awake')
    if (firstSleepIndex >= 0) {
      for (let i = firstSleepIndex + 1; i < sortedStages.length; i++) {
        if (sortedStages[i].stage === 'awake') {
          waso += differenceInMinutes(sortedStages[i].endDate, sortedStages[i].startDate)
        }
      }
    }
  }

  // If no stages, estimate from time in bed
  const effectiveTST = stages.length > 0 ? totalSleepTime : timeInBed * 0.85
  const safeTST = Math.max(effectiveTST, 1) // avoid division by zero

  return {
    timeInBed,
    totalSleepTime: stages.length > 0 ? totalSleepTime : Math.round(timeInBed * 0.85),
    sleepEfficiency: stages.length > 0 ? Math.round(sleepEfficiency * 10) / 10 : 85,
    sleepLatency: stages.length > 0 ? sleepLatency : 12,
    waso: stages.length > 0 ? waso : Math.round(timeInBed * 0.05),
    deepMinutes,
    remMinutes,
    coreMinutes,
    awakeMinutes,
    deepPercent: stages.length > 0 ? Math.round((deepMinutes / safeTST) * 1000) / 10 : 0,
    remPercent: stages.length > 0 ? Math.round((remMinutes / safeTST) * 1000) / 10 : 0,
    corePercent: stages.length > 0 ? Math.round((coreMinutes / safeTST) * 1000) / 10 : 0,
    awakePercent: stages.length > 0 ? Math.round((awakeMinutes / safeTST) * 1000) / 10 : 0,
  }
}
