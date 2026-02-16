import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { SleepSession } from '../../providers/types'

interface HeartRateTrendProps {
  sessions: SleepSession[]
}

export function HeartRateTrend({ sessions }: HeartRateTrendProps) {
  const data = sessions
    .filter(s => s.avgHeartRate !== null)
    .map(s => ({
      date: s.nightDate,
      avg: s.avgHeartRate,
      min: s.minHeartRate,
    }))

  if (data.length < 2) {
    return <p className="text-sm text-slate-600 text-center py-8">Insufficient heart rate data</p>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [`${Math.round(Number(value))} bpm`]}
          />
          <Line type="monotone" dataKey="avg" stroke="#f87171" strokeWidth={2} dot={{ fill: '#f87171', r: 2 }} name="Avg HR" />
          <Line type="monotone" dataKey="min" stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Min HR" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
