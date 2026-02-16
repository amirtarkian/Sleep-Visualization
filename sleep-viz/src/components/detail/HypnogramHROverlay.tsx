import type { BiometricRecord } from '../../providers/types'

interface HypnogramHROverlayProps {
  heartRateData: BiometricRecord[]
  startDate: Date
  endDate: Date
}

export function HypnogramHROverlay({ heartRateData, startDate, endDate }: HypnogramHROverlayProps) {
  if (heartRateData.length < 2) return null

  const totalMs = endDate.getTime() - startDate.getTime()
  const startMs = startDate.getTime()
  const width = 700
  const height = 80
  const padding = { left: 50, right: 20, top: 10, bottom: 5 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const values = heartRateData.map(r => r.value)
  const minHR = Math.min(...values) - 2
  const maxHR = Math.max(...values) + 2
  const range = maxHR - minHR

  const points = heartRateData.map(r => {
    const x = padding.left + ((r.date.getTime() - startMs) / totalMs) * chartW
    const y = padding.top + chartH - ((r.value - minHR) / range) * chartH
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]">
      <text x={padding.left - 8} y={padding.top + 5} textAnchor="end" className="fill-slate-600 text-[8px]">
        {Math.round(maxHR)}
      </text>
      <text x={padding.left - 8} y={height - padding.bottom} textAnchor="end" className="fill-slate-600 text-[8px]">
        {Math.round(minHR)}
      </text>
      <text x={padding.left - 8} y={padding.top + chartH / 2} textAnchor="end" className="fill-slate-600 text-[8px]">
        HR
      </text>
      <polyline
        points={points}
        fill="none"
        stroke="#f87171"
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  )
}
