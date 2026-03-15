import { useMemo } from 'react'
import { AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { Card } from '../layout/Card'
import { Section } from '../layout/Section'
import { generateTips } from '../../lib/coachingTips'
import type { CoachingTip } from '../../lib/coachingTips'
import type { SleepSession } from '../../providers/types'

const ICON_MAP: Record<CoachingTip['type'], { icon: typeof AlertTriangle; color: string; bgClass: string }> = {
  warning: { icon: AlertTriangle, color: '#f97316', bgClass: 'bg-orange-500/10' },
  info: { icon: Info, color: '#3b82f6', bgClass: 'bg-blue-500/10' },
  positive: { icon: CheckCircle, color: '#22c55e', bgClass: 'bg-green-500/10' },
}

function TipCard({ tip }: { tip: CoachingTip }) {
  const { icon: Icon, color, bgClass } = ICON_MAP[tip.type]

  return (
    <Card className="flex gap-3 items-start">
      <div className={`rounded-lg p-2 ${bgClass} shrink-0`}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{tip.title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tip.message}</p>
      </div>
    </Card>
  )
}

interface CoachingTipsProps {
  sessions: SleepSession[]
}

export function CoachingTips({ sessions }: CoachingTipsProps) {
  const tips = useMemo(() => generateTips(sessions), [sessions])

  if (tips.length === 0) return null

  return (
    <Section title="Coaching Tips" subtitle="Personalized insights based on your recent sleep">
      <div className="space-y-3">
        {tips.map(tip => (
          <TipCard key={tip.id} tip={tip} />
        ))}
      </div>
    </Section>
  )
}
