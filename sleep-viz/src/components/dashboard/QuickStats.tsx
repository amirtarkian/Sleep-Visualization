import { Clock, Moon, Battery, TrendingDown } from 'lucide-react'
import { StatsCard } from '../shared/StatsCard'
import { formatDuration, formatMinutesAsTime, formatPercent } from '../../lib/formatters'
import type { SleepSession, TrendData } from '../../providers/types'
import { circularMeanTime, bedtimeMinutes } from '../../lib/dateUtils'

interface QuickStatsProps {
  sessions: SleepSession[]
  trends: TrendData
}

export function QuickStats({ sessions, trends }: QuickStatsProps) {
  if (sessions.length === 0) return null

  const avgSleep = sessions.reduce((sum, s) => sum + s.totalSleepTime, 0) / sessions.length
  const avgEfficiency = sessions.reduce((sum, s) => sum + s.sleepEfficiency, 0) / sessions.length
  const bedtimes = sessions.map(s => bedtimeMinutes(s.startDate))
  const avgBedtime = circularMeanTime(bedtimes)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatsCard
        label="Avg Sleep"
        value={formatDuration(avgSleep)}
        icon={<Clock className="h-5 w-5" />}
      />
      <StatsCard
        label="Efficiency"
        value={formatPercent(avgEfficiency)}
        icon={<Battery className="h-5 w-5" />}
      />
      <StatsCard
        label="Avg Bedtime"
        value={formatMinutesAsTime(avgBedtime)}
        icon={<Moon className="h-5 w-5" />}
      />
      <StatsCard
        label="Sleep Debt"
        value={`${trends.sleepDebt}h`}
        sublabel="over 14 nights"
        icon={<TrendingDown className="h-5 w-5" />}
      />
    </div>
  )
}
