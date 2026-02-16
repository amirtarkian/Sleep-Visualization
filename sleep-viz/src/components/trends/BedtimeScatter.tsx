import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMinutesAsTime } from '../../lib/formatters'

interface BedtimeScatterProps {
  data: Array<{ date: string; bedtime: number; wakeTime: number }>
}

export function BedtimeScatter({ data }: BedtimeScatterProps) {
  const bedtimeData = data.map((d, i) => ({ x: i, y: d.bedtime, date: d.date }))
  const wakeData = data.map((d, i) => ({ x: i, y: d.wakeTime, date: d.date }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis type="number" dataKey="x" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={i => data[i]?.date?.slice(5) ?? ''} />
          <YAxis type="number" dataKey="y" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => formatMinutesAsTime(v)} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => formatMinutesAsTime(Number(value))}
          />
          <Scatter name="Bedtime" data={bedtimeData} fill="#a78bfa" />
          <Scatter name="Wake" data={wakeData} fill="#facc15" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
