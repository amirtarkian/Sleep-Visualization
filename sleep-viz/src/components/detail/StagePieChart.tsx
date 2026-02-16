import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { STAGE_COLORS } from '../../lib/constants'
import { formatDuration } from '../../lib/formatters'

interface StagePieChartProps {
  deepMinutes: number
  coreMinutes: number
  remMinutes: number
  awakeMinutes: number
}

export function StagePieChart({ deepMinutes, coreMinutes, remMinutes, awakeMinutes }: StagePieChartProps) {
  const data = [
    { name: 'Deep', value: deepMinutes, color: STAGE_COLORS.deep },
    { name: 'Core', value: coreMinutes, color: STAGE_COLORS.core },
    { name: 'REM', value: remMinutes, color: STAGE_COLORS.rem },
    { name: 'Awake', value: awakeMinutes, color: STAGE_COLORS.awake },
  ].filter(d => d.value > 0)

  if (data.length === 0) return null

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name) => [formatDuration(Number(value)), name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            {d.name} · {formatDuration(d.value)}
          </div>
        ))}
      </div>
    </div>
  )
}
