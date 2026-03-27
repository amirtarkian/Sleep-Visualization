import { useMemo } from 'react'
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

function buildDataPoints(sorted: SleepSession[], extractor: (s: SleepSession) => number | null | undefined): DataPoint[] {
  const vals = sorted.map(s => extractor(s) ?? null)
  const ma = computeMovingAvg(vals, 7)
  return sorted.map((s, i) => ({ date: s.nightDate, value: vals[i], movingAvg: ma[i] }))
}

const chartStyle = {
  grid: '#1e293b',
  tick: { fontSize: 10, fill: '#64748b' },
  tooltip: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' },
  tooltipLabel: { color: '#94a3b8' },
}

interface BioChartProps {
  title: string
  data: DataPoint[]
  color: string
  avgColor: string
  unit: string
  yDomain?: [number, number]
  referenceArea?: { y1: number; y2: number }
}

function BioChart({ title, data, color, avgColor, unit, yDomain, referenceArea }: BioChartProps) {
  return (
    <Card>
      <h4 className="text-xs font-medium text-slate-400 mb-3">{title}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
            <XAxis dataKey="date" tick={chartStyle.tick} tickFormatter={d => d.slice(5)} />
            <YAxis tick={chartStyle.tick} domain={yDomain} />
            <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} formatter={(v) => [`${unit === '%' ? Number(v).toFixed(1) : Math.round(Number(v))} ${unit}`]} />
            {referenceArea && <ReferenceArea y1={referenceArea.y1} y2={referenceArea.y2} fill="#22c55e" fillOpacity={0.08} />}
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={{ fill: color, r: 1.5 }} name={title} connectNulls />
            <Line type="monotone" dataKey="movingAvg" stroke={avgColor} strokeWidth={2} dot={false} name="7d Avg" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function BiometricCharts({ sessions }: BiometricChartsProps) {
  const sorted = useMemo(() => [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate)), [sessions])

  const hrvData = useMemo(() => buildDataPoints(sorted, s => s.avgHrv), [sorted])
  const hrData = useMemo(() => buildDataPoints(sorted, s => s.minHeartRate), [sorted])
  const spo2Data = useMemo(() => buildDataPoints(sorted, s => s.avgSpo2), [sorted])

  const hasHrv = hrvData.some(d => d.value !== null)
  const hasHr = hrData.some(d => d.value !== null)
  const hasSpo2 = spo2Data.some(d => d.value !== null)

  if (!hasHrv && !hasHr && !hasSpo2) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-300">Biometric Trends</h3>
      {hasHrv && <BioChart title="HRV (Heart Rate Variability)" data={hrvData} color="#a78bfa" avgColor="#8b5cf6" unit="ms" />}
      {hasHr && <BioChart title="Resting Heart Rate" data={hrData} color="#f87171" avgColor="#ef4444" unit="bpm" />}
      {hasSpo2 && <BioChart title="Blood Oxygen (SpO2)" data={spo2Data} color="#22d3ee" avgColor="#06b6d4" unit="%" yDomain={[90, 100]} referenceArea={{ y1: 95, y2: 100 }} />}
    </div>
  )
}
