import { useState } from 'react'
import { X } from 'lucide-react'
import type { SleepGoalsConfig } from '../../hooks/useSupabaseGoals'
import { formatTimeFromMinutes } from '../../lib/goals'

interface GoalSettingsProps {
  goals: SleepGoalsConfig
  onSave: (goals: SleepGoalsConfig) => void
  onClose: () => void
}

export function GoalSettings({ goals, onSave, onClose }: GoalSettingsProps) {
  const [draft, setDraft] = useState<SleepGoalsConfig>({ ...goals })

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  const durationHours = Math.floor(draft.durationTargetMin / 60)
  const durationMinutes = draft.durationTargetMin % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-100">Goal Settings</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Duration target */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Sleep Duration Target</label>
              <span className="text-sm text-slate-400">{durationHours}h {durationMinutes}m</span>
            </div>
            <input
              type="range"
              min={300}
              max={600}
              step={15}
              value={draft.durationTargetMin}
              onChange={e =>
                setDraft(d => ({ ...d, durationTargetMin: Number(e.target.value) }))
              }
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>5h</span>
              <span>10h</span>
            </div>
          </div>

          {/* Score target */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Score Target</label>
              <span className="text-sm text-slate-400">{draft.scoreTarget}</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={draft.scoreTarget}
              onChange={e =>
                setDraft(d => ({ ...d, scoreTarget: Number(e.target.value) }))
              }
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>50</span>
              <span>95</span>
            </div>
          </div>

          {/* Bedtime window start */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Bedtime Window Start</label>
              <span className="text-sm text-slate-400">
                {formatTimeFromMinutes(draft.bedtimeStartMin)}
              </span>
            </div>
            <input
              type="range"
              min={1260}
              max={1440}
              step={15}
              value={draft.bedtimeStartMin}
              onChange={e =>
                setDraft(d => ({ ...d, bedtimeStartMin: Number(e.target.value) }))
              }
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>9:00 PM</span>
              <span>12:00 AM</span>
            </div>
          </div>

          {/* Bedtime window end */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Bedtime Window End</label>
              <span className="text-sm text-slate-400">
                {formatTimeFromMinutes(draft.bedtimeEndMin)}
              </span>
            </div>
            <input
              type="range"
              min={1290}
              max={1500}
              step={15}
              value={draft.bedtimeEndMin}
              onChange={e =>
                setDraft(d => ({ ...d, bedtimeEndMin: Number(e.target.value) }))
              }
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>9:30 PM</span>
              <span>1:00 AM</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Save Goals
          </button>
        </div>
      </div>
    </div>
  )
}
