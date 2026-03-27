import { Card } from '../layout/Card'
import type { Insight, InsightCategory } from '../../lib/insights'

interface InsightCardsProps {
  insights: Insight[]
}

const CATEGORY_ICONS: Record<InsightCategory, string> = {
  correlation: '\u{1F517}',
  pattern: '\u{1F504}',
  biometric: '\u{1F493}',
}

export function InsightCards({ insights }: InsightCardsProps) {
  if (insights.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {insights.map(insight => (
        <Card key={insight.id} className="min-w-[260px] max-w-[300px] flex-shrink-0">
          <div className="flex items-start gap-2">
            <span className="text-lg">{CATEGORY_ICONS[insight.category]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <h4 className="text-sm font-medium text-slate-200 truncate">{insight.title}</h4>
                <span className={`text-xs ${
                  insight.direction === 'positive' ? 'text-green-400' :
                  insight.direction === 'negative' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {insight.direction === 'positive' ? '\u25B2' : insight.direction === 'negative' ? '\u25BC' : '\u2014'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
