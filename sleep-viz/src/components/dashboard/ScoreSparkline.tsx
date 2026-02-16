import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { getScoreInfo } from '../../lib/constants'

interface ScoreSparklineProps {
  data: Array<{ date: string; score: number }>
}

export function ScoreSparkline({ data }: ScoreSparklineProps) {
  if (data.length < 2) return null

  const latestScore = data[data.length - 1]?.score ?? 0
  const color = getScoreInfo(latestScore).color

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [Math.round(Number(value)), 'Score']}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
