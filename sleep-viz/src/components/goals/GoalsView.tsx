import { useState } from 'react'
import { Flame, Target, Clock, Settings, Sparkles } from 'lucide-react'
import { Section } from '../layout/Section'
import { Card } from '../layout/Card'
import { EmptyState } from '../shared/EmptyState'
import { StreakCalendar } from './StreakCalendar'
import { GoalSettings } from './GoalSettings'
import { useSupabaseGoals } from '../../hooks/useSupabaseGoals'
import {
  checkDurationGoalMet,
  checkScoreGoalMet,
  checkBedtimeGoalMet,
  computeStreak,
  computeOptimalBedtime,
  formatTimeFromMinutes,
} from '../../lib/goals'
import type { SleepSession } from '../../providers/types'

interface GoalsViewProps {
  sessions: SleepSession[]
}

export function GoalsView({ sessions }: GoalsViewProps) {
  const { goals, saveGoals } = useSupabaseGoals()
  const [showSettings, setShowSettings] = useState(false)

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sleep data for goals"
        description="Goals and streaks will appear here once you have sleep data synced from the iOS app."
      />
    )
  }

  const durationStreak = computeStreak(sessions, s =>
    checkDurationGoalMet(s, goals.durationTargetMin)
  )
  const scoreStreak = computeStreak(sessions, s =>
    checkScoreGoalMet(s, goals.scoreTarget)
  )
  const bedtimeStreak = computeStreak(sessions, s =>
    checkBedtimeGoalMet(s, goals.bedtimeStartMin, goals.bedtimeEndMin)
  )

  const optimalBedtime = computeOptimalBedtime(sessions)

  const streakCards = [
    {
      label: 'Duration',
      icon: Clock,
      streak: durationStreak,
      target: `${Math.floor(goals.durationTargetMin / 60)}h ${goals.durationTargetMin % 60}m`,
      color: '#3b82f6',
      bgClass: 'bg-blue-500/10',
    },
    {
      label: 'Score',
      icon: Target,
      streak: scoreStreak,
      target: `${goals.scoreTarget}+`,
      color: '#a78bfa',
      bgClass: 'bg-violet-500/10',
    },
    {
      label: 'Bedtime',
      icon: Clock,
      streak: bedtimeStreak,
      target: `${formatTimeFromMinutes(goals.bedtimeStartMin)} - ${formatTimeFromMinutes(goals.bedtimeEndMin)}`,
      color: '#f59e0b',
      bgClass: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <Section title="Sleep Goals" subtitle="Track your sleep habits and streaks">
        {/* Settings button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Edit Goals
          </button>
        </div>

        {/* Streak cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {streakCards.map(card => (
            <Card key={card.label} className="text-center py-4">
              <div className={`inline-flex rounded-lg p-2 ${card.bgClass} mb-2`}>
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <p className="text-xs text-slate-500 mb-1">{card.label} Streak</p>
              <div className="flex items-center justify-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-2xl font-bold text-slate-100">{card.streak}</span>
                <span className="text-xs text-slate-500">nights</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Target: {card.target}</p>
            </Card>
          ))}
        </div>

        {/* Streak Calendar */}
        <Card className="mb-6">
          <StreakCalendar sessions={sessions} goals={goals} />
        </Card>

        {/* Optimal Bedtime */}
        {optimalBedtime && (
          <Card className="flex items-center gap-4">
            <div className="rounded-lg bg-violet-500/10 p-3 shrink-0">
              <Sparkles className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Optimal Bedtime</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Based on your best-scoring nights, aim for bed between{' '}
                <span className="text-slate-200 font-medium">
                  {formatTime(optimalBedtime.startHour, optimalBedtime.startMin)}
                </span>{' '}
                and{' '}
                <span className="text-slate-200 font-medium">
                  {formatTime(optimalBedtime.endHour, optimalBedtime.endMin)}
                </span>
                .
              </p>
            </div>
          </Card>
        )}
      </Section>

      {/* Settings modal */}
      {showSettings && (
        <GoalSettings
          goals={goals}
          onSave={saveGoals}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
}
