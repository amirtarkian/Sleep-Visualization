import { useLiveQuery } from 'dexie-react-hooks'
import { db, deserializeSession, deserializeBiometric } from '../db/schema'
import type { SleepSession, BiometricRecord } from '../providers/types'

export function useSleepSession(nightDate: string | null): {
  session: SleepSession | null
  biometrics: BiometricRecord[]
  loading: boolean
} {
  const result = useLiveQuery(async () => {
    if (!nightDate) return { session: null, biometrics: [] }

    const stored = await db.sleepSessions.where('nightDate').equals(nightDate).first()
    if (!stored) return { session: null, biometrics: [] }

    const session = deserializeSession(stored)
    const storedBio = await db.biometricRecords.where('sessionId').equals(session.id).toArray()
    const biometrics = storedBio.map(deserializeBiometric)

    return { session, biometrics }
  }, [nightDate])

  return {
    session: result?.session ?? null,
    biometrics: result?.biometrics ?? [],
    loading: result === undefined,
  }
}
