import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface DurationBarChartProps {
  data: Array<{ date: string; duration: number }>
}

export function DurationBarChart({ data }: DurationBarChartProps) {
  const chartData = data.map(d => ({
    date: d.date,
    hours: Math.round((d.duration / 60) * 10) / 10,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [`${value}h`, 'Sleep']}
          />
          <ReferenceLine y={8} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '8h goal', position: 'right', fill: '#22c55e', fontSize: 10 }} />
          <Bar dataKey="hours" fill="#3b82f6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
