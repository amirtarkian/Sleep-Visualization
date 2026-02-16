import { getScoreInfo } from '../../lib/constants'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const info = getScoreInfo(score)
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: `${info.color}20`, color: info.color }}
    >
      {Math.round(score)}
    </span>
  )
}
