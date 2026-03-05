import type { SleepSession } from '../../providers/types'
import type { SleepGoalsConfig } from '../../lib/goals'
import { checkDurationGoalMet, checkScoreGoalMet, checkBedtimeGoalMet } from '../../lib/goals'

interface StreakCalendarProps {
  sessions: SleepSession[]
  goals: SleepGoalsConfig
}

type DayStatus = 'met' | 'missed' | 'nodata'

function getDayStatus(session: SleepSession | undefined, goals: SleepGoalsConfig): DayStatus {
  if (!session) return 'nodata'
  const durationMet = checkDurationGoalMet(session, goals.durationTargetMin)
  const scoreMet = checkScoreGoalMet(session, goals.scoreTarget)
  // Consider the day "met" if at least 2 of 3 goals are met
  const bedtimeMet = checkBedtimeGoalMet(session, goals.bedtimeStartMin, goals.bedtimeEndMin)
  const metCount = [durationMet, scoreMet, bedtimeMet].filter(Boolean).length
  return metCount >= 2 ? 'met' : 'missed'
}

const STATUS_CLASSES: Record<DayStatus, string> = {
  met: 'bg-green-500',
  missed: 'bg-red-500/70',
  nodata: 'bg-slate-800',
}

export function StreakCalendar({ sessions, goals }: StreakCalendarProps) {
  // Build a map of nightDate -> session
  const sessionMap = new Map<string, SleepSession>()
  for (const s of sessions) {
    sessionMap.set(s.nightDate, s)
  }

  // Generate last 30 days
  const days: Array<{ date: string; status: DayStatus }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const session = sessionMap.get(dateStr)
    days.push({ date: dateStr, status: getDayStatus(session, goals) })
  }

  // Split into weeks for a 5-row grid (6 cols per row plus weekday labels)
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-3">Last 30 Days</p>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {dayLabels.map((label, i) => (
          <div key={i} className="text-[10px] text-slate-600 text-center">
            {label}
          </div>
        ))}
      </div>
      {/* Calendar grid: align first day to correct weekday */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Padding for first day of the 30-day window */}
        {(() => {
          const firstDate = new Date(days[0].date + 'T00:00:00')
          // getDay: 0=Sun. We want Mon=0, so (getDay() + 6) % 7
          const offset = (firstDate.getDay() + 6) % 7
          const padding = []
          for (let i = 0; i < offset; i++) {
            padding.push(<div key={`pad-${i}`} />)
          }
          return padding
        })()}
        {days.map(day => {
          const d = new Date(day.date + 'T00:00:00')
          const dayNum = d.getDate()
          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-0.5"
              title={`${day.date}: ${day.status === 'met' ? 'Goal met' : day.status === 'missed' ? 'Goal missed' : 'No data'}`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${STATUS_CLASSES[day.status]}`} />
              <span className="text-[9px] text-slate-600">{dayNum}</span>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-[10px] text-slate-500">Goal met</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="text-[10px] text-slate-500">Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-800" />
          <span className="text-[10px] text-slate-500">No data</span>
        </div>
      </div>
    </div>
  )
}
