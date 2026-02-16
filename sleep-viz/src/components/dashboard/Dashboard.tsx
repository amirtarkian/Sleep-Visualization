import { useSleepData } from '../../hooks/useSleepData'
import { useTrends } from '../../hooks/useTrends'
import { useDateRange } from '../../hooks/useDateRange'
import { Section } from '../layout/Section'
import { EmptyState } from '../shared/EmptyState'
import { ScoreRing } from './ScoreRing'
import { ScoreSparkline } from './ScoreSparkline'
import { QuickStats } from './QuickStats'
import { DateRangeSelector } from './DateRangeSelector'
import { Card } from '../layout/Card'
import { getScoreInfo } from '../../lib/constants'

interface DashboardProps {
  onNavigateImport: () => void
  onSelectNight: (nightDate: string) => void
}

export function Dashboard({ onNavigateImport, onSelectNight }: DashboardProps) {
  const { dateRange, setDateRange } = useDateRange('30d')
  const sessions = useSleepData(dateRange)
  const trends = useTrends(sessions)

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sleep data yet"
        description="Import your Apple Health export or load sample data to get started."
        action={{ label: 'Import Data', onClick: onNavigateImport }}
      />
    )
  }

  const latest = sessions[sessions.length - 1]
  const sparklineData = sessions.slice(-14).map(s => ({
    date: s.nightDate,
    score: s.score.overall,
  }))

  return (
    <div className="space-y-6">
      <Section title="Dashboard" subtitle="Your sleep at a glance">
        <div className="flex items-center justify-between mb-4">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <span className="text-xs text-slate-500">{sessions.length} nights</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="flex items-center justify-center py-4">
            <ScoreRing score={latest.score.overall} label="Latest Score" />
          </Card>
          <Card className="md:col-span-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Score Trend (14 days)</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-lg font-bold text-slate-100">{trends.avgScore7d}</span>
                <span className="text-xs text-slate-500">7-day avg</span>
                <span className="text-lg font-bold text-slate-100 ml-2">{trends.avgScore30d}</span>
                <span className="text-xs text-slate-500">30-day avg</span>
              </div>
            </div>
            <ScoreSparkline data={sparklineData} />
          </Card>
        </div>

        <QuickStats sessions={sessions} trends={trends} />
      </Section>

      {/* Recent nights list */}
      <Section title="Recent Nights">
        <div className="space-y-2">
          {sessions.slice(-7).reverse().map(s => (
            <Card
              key={s.nightDate}
              onClick={() => onSelectNight(s.nightDate)}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{s.nightDate}</p>
                <p className="text-xs text-slate-500">
                  {Math.floor(s.totalSleepTime / 60)}h {Math.round(s.totalSleepTime % 60)}m
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {s.stages.length > 0 && (
                    <div className="flex h-4 w-24 rounded overflow-hidden">
                      {s.deepPercent > 0 && <div className="bg-stage-deep" style={{ width: `${s.deepPercent}%` }} />}
                      {s.corePercent > 0 && <div className="bg-stage-core" style={{ width: `${s.corePercent}%` }} />}
                      {s.remPercent > 0 && <div className="bg-stage-rem" style={{ width: `${s.remPercent}%` }} />}
                      {s.awakePercent > 0 && <div className="bg-stage-awake" style={{ width: `${s.awakePercent}%` }} />}
                    </div>
                  )}
                </div>
                <span
                  className="text-lg font-bold min-w-[2.5rem] text-right"
                  style={{ color: getScoreInfo(s.score.overall).color }}
                >
                  {s.score.overall}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}
