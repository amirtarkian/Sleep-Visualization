import { STAGE_COLORS } from '../../lib/constants'

const RANGES = [
  { stage: 'Deep', color: STAGE_COLORS.deep, min: 15, max: 25, unit: '% of sleep' },
  { stage: 'REM', color: STAGE_COLORS.rem, min: 20, max: 30, unit: '% of sleep' },
  { stage: 'Core', color: STAGE_COLORS.core, min: 45, max: 55, unit: '% of sleep' },
]

interface RecommendedRangesProps {
  deepPercent: number
  remPercent: number
  corePercent: number
}

export function RecommendedRanges({ deepPercent, remPercent, corePercent }: RecommendedRangesProps) {
  const actuals = [deepPercent, remPercent, corePercent]

  return (
    <div className="space-y-3">
      {RANGES.map((range, i) => {
        const actual = actuals[i]
        const inRange = actual >= range.min && actual <= range.max
        return (
          <div key={range.stage}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: range.color }} />
                <span className="text-xs text-slate-400">{range.stage}</span>
              </div>
              <span className={`text-xs font-medium ${inRange ? 'text-green-400' : 'text-yellow-400'}`}>
                {Math.round(actual)}% <span className="text-slate-600">({range.min}–{range.max}%)</span>
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-slate-800">
              {/* Recommended range indicator */}
              <div
                className="absolute h-full rounded-full bg-slate-700"
                style={{ left: `${range.min}%`, width: `${range.max - range.min}%` }}
              />
              {/* Actual value marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-slate-900"
                style={{
                  left: `${Math.min(actual, 100)}%`,
                  backgroundColor: inRange ? '#22c55e' : '#eab308',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
