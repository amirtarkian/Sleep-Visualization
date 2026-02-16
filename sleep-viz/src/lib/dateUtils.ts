import { format, parseISO, differenceInMinutes, startOfDay, subDays } from 'date-fns'
import { NIGHT_CUTOFF_HOUR } from './constants'

/**
 * Parse Apple Health timestamp format: "2024-12-01 23:15:00 -0600"
 */
export function parseAppleHealthDate(dateStr: string): Date {
  // Format: "YYYY-MM-DD HH:mm:ss ±HHMM"
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$/)
  if (!match) {
    return new Date(dateStr) // fallback
  }
  const [, datePart, timePart, offset] = match
  // Convert to ISO format with timezone offset
  const offsetFormatted = `${offset.slice(0, 3)}:${offset.slice(3)}`
  return new Date(`${datePart}T${timePart}${offsetFormatted}`)
}

/**
 * Get the "night of" date for a sleep session.
 * If sleep started before NIGHT_CUTOFF_HOUR (6AM), it belongs to the previous day.
 */
export function getNightDate(startDate: Date): string {
  const hours = startDate.getHours()
  const date = hours < NIGHT_CUTOFF_HOUR ? subDays(startDate, 1) : startDate
  return format(date, 'yyyy-MM-dd')
}

/**
 * Circular mean for times (handles midnight crossing).
 * Input: array of minutes from midnight (can be negative for before midnight).
 */
export function circularMeanTime(timesInMinutes: number[]): number {
  if (timesInMinutes.length === 0) return 0
  const TWO_PI = 2 * Math.PI
  const MINUTES_IN_DAY = 24 * 60

  let sinSum = 0
  let cosSum = 0
  for (const t of timesInMinutes) {
    const angle = (t / MINUTES_IN_DAY) * TWO_PI
    sinSum += Math.sin(angle)
    cosSum += Math.cos(angle)
  }
  sinSum /= timesInMinutes.length
  cosSum /= timesInMinutes.length

  let mean = (Math.atan2(sinSum, cosSum) / TWO_PI) * MINUTES_IN_DAY
  if (mean < -360) mean += MINUTES_IN_DAY
  if (mean > MINUTES_IN_DAY) mean -= MINUTES_IN_DAY
  return mean
}

/**
 * Convert a Date to minutes from midnight (can be negative for before midnight context).
 */
export function dateToMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Get minutes from midnight, treating times between 6PM-midnight as negative
 * (for bedtime averaging that crosses midnight).
 */
export function bedtimeMinutes(date: Date): number {
  const mins = dateToMinutesFromMidnight(date)
  // If after 6PM, treat as negative (before midnight)
  return mins >= 18 * 60 ? mins - 24 * 60 : mins
}

/**
 * Get date range boundaries for a given range type.
 */
export function getDateRangeBounds(range: '7d' | '30d' | '90d' | 'all', allDates?: string[]): { start: string; end: string } {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (range === 'all' && allDates && allDates.length > 0) {
    return { start: allDates[0], end: allDates[allDates.length - 1] }
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  return { start: format(subDays(new Date(), days), 'yyyy-MM-dd'), end: today }
}

export { format, parseISO, differenceInMinutes, startOfDay, subDays }
