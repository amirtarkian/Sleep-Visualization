import { Sparkles } from 'lucide-react'

interface SampleDataButtonProps {
  onClick: () => void
  loading?: boolean
}

export function SampleDataButton({ onClick, loading }: SampleDataButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors disabled:opacity-50"
    >
      <Sparkles className="h-4 w-4" />
      {loading ? 'Generating...' : 'Load Sample Data (30 nights)'}
    </button>
  )
}
