import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { ImportState } from '../../providers/types'
import { Card } from '../layout/Card'

interface ImportProgressProps {
  state: ImportState
}

const STATUS_LABELS: Record<ImportState['status'], string> = {
  idle: 'Ready to import',
  reading: 'Reading file...',
  parsing: 'Parsing health data...',
  processing: 'Processing sleep sessions...',
  saving: 'Saving to database...',
  done: 'Import complete!',
  error: 'Import failed',
}

export function ImportProgress({ state }: ImportProgressProps) {
  if (state.status === 'idle') return null

  return (
    <Card className="mt-4">
      <div className="flex items-center gap-3 mb-3">
        {state.status === 'done' ? (
          <CheckCircle className="h-5 w-5 text-green-400" />
        ) : state.status === 'error' ? (
          <AlertCircle className="h-5 w-5 text-red-400" />
        ) : (
          <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
        )}
        <span className="text-sm font-medium text-slate-200">
          {STATUS_LABELS[state.status]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            state.status === 'error' ? 'bg-red-500' : state.status === 'done' ? 'bg-green-500' : 'bg-violet-500'
          }`}
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        {state.recordCount > 0 && <span>{state.recordCount.toLocaleString()} records</span>}
        {state.sessionCount > 0 && <span>{state.sessionCount} nights</span>}
      </div>

      {state.error && (
        <p className="mt-2 text-xs text-red-400">{state.error}</p>
      )}
    </Card>
  )
}
