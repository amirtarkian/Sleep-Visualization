import { useAnimatedValue } from '../../hooks/useAnimatedValue'
import { getScoreInfo } from '../../lib/constants'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ScoreRing({ score, size = 160, strokeWidth = 10, label = 'Sleep Score' }: ScoreRingProps) {
  const animatedScore = useAnimatedValue(score)
  const info = getScoreInfo(score)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = animatedScore / 100
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={info.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: info.color }}>
            {Math.round(animatedScore)}
          </span>
          <span className="text-xs text-slate-500 mt-0.5">{info.label}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">{label}</p>
    </div>
  )
}
