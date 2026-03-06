import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Heart, Activity, Moon } from 'lucide-react'
import { Section } from '../layout/Section'
import { Card } from '../layout/Card'
import { EmptyState } from '../shared/EmptyState'
import { useSupabaseReadiness } from '../../hooks/useSupabaseReadiness'
import type { ReadinessRecord } from '../../hooks/useSupabaseReadiness'
import { useAnimatedValue } from '../../hooks/useAnimatedValue'
import { getReadinessLabel, getReadinessColor } from '../../lib/readinessScore'
import type { DateRange } from '../../providers/types'
import { DateRangeSelector } from '../dashboard/DateRangeSelector'

function ReadinessRing({ score, size = 160, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
  const animatedScore = useAnimatedValue(score)
  const color = getReadinessColor(score)
  const label = getReadinessLabel(score)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = animatedScore / 100
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {Math.round(animatedScore)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{label}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">Readiness Score</p>
    </div>
  )
}

function ContributingFactors({ record }: { record: ReadinessRecord }) {
  const factors = [
    {
      label: 'HRV',
      icon: Activity,
      current: record.hrvCurrent,
      baseline: record.hrvBaseline,
      unit: 'ms',
    },
    {
      label: 'Resting HR',
      icon: Heart,
      current: record.restingHrCurrent,
      baseline: record.restingHrBaseline,
      unit: 'bpm',
    },
    {
      label: 'Sleep Score',
      icon: Moon,
      current: record.sleepScoreContribution,
      baseline: null,
      unit: '',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {factors.map(f => (
        <Card key={f.label} className="flex flex-col items-center py-3">
          <f.icon className="h-4 w-4 text-slate-400 mb-1" />
          <p className="text-xs text-slate-500 mb-1">{f.label}</p>
          {f.current != null ? (
            <>
              <p className="text-lg font-semibold text-slate-100">
                {Math.round(f.current)}
                {f.unit && <span className="text-xs text-slate-500 ml-0.5">{f.unit}</span>}
              </p>
              {f.baseline != null && (
                <p className="text-[10px] text-slate-500">
                  baseline: {Math.round(f.baseline)} {f.unit}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-600">--</p>
          )}
        </Card>
      ))}
    </div>
  )
}

function MiniTrend({ records }: { records: ReadinessRecord[] }) {
  const data = records.slice(-7).map(r => ({
    date: r.date,
    score: r.score,
  }))

  if (data.length < 2) return null

  return (
    <Card>
      <p className="text-xs font-medium text-slate-400 mb-2">7-Day Readiness Trend</p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={d => d.slice(5)}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ fill: '#eab308', r: 3 }}
              name="Readiness"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function ReadinessPanel() {
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const { records, loading } = useSupabaseReadiness(dateRange)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title="No readiness data yet"
        description="Readiness data will appear here once synced from your Apple Watch via the iOS app."
      />
    )
  }

  const latest = records[records.length - 1]

  return (
    <div className="space-y-6">
      <Section title="Readiness" subtitle="How prepared your body is for the day">
        <div className="flex items-center justify-between mb-4">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <span className="text-xs text-slate-500">{records.length} days</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="flex items-center justify-center py-6">
            <ReadinessRing score={latest.score} />
          </Card>
          <div className="space-y-4">
            <ContributingFactors record={latest} />
          </div>
        </div>

        <MiniTrend records={records} />
      </Section>
    </div>
  )
}
