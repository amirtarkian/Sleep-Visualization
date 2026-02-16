import { useSleepData } from '../../hooks/useSleepData'
import { useTrends } from '../../hooks/useTrends'
import { useDateRange } from '../../hooks/useDateRange'
import { Section } from '../layout/Section'
import { Card } from '../layout/Card'
import { EmptyState } from '../shared/EmptyState'
import { DateRangeSelector } from '../dashboard/DateRangeSelector'
import { ScoreTrendChart } from './ScoreTrendChart'
import { DurationBarChart } from './DurationBarChart'
import { BedtimeScatter } from './BedtimeScatter'
import { StageStackedArea } from './StageStackedArea'
import { EfficiencyTrendLine } from './EfficiencyTrendLine'
import { HeartRateTrend } from './HeartRateTrend'
import { bedtimeMinutes, dateToMinutesFromMidnight } from '../../lib/dateUtils'

interface TrendsViewProps {
  onNavigateImport: () => void
}

export function TrendsView({ onNavigateImport }: TrendsViewProps) {
  const { dateRange, setDateRange } = useDateRange('30d')
  const sessions = useSleepData(dateRange)
  const trends = useTrends(sessions)

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No trend data"
        description="Import data to see trends over time."
        action={{ label: 'Import Data', onClick: onNavigateImport }}
      />
    )
  }

  const scoreTrendData = trends.dates.map((d, i) => ({ date: d, score: trends.scores[i] }))
  const durationData = trends.dates.map((d, i) => ({ date: d, duration: trends.durations[i] }))
  const bedtimeData = sessions.map(s => ({
    date: s.nightDate,
    bedtime: bedtimeMinutes(s.startDate),
    wakeTime: dateToMinutesFromMidnight(s.endDate),
  }))
  const stageData = trends.dates.map((d, i) => ({
    date: d,
    deep: trends.deepPercents[i],
    core: trends.corePercents[i],
    rem: trends.remPercents[i],
    awake: 100 - trends.deepPercents[i] - trends.corePercents[i] - trends.remPercents[i],
  }))
  const efficiencyData = trends.dates.map((d, i) => ({ date: d, efficiency: trends.efficiencies[i] }))

  return (
    <div className="space-y-6">
      <Section title="Trends" subtitle="Your sleep patterns over time">
        <div className="flex items-center justify-between mb-4">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Trend: <span className={
              trends.trendDirection === 'improving' ? 'text-green-400' :
              trends.trendDirection === 'declining' ? 'text-red-400' : 'text-slate-400'
            }>{trends.trendDirection}</span></span>
            <span>SRI: {trends.sri}min</span>
          </div>
        </div>
      </Section>

      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Sleep Score</h3>
        <ScoreTrendChart data={scoreTrendData} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Duration</h3>
          <DurationBarChart data={durationData} />
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Bedtime & Wake Consistency</h3>
          <BedtimeScatter data={bedtimeData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Stage Composition</h3>
          <StageStackedArea data={stageData} />
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Efficiency</h3>
          <EfficiencyTrendLine data={efficiencyData} />
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Heart Rate During Sleep</h3>
        <HeartRateTrend sessions={sessions} />
      </Card>
    </div>
  )
}
