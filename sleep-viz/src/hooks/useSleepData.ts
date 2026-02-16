import { useLiveQuery } from 'dexie-react-hooks'
import { db, deserializeSession } from '../db/schema'
import type { DateRange } from '../providers/types'
import { getDateRangeBounds } from '../lib/dateUtils'

export function useSleepData(dateRange: DateRange) {
  const sessions = useLiveQuery(async () => {
    const allStored = await db.sleepSessions.orderBy('nightDate').toArray()
    if (allStored.length === 0) return []

    const allDates = allStored.map(s => s.nightDate)
    const { start, end } = getDateRangeBounds(dateRange, allDates)

    const filtered = allStored.filter(s => s.nightDate >= start && s.nightDate <= end)
    return filtered.map(deserializeSession)
  }, [dateRange])

  return sessions ?? []
}

export function useAllSessions() {
  const sessions = useLiveQuery(async () => {
    const stored = await db.sleepSessions.orderBy('nightDate').toArray()
    return stored.map(deserializeSession)
  })
  return sessions ?? []
}
