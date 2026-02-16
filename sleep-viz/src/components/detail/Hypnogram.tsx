import { useMemo, useState } from 'react'
import type { SleepStageInterval, SleepStageType } from '../../providers/types'
import { STAGE_COLORS } from '../../lib/constants'
import { formatTime } from '../../lib/formatters'

interface HypnogramProps {
  stages: SleepStageInterval[]
  startDate: Date
  endDate: Date
}

const STAGE_Y: Record<SleepStageType, number> = {
  awake: 0,
  rem: 1,
  core: 2,
  deep: 3,
}

const STAGE_LABELS = ['Awake', 'REM', 'Core', 'Deep']

export function Hypnogram({ stages, startDate, endDate }: HypnogramProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)

  const totalMs = endDate.getTime() - startDate.getTime()
  const startMs = startDate.getTime()

  const padding = { top: 10, bottom: 30, left: 50, right: 20 }
  const width = 700
  const height = 140
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const rowH = chartH / 4

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [stages]
  )

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-600">
        No stage data available
      </div>
    )
  }

  // Generate time ticks
  const tickCount = 6
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const t = startMs + (totalMs * i) / tickCount
    return { x: (i / tickCount) * chartW, label: formatTime(new Date(t)) }
  })

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[500px]"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y-axis labels */}
        {STAGE_LABELS.map((label, i) => (
          <text
            key={label}
            x={padding.left - 8}
            y={padding.top + i * rowH + rowH / 2}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-slate-500 text-[9px]"
          >
            {label}
          </text>
        ))}

        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + i * rowH}
            x2={width - padding.right}
            y2={padding.top + i * rowH}
            className="stroke-slate-800"
            strokeWidth={0.5}
          />
        ))}

        {/* Stage rectangles */}
        {sortedStages.map((stage, i) => {
          const x = ((stage.startDate.getTime() - startMs) / totalMs) * chartW
          const w = ((stage.endDate.getTime() - stage.startDate.getTime()) / totalMs) * chartW
          const y = STAGE_Y[stage.stage] * rowH

          return (
            <rect
              key={i}
              x={padding.left + x}
              y={padding.top + y}
              width={Math.max(w, 1)}
              height={rowH}
              fill={STAGE_COLORS[stage.stage]}
              opacity={0.8}
              rx={1}
              className="cursor-pointer"
              onMouseEnter={() => {
                const duration = Math.round((stage.endDate.getTime() - stage.startDate.getTime()) / 60000)
                setTooltip({
                  x: padding.left + x + w / 2,
                  y: padding.top + y - 5,
                  label: `${stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)} · ${duration}m`,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}

        {/* X-axis time labels */}
        {ticks.map((tick, i) => (
          <text
            key={i}
            x={padding.left + tick.x}
            y={height - 5}
            textAnchor="middle"
            className="fill-slate-600 text-[8px]"
          >
            {tick.label}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 40}
              y={tooltip.y - 18}
              width={80}
              height={16}
              rx={4}
              fill="#1e293b"
              stroke="#475569"
              strokeWidth={0.5}
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 8}
              textAnchor="middle"
              className="fill-slate-200 text-[8px]"
            >
              {tooltip.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
