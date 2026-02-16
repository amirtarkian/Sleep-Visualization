import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface ScoreTrendChartProps {
  data: Array<{ date: string; score: number; ma7?: number }>
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  // Compute 7-day moving average
  const enriched = data.map((d, i) => {
    const window = data.slice(Math.max(0, i - 6), i + 1)
    const ma7 = window.reduce((sum, w) => sum + w.score, 0) / window.length
    return { ...d, ma7: Math.round(ma7) }
  })

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={enriched} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <ReferenceLine y={75} stroke="#334155" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={1.5} dot={{ fill: '#3b82f6', r: 2 }} name="Score" />
          <Line type="monotone" dataKey="ma7" stroke="#a78bfa" strokeWidth={2} dot={false} name="7-day MA" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
