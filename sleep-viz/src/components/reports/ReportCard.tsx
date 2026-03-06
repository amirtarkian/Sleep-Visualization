import { TrendingUp, TrendingDown, Minus, Star, AlertCircle, Lightbulb, BarChart3, CheckCircle } from 'lucide-react'
import { Card } from '../layout/Card'
import { getScoreInfo } from '../../lib/constants'
import type { SleepReport } from '../../lib/reports'

const TREND_CONFIG = {
  improving: { icon: TrendingUp, color: '#22c55e', label: 'Improving' },
  declining: { icon: TrendingDown, color: '#ef4444', label: 'Declining' },
  stable: { icon: Minus, color: '#64748b', label: 'Stable' },
} as const

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

interface ReportCardProps {
  report: SleepReport
  showWeeklyBreakdown: boolean
}

export function ReportCard({ report, showWeeklyBreakdown }: ReportCardProps) {
  const TrendIcon = TREND_CONFIG[report.trendDirection].icon
  const trendColor = TREND_CONFIG[report.trendDirection].color
  const trendLabel = TREND_CONFIG[report.trendDirection].label
  const scoreInfo = getScoreInfo(report.avgScore)

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="text-center py-4">
          <p className="text-xs text-slate-500 mb-1">Avg Score</p>
          <p className="text-2xl font-bold" style={{ color: scoreInfo.color }}>
            {report.avgScore}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{scoreInfo.label}</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-xs text-slate-500 mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-slate-100">{formatDuration(report.avgDuration)}</p>
        </Card>
        <Card className="text-center py-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 mb-1">Trend</p>
          <div className="flex items-center justify-center gap-1.5">
            <TrendIcon className="h-5 w-5" style={{ color: trendColor }} />
            <p className="text-lg font-semibold" style={{ color: trendColor }}>
              {trendLabel}
            </p>
          </div>
        </Card>
      </div>

      {/* Best & Worst nights */}
      {(report.bestNight || report.worstNight) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.bestNight && (
            <Card className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2 shrink-0">
                <Star className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Best Night</p>
                <p className="text-sm font-medium text-slate-200">{report.bestNight.nightDate}</p>
                <p className="text-xs text-slate-400">
                  Score: {report.bestNight.score.overall} | {formatDuration(report.bestNight.totalSleepTime)}
                </p>
              </div>
            </Card>
          )}
          {report.worstNight && (
            <Card className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Worst Night</p>
                <p className="text-sm font-medium text-slate-200">{report.worstNight.nightDate}</p>
                <p className="text-xs text-slate-400">
                  Score: {report.worstNight.score.overall} | {formatDuration(report.worstNight.totalSleepTime)}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Insights */}
      {report.insights.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <p className="text-sm font-medium text-slate-200">Insights</p>
          </div>
          <ul className="space-y-2">
            {report.insights.map((insight, i) => (
              <li key={i} className="text-xs text-slate-400 leading-relaxed flex gap-2">
                <span className="text-slate-600 shrink-0">*</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-violet-400" />
            <p className="text-sm font-medium text-slate-200">Recommendations</p>
          </div>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-slate-400 leading-relaxed flex gap-2">
                <span className="text-slate-600 shrink-0">*</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Weekly Breakdown (monthly reports only) */}
      {showWeeklyBreakdown && report.weeklyBreakdown.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-medium text-slate-200">Weekly Breakdown</p>
          </div>
          <div className="space-y-2">
            {report.weeklyBreakdown.map(week => {
              const weekScoreInfo = getScoreInfo(week.avgScore)
              return (
                <div
                  key={week.weekLabel}
                  className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-300">{week.weekLabel}</p>
                    <p className="text-[10px] text-slate-500">{week.nightCount} nights</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">{formatDuration(week.avgDuration)}</span>
                    <span className="text-sm font-semibold min-w-[2rem] text-right" style={{ color: weekScoreInfo.color }}>
                      {week.avgScore}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
