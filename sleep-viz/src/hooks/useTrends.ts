import { useMemo } from 'react'
import type { SleepSession, TrendData } from '../providers/types'
import { computeTrends } from '../lib/trends'

export function useTrends(sessions: SleepSession[]): TrendData {
  return useMemo(() => computeTrends(sessions), [sessions])
}
