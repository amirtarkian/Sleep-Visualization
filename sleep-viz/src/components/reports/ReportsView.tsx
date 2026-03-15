import { useState, useMemo } from 'react'
import { Section } from '../layout/Section'
import { EmptyState } from '../shared/EmptyState'
import { ReportCard } from './ReportCard'
import { generateWeeklyReport, generateMonthlyReport } from '../../lib/reports'
import type { SleepSession } from '../../providers/types'

type ReportPeriod = 'weekly' | 'monthly'

interface ReportsViewProps {
  sessions: SleepSession[]
}

export function ReportsView({ sessions }: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly')

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sleep data for reports"
        description="Sleep reports will appear here once you have enough data synced from the iOS app."
      />
    )
  }

  const report = useMemo(
    () => period === 'weekly'
      ? generateWeeklyReport(sessions)
      : generateMonthlyReport(sessions),
    [sessions, period]
  )

  return (
    <div className="space-y-6">
      <Section
        title="Sleep Report"
        subtitle={period === 'weekly' ? 'Last 7 nights' : 'Last 30 nights'}
      >
        {/* Period picker */}
        <div className="flex gap-1 mb-6 bg-slate-900 rounded-lg p-1 w-fit">
          {(['weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {p === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>

        <ReportCard report={report} showWeeklyBreakdown={period === 'monthly'} />
      </Section>
    </div>
  )
}
