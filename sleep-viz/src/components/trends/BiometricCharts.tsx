import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts'
import { Card } from '../layout/Card'
import type { SleepSession } from '../../providers/types'

interface BiometricChartsProps {
  sessions: SleepSession[]
}

interface DataPoint {
  date: string
  value: number | null
  movingAvg: number | null
}

function computeMovingAvg(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1).filter((v): v is number => v !== null)
    return slice.length >= 3 ? slice.reduce((a, b) => a + b, 0) / slice.length : null
  })
}

export function BiometricCharts({ sessions }: BiometricChartsProps) {
  const sorted = [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate))

  const hrvData: DataPoint[] = (() => {
    const vals = sorted.map(s => s.avgHrv)
    const ma = computeMovingAvg(vals, 7)
    return sorted.map((s, i) => ({ date: s.nightDate, value: s.avgHrv, movingAvg: ma[i] }))
  })()

  const hrData: DataPoint[] = (() => {
    const vals = sorted.map(s => s.minHeartRate)
    const ma = computeMovingAvg(vals, 7)
    return sorted.map((s, i) => ({ date: s.nightDate, value: s.minHeartRate, movingAvg: ma[i] }))
  })()

  const spo2Data: DataPoint[] = (() => {
    const vals = sorted.map(s => s.avgSpo2)
    const ma = computeMovingAvg(vals, 7)
    return sorted.map((s, i) => ({ date: s.nightDate, value: s.avgSpo2, movingAvg: ma[i] }))
  })()

  const hasHrv = hrvData.some(d => d.value !== null)
  const hasHr = hrData.some(d => d.value !== null)
  const hasSpo2 = spo2Data.some(d => d.value !== null)

  if (!hasHrv && !hasHr && !hasSpo2) return null

  const chartStyle = {
    grid: '#1e293b',
    tick: { fontSize: 10, fill: '#64748b' },
    tooltip: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' },
    tooltipLabel: { color: '#94a3b8' },
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-300">Biometric Trends</h3>

      {hasHrv && (
        <Card>
          <h4 className="text-xs font-medium text-slate-400 mb-3">HRV (Heart Rate Variability)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hrvData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} tickFormatter={d => d.slice(5)} />
                <YAxis tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} formatter={(v) => [`${Math.round(Number(v))} ms`]} />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={1.5} dot={{ fill: '#a78bfa', r: 1.5 }} name="HRV" connectNulls />
                <Line type="monotone" dataKey="movingAvg" stroke="#8b5cf6" strokeWidth={2} dot={false} name="7d Avg" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {hasHr && (
        <Card>
          <h4 className="text-xs font-medium text-slate-400 mb-3">Resting Heart Rate</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hrData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} tickFormatter={d => d.slice(5)} />
                <YAxis tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} formatter={(v) => [`${Math.round(Number(v))} bpm`]} />
                <Line type="monotone" dataKey="value" stroke="#f87171" strokeWidth={1.5} dot={{ fill: '#f87171', r: 1.5 }} name="Min HR" connectNulls />
                <Line type="monotone" dataKey="movingAvg" stroke="#ef4444" strokeWidth={2} dot={false} name="7d Avg" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {hasSpo2 && (
        <Card>
          <h4 className="text-xs font-medium text-slate-400 mb-3">Blood Oxygen (SpO2)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spo2Data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} tickFormatter={d => d.slice(5)} />
                <YAxis tick={chartStyle.tick} domain={[90, 100]} />
                <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} formatter={(v) => [`${Number(v).toFixed(1)}%`]} />
                <ReferenceArea y1={95} y2={100} fill="#22c55e" fillOpacity={0.08} />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={1.5} dot={{ fill: '#22d3ee', r: 1.5 }} name="SpO2" connectNulls />
                <Line type="monotone" dataKey="movingAvg" stroke="#06b6d4" strokeWidth={2} dot={false} name="7d Avg" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}
