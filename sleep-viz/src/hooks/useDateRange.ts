import { useState, useCallback } from 'react'
import type { DateRange } from '../providers/types'

export function useDateRange(initial: DateRange = '30d') {
  const [dateRange, setDateRange] = useState<DateRange>(initial)
  const changeDateRange = useCallback((range: DateRange) => setDateRange(range), [])
  return { dateRange, setDateRange: changeDateRange }
}
