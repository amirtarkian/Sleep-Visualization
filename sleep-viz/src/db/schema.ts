import Dexie, { type Table } from 'dexie'
import type { SleepSession, BiometricRecord } from '../providers/types'

// Dexie stores plain objects, so dates are serialized
export type StoredSleepSession = Omit<SleepSession, 'startDate' | 'endDate' | 'stages'> & {
  startDate: string
  endDate: string
  stages: Array<{
    stage: string
    startDate: string
    endDate: string
  }>
}

export type StoredBiometricRecord = Omit<BiometricRecord, 'date'> & {
  date: string
}

export class SleepDatabase extends Dexie {
  sleepSessions!: Table<StoredSleepSession, string>
  biometricRecords!: Table<StoredBiometricRecord, number>

  constructor() {
    super('SleepVizDB')
    this.version(1).stores({
      sleepSessions: 'id, nightDate, startDate',
      biometricRecords: '++id, sessionId, type, date, [sessionId+type]',
    })
  }
}

export const db = new SleepDatabase()

// Serialization helpers
export function serializeSession(session: SleepSession): StoredSleepSession {
  return {
    ...session,
    startDate: session.startDate.toISOString(),
    endDate: session.endDate.toISOString(),
    stages: session.stages.map(s => ({
      stage: s.stage,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
    })),
  }
}

export function deserializeSession(stored: StoredSleepSession): SleepSession {
  return {
    ...stored,
    startDate: new Date(stored.startDate),
    endDate: new Date(stored.endDate),
    stages: stored.stages.map(s => ({
      stage: s.stage as SleepSession['stages'][0]['stage'],
      startDate: new Date(s.startDate),
      endDate: new Date(s.endDate),
    })),
  }
}

export function serializeBiometric(record: BiometricRecord): StoredBiometricRecord {
  return {
    ...record,
    date: record.date.toISOString(),
  }
}

export function deserializeBiometric(stored: StoredBiometricRecord): BiometricRecord {
  return {
    ...stored,
    date: new Date(stored.date),
  }
}
