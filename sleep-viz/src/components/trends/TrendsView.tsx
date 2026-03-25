import { useTrends } from '../../hooks/useTrends'
import { useInsights } from '../../hooks/useInsights'
import { Section } from '../layout/Section'
import { Card } from '../layout/Card'
import { EmptyState } from '../shared/EmptyState'
import { ScoreTrendChart } from './ScoreTrendChart'
import { DurationBarChart } from './DurationBarChart'
import { BedtimeScatter } from './BedtimeScatter'
import { StageStackedArea } from './StageStackedArea'
import { EfficiencyTrendLine } from './EfficiencyTrendLine'
import { HeartRateTrend } from './HeartRateTrend'
import { InsightCards } from './InsightCards'
import { BiometricCharts } from './BiometricCharts'
import { bedtimeMinutes, dateToMinutesFromMidnight } from '../../lib/dateUtils'
import type { SleepSession } from '../../providers/types'

interface TrendsViewProps {
  sessions: SleepSession[]
}

export function TrendsView({ sessions }: TrendsViewProps) {
  const trends = useTrends(sessions)
  const insights = useInsights(sessions)

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No trend data"
        description="Sleep data will appear here once synced from your Apple Watch via the iOS app."
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
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Trend: <span className={
              trends.trendDirection === 'improving' ? 'text-green-400' :
              trends.trendDirection === 'declining' ? 'text-red-400' : 'text-slate-400'
            }>{trends.trendDirection}</span></span>
            <span>SRI: {trends.sri}min</span>
          </div>
        </div>
      </Section>

      <InsightCards insights={insights} />

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

      <BiometricCharts sessions={sessions} />
    </div>
  )
}
