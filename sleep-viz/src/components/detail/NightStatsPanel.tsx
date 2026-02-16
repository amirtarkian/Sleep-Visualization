import type { SleepSession } from '../../providers/types'
import { Card } from '../layout/Card'
import { formatDuration, formatTime, formatPercent } from '../../lib/formatters'

interface NightStatsPanelProps {
  session: SleepSession
}

export function NightStatsPanel({ session }: NightStatsPanelProps) {
  const stats = [
    { label: 'Time in Bed', value: formatDuration(session.timeInBed) },
    { label: 'Total Sleep', value: formatDuration(session.totalSleepTime) },
    { label: 'Efficiency', value: formatPercent(session.sleepEfficiency) },
    { label: 'Bedtime', value: formatTime(session.startDate) },
    { label: 'Wake Time', value: formatTime(session.endDate) },
    { label: 'Latency', value: formatDuration(session.sleepLatency) },
    { label: 'WASO', value: formatDuration(session.waso) },
    { label: 'Deep', value: session.deepMinutes > 0 ? `${formatDuration(session.deepMinutes)} (${formatPercent(session.deepPercent)})` : '—' },
    { label: 'REM', value: session.remMinutes > 0 ? `${formatDuration(session.remMinutes)} (${formatPercent(session.remPercent)})` : '—' },
    { label: 'Core', value: session.coreMinutes > 0 ? `${formatDuration(session.coreMinutes)} (${formatPercent(session.corePercent)})` : '—' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {stats.map(({ label, value }) => (
        <Card key={label} className="py-2.5 px-3">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-sm font-semibold text-slate-200 mt-0.5">{value}</p>
        </Card>
      ))}
    </div>
  )
}
