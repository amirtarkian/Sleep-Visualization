import type { SleepSession } from '../../providers/types'
import { Card } from '../layout/Card'
import { STAGE_COLORS } from '../../lib/constants'
import { formatDuration } from '../../lib/formatters'

interface WeeklySummaryCardProps {
  label: string
  sessions: SleepSession[]
}

export function WeeklySummaryCard({ label, sessions }: WeeklySummaryCardProps) {
  if (sessions.length === 0) return null

  const avgDeep = sessions.reduce((s, sess) => s + sess.deepPercent, 0) / sessions.length
  const avgCore = sessions.reduce((s, sess) => s + sess.corePercent, 0) / sessions.length
  const avgRem = sessions.reduce((s, sess) => s + sess.remPercent, 0) / sessions.length
  const avgAwake = sessions.reduce((s, sess) => s + sess.awakePercent, 0) / sessions.length
  const avgSleep = sessions.reduce((s, sess) => s + sess.totalSleepTime, 0) / sessions.length

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className="text-xs text-slate-500">{sessions.length} nights · avg {formatDuration(avgSleep)}</span>
      </div>
      {/* Stacked horizontal bar */}
      <div className="flex h-5 rounded overflow-hidden mb-2">
        {avgDeep > 0 && <div style={{ width: `${avgDeep}%`, backgroundColor: STAGE_COLORS.deep }} />}
        {avgCore > 0 && <div style={{ width: `${avgCore}%`, backgroundColor: STAGE_COLORS.core }} />}
        {avgRem > 0 && <div style={{ width: `${avgRem}%`, backgroundColor: STAGE_COLORS.rem }} />}
        {avgAwake > 0 && <div style={{ width: `${avgAwake}%`, backgroundColor: STAGE_COLORS.awake }} />}
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span>Deep {Math.round(avgDeep)}%</span>
        <span>Core {Math.round(avgCore)}%</span>
        <span>REM {Math.round(avgRem)}%</span>
        <span>Awake {Math.round(avgAwake)}%</span>
      </div>
    </Card>
  )
}
