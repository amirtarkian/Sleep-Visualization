import { useMemo } from 'react'
import type { SleepSession } from '../providers/types'
import { computeInsights, type Insight } from '../lib/insights'

export function useInsights(sessions: SleepSession[]): Insight[] {
  return useMemo(() => computeInsights(sessions), [sessions])
}
