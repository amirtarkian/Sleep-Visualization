import { format } from 'date-fns'

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hrs === 0) return `${mins}m`
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatNightDate(nightDate: string): string {
  return format(new Date(nightDate + 'T12:00:00'), 'EEE, MMM d')
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatMinutesAsTime(minutesFromMidnight: number): string {
  let mins = minutesFromMidnight
  if (mins < 0) mins += 24 * 60
  const hrs = Math.floor(mins / 60) % 24
  const m = Math.round(mins % 60)
  const period = hrs >= 12 ? 'PM' : 'AM'
  const h = hrs % 12 || 12
  return `${h}:${m.toString().padStart(2, '0')} ${period}`
}

export function formatBpm(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value)} bpm`
}

export function formatMs(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value)} ms`
}
