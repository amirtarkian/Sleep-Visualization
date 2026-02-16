import type { SleepDataProvider, SleepSession, SleepStageInterval, BiometricRecord } from './types'
import { db, serializeSession, serializeBiometric } from '../db/schema'
import { computeSessionStats } from '../lib/statistics'
import { computeSleepScore } from '../lib/sleepScore'
import { getNightDate } from '../lib/dateUtils'
import { subDays } from 'date-fns'

function random(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1))
}

function generateStages(sessionStart: Date, sessionEnd: Date): SleepStageInterval[] {
  const stages: SleepStageInterval[] = []
  const totalMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / 60000
  let currentTime = sessionStart.getTime()

  // Initial awake/latency period (5-25 min)
  const latencyMin = randomInt(5, 25)
  stages.push({
    stage: 'awake',
    startDate: new Date(currentTime),
    endDate: new Date(currentTime + latencyMin * 60000),
  })
  currentTime += latencyMin * 60000

  // Generate sleep cycles (typically 4-6 per night, ~90 min each)
  const remainingMinutes = totalMinutes - latencyMin
  const cycleCount = Math.floor(remainingMinutes / 90)

  for (let cycle = 0; cycle < cycleCount; cycle++) {
    const cycleProgress = cycle / cycleCount // 0 = first cycle, ~1 = last

    // Deep sleep: more in first half of night
    const deepDuration = Math.max(0, randomInt(10, 35) * (1 - cycleProgress * 0.7))
    if (deepDuration > 5) {
      stages.push({
        stage: 'deep',
        startDate: new Date(currentTime),
        endDate: new Date(currentTime + deepDuration * 60000),
      })
      currentTime += deepDuration * 60000
    }

    // Core/light sleep
    const coreDuration = randomInt(20, 40)
    stages.push({
      stage: 'core',
      startDate: new Date(currentTime),
      endDate: new Date(currentTime + coreDuration * 60000),
    })
    currentTime += coreDuration * 60000

    // REM: more in second half of night
    const remDuration = Math.max(0, randomInt(5, 30) * (0.3 + cycleProgress * 0.7))
    if (remDuration > 3) {
      stages.push({
        stage: 'rem',
        startDate: new Date(currentTime),
        endDate: new Date(currentTime + remDuration * 60000),
      })
      currentTime += remDuration * 60000
    }

    // Brief awakening between cycles (not all cycles)
    if (cycle < cycleCount - 1 && Math.random() < 0.4) {
      const awakeDuration = randomInt(1, 8)
      stages.push({
        stage: 'awake',
        startDate: new Date(currentTime),
        endDate: new Date(currentTime + awakeDuration * 60000),
      })
      currentTime += awakeDuration * 60000
    }
  }

  // Fill remaining time with core sleep if needed
  const endTime = sessionEnd.getTime()
  if (currentTime < endTime - 5 * 60000) {
    stages.push({
      stage: 'core',
      startDate: new Date(currentTime),
      endDate: new Date(endTime - randomInt(2, 10) * 60000),
    })
    currentTime = endTime - randomInt(2, 10) * 60000
  }

  // Final wake
  if (currentTime < endTime) {
    stages.push({
      stage: 'awake',
      startDate: new Date(currentTime),
      endDate: sessionEnd,
    })
  }

  return stages
}

function generateBiometrics(sessionId: string, sessionStart: Date, sessionEnd: Date, stages: SleepStageInterval[]): BiometricRecord[] {
  const records: BiometricRecord[] = []
  const durationMs = sessionEnd.getTime() - sessionStart.getTime()

  // Heart rate: every 5 minutes
  const baseHR = random(48, 62)
  for (let t = 0; t < durationMs; t += 5 * 60000) {
    const time = new Date(sessionStart.getTime() + t)
    const currentStage = stages.find(s => time >= s.startDate && time < s.endDate)
    let hr = baseHR

    if (currentStage) {
      switch (currentStage.stage) {
        case 'deep': hr = baseHR - random(3, 8); break
        case 'core': hr = baseHR + random(-2, 3); break
        case 'rem': hr = baseHR + random(2, 10); break
        case 'awake': hr = baseHR + random(5, 15); break
      }
    }

    records.push({
      sessionId,
      type: 'heartRate',
      value: Math.round(hr * 10) / 10,
      date: time,
      sourceName: 'Apple Watch',
    })
  }

  // HRV: every 15 minutes
  const baseHRV = random(25, 65)
  for (let t = 0; t < durationMs; t += 15 * 60000) {
    const time = new Date(sessionStart.getTime() + t)
    const currentStage = stages.find(s => time >= s.startDate && time < s.endDate)
    let hrv = baseHRV

    if (currentStage) {
      switch (currentStage.stage) {
        case 'deep': hrv = baseHRV + random(5, 20); break
        case 'core': hrv = baseHRV + random(-5, 10); break
        case 'rem': hrv = baseHRV - random(0, 10); break
        case 'awake': hrv = baseHRV - random(5, 15); break
      }
    }

    records.push({
      sessionId,
      type: 'hrv',
      value: Math.round(Math.max(10, hrv) * 10) / 10,
      date: time,
      sourceName: 'Apple Watch',
    })
  }

  // SpO2: every 30 minutes
  for (let t = 0; t < durationMs; t += 30 * 60000) {
    records.push({
      sessionId,
      type: 'spo2',
      value: Math.round(random(94, 99) * 10) / 10,
      date: new Date(sessionStart.getTime() + t),
      sourceName: 'Apple Watch',
    })
  }

  // Respiratory rate: every 15 minutes
  for (let t = 0; t < durationMs; t += 15 * 60000) {
    records.push({
      sessionId,
      type: 'respiratoryRate',
      value: Math.round(random(12, 18) * 10) / 10,
      date: new Date(sessionStart.getTime() + t),
      sourceName: 'Apple Watch',
    })
  }

  return records
}

export class SampleDataProvider implements SleepDataProvider {
  name = 'Sample Data'

  async import(): Promise<void> {
    await this.clearData()

    const sessions: SleepSession[] = []
    const allBiometrics: BiometricRecord[] = []
    const now = new Date()

    for (let i = 29; i >= 0; i--) {
      const nightOf = subDays(now, i + 1)

      // Vary bedtime: 10PM - 12:30AM
      const bedtimeHour = randomInt(22, 24)
      const bedtimeMin = randomInt(0, 59)
      const start = new Date(nightOf)
      start.setHours(bedtimeHour, bedtimeMin, 0, 0)
      if (bedtimeHour >= 24) {
        start.setDate(start.getDate() + 1)
        start.setHours(bedtimeHour - 24, bedtimeMin, 0, 0)
      }

      // Vary wake: 5:30AM - 8:00AM
      const wakeHour = randomInt(5, 7)
      const wakeMin = wakeHour === 5 ? randomInt(30, 59) : randomInt(0, 59)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      end.setHours(wakeHour, wakeMin, 0, 0)
      // If bedtime was after midnight, wake is same day
      if (bedtimeHour >= 24 || start.getHours() < 6) {
        end.setDate(start.getDate())
        end.setHours(wakeHour, wakeMin, 0, 0)
      }

      // Ensure end > start
      if (end <= start) {
        end.setDate(start.getDate() + 1)
      }

      // Some "bad nights" (short sleep or fragmented)
      const isBadNight = Math.random() < 0.15

      const id = `sample-${i}`
      const stages = generateStages(start, end)
      const stats = computeSessionStats(start, end, stages)
      const nightDate = getNightDate(start)

      const biometrics = generateBiometrics(id, start, end, stages)
      const { computeBiometricSummary } = await import('../lib/biometrics')
      const bioSummary = computeBiometricSummary(biometrics)

      const session: SleepSession = {
        id,
        nightDate,
        startDate: start,
        endDate: end,
        stages,
        sourceName: 'Apple Watch',
        sourceNames: ['Apple Watch'],
        ...stats,
        ...bioSummary,
        score: { overall: 0, duration: 0, efficiency: 0, deepSleep: 0, rem: 0, latency: 0, waso: 0, isFallback: false },
      }

      session.score = computeSleepScore(session)

      // Worsen bad nights
      if (isBadNight) {
        session.score = {
          ...session.score,
          overall: Math.max(20, session.score.overall - randomInt(15, 30)),
        }
      }

      sessions.push(session)
      allBiometrics.push(...biometrics)
    }

    // Batch write to IndexedDB
    await db.transaction('rw', db.sleepSessions, db.biometricRecords, async () => {
      await db.sleepSessions.bulkPut(sessions.map(serializeSession))
      await db.biometricRecords.bulkPut(allBiometrics.map(serializeBiometric))
    })
  }

  async hasData(): Promise<boolean> {
    return (await db.sleepSessions.count()) > 0
  }

  async clearData(): Promise<void> {
    await db.transaction('rw', db.sleepSessions, db.biometricRecords, async () => {
      await db.sleepSessions.clear()
      await db.biometricRecords.clear()
    })
  }
}
