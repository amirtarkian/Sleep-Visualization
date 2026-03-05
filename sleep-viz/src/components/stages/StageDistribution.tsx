import { Section } from '../layout/Section'
import { Card } from '../layout/Card'
import { WeeklySummaryCard } from './WeeklySummaryCard'
import { RecommendedRanges } from './RecommendedRanges'
import type { SleepSession } from '../../providers/types'

interface StageDistributionProps {
  sessions: SleepSession[]
}

export function StageDistribution({ sessions }: StageDistributionProps) {
  if (sessions.length === 0) return null

  // Split into weekly buckets
  const weeks: Array<{ label: string; sessions: SleepSession[] }> = []
  const sorted = [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate))

  let weekStart = 0
  while (weekStart < sorted.length) {
    const weekEnd = Math.min(weekStart + 7, sorted.length)
    const weekSessions = sorted.slice(weekStart, weekEnd)
    const label = `${weekSessions[0].nightDate.slice(5)} – ${weekSessions[weekSessions.length - 1].nightDate.slice(5)}`
    weeks.push({ label, sessions: weekSessions })
    weekStart = weekEnd
  }

  // Averages for recommended ranges
  const avgDeep = sessions.reduce((s, sess) => s + sess.deepPercent, 0) / sessions.length
  const avgCore = sessions.reduce((s, sess) => s + sess.corePercent, 0) / sessions.length
  const avgRem = sessions.reduce((s, sess) => s + sess.remPercent, 0) / sessions.length

  return (
    <div className="space-y-6">
      <Section title="Stage Distribution" subtitle="Weekly breakdown over 30 days">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {weeks.map(w => (
            <WeeklySummaryCard key={w.label} label={w.label} sessions={w.sessions} />
          ))}
        </div>
      </Section>

      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">vs. Recommended Ranges</h3>
        <RecommendedRanges deepPercent={avgDeep} remPercent={avgRem} corePercent={avgCore} />
      </Card>
    </div>
  )
}
