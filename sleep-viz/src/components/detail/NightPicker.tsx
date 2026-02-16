import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNightDate } from '../../lib/formatters'

interface NightPickerProps {
  nightDate: string
  allDates: string[]
  onChange: (nightDate: string) => void
}

export function NightPicker({ nightDate, allDates, onChange }: NightPickerProps) {
  const currentIndex = allDates.indexOf(nightDate)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allDates.length - 1

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => hasPrev && onChange(allDates[currentIndex - 1])}
        disabled={!hasPrev}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm font-medium text-slate-200 min-w-[140px] text-center">
        {formatNightDate(nightDate)}
      </span>
      <button
        onClick={() => hasNext && onChange(allDates[currentIndex + 1])}
        disabled={!hasNext}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
