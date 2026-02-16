import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface EfficiencyTrendLineProps {
  data: Array<{ date: string; efficiency: number }>
}

export function EfficiencyTrendLine({ data }: EfficiencyTrendLineProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} />
          <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [`${Math.round(Number(value))}%`, 'Efficiency']}
          />
          <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="efficiency" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
