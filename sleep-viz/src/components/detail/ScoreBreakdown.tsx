import type { SleepScore } from '../../providers/types'
import { getScoreInfo } from '../../lib/constants'

interface ScoreBreakdownProps {
  score: SleepScore
}

const SUB_SCORES = [
  { key: 'duration' as const, label: 'Duration', weight: '25%' },
  { key: 'efficiency' as const, label: 'Efficiency', weight: '20%' },
  { key: 'deepSleep' as const, label: 'Deep Sleep', weight: '20%' },
  { key: 'rem' as const, label: 'REM', weight: '15%' },
  { key: 'latency' as const, label: 'Latency', weight: '10%' },
  { key: 'waso' as const, label: 'WASO', weight: '10%' },
]

const FALLBACK_SCORES = [
  { key: 'duration' as const, label: 'Duration', weight: '35%' },
  { key: 'efficiency' as const, label: 'Efficiency', weight: '30%' },
  { key: 'latency' as const, label: 'Latency', weight: '15%' },
  { key: 'waso' as const, label: 'WASO', weight: '20%' },
]

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const items = score.isFallback ? FALLBACK_SCORES : SUB_SCORES

  return (
    <div className="space-y-2.5">
      {items.map(({ key, label, weight }) => {
        const value = score[key]
        const info = getScoreInfo(value)
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{label} <span className="text-slate-600">({weight})</span></span>
              <span className="text-xs font-medium" style={{ color: info.color }}>{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${value}%`, backgroundColor: info.color }}
              />
            </div>
          </div>
        )
      })}
      {score.isFallback && (
        <p className="text-[10px] text-slate-600 italic mt-2">
          Stage data unavailable — using simplified scoring
        </p>
      )}
    </div>
  )
}
