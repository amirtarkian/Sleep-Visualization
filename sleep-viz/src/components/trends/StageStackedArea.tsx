import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { STAGE_COLORS } from '../../lib/constants'

interface StageStackedAreaProps {
  data: Array<{ date: string; deep: number; core: number; rem: number; awake: number }>
}

export function StageStackedArea({ data }: StageStackedAreaProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [`${Math.round(Number(value))}%`]}
          />
          <Area type="monotone" dataKey="deep" stackId="1" fill={STAGE_COLORS.deep} stroke={STAGE_COLORS.deep} />
          <Area type="monotone" dataKey="core" stackId="1" fill={STAGE_COLORS.core} stroke={STAGE_COLORS.core} />
          <Area type="monotone" dataKey="rem" stackId="1" fill={STAGE_COLORS.rem} stroke={STAGE_COLORS.rem} />
          <Area type="monotone" dataKey="awake" stackId="1" fill={STAGE_COLORS.awake} stroke={STAGE_COLORS.awake} fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
