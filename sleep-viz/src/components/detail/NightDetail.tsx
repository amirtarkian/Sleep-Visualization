import { useAllSessions } from '../../hooks/useSleepData'
import { useSleepSession } from '../../hooks/useSleepSession'
import { Section } from '../layout/Section'
import { Card } from '../layout/Card'
import { EmptyState } from '../shared/EmptyState'
import { ScoreRing } from '../dashboard/ScoreRing'
import { NightPicker } from './NightPicker'
import { Hypnogram } from './Hypnogram'
import { HypnogramHROverlay } from './HypnogramHROverlay'
import { StagePieChart } from './StagePieChart'
import { NightStatsPanel } from './NightStatsPanel'
import { ScoreBreakdown } from './ScoreBreakdown'
import { BiometricsPanel } from './BiometricsPanel'

interface NightDetailProps {
  nightDate: string | null
  onSelectNight: (nightDate: string) => void
  onNavigateImport: () => void
}

export function NightDetail({ nightDate, onSelectNight, onNavigateImport }: NightDetailProps) {
  const allSessions = useAllSessions()
  const allDates = allSessions.map(s => s.nightDate)
  const effectiveDate = nightDate ?? allDates[allDates.length - 1] ?? null
  const { session, biometrics, loading } = useSleepSession(effectiveDate)

  if (allDates.length === 0) {
    return (
      <EmptyState
        title="No sleep data"
        description="Import data to view night details."
        action={{ label: 'Import Data', onClick: onNavigateImport }}
      />
    )
  }

  if (!session || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-slate-600">Loading...</div>
      </div>
    )
  }

  const hrData = biometrics.filter(b => b.type === 'heartRate')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Section title="Night Detail" className="mb-0">
          <div />
        </Section>
        <NightPicker nightDate={effectiveDate!} allDates={allDates} onChange={onSelectNight} />
      </div>

      {/* Score + Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center justify-center py-6">
          <ScoreRing score={session.score.overall} />
        </Card>
        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Score Breakdown</h3>
          <ScoreBreakdown score={session.score} />
        </Card>
      </div>

      {/* Hypnogram */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Sleep Stages</h3>
        <Hypnogram stages={session.stages} startDate={session.startDate} endDate={session.endDate} />
        {hrData.length > 0 && (
          <>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-600">
              <div className="w-4 h-0.5 bg-red-400 rounded" /> Heart Rate
            </div>
            <HypnogramHROverlay heartRateData={hrData} startDate={session.startDate} endDate={session.endDate} />
          </>
        )}
      </Card>

      {/* Stage pie + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-2">Stage Distribution</h3>
          <StagePieChart
            deepMinutes={session.deepMinutes}
            coreMinutes={session.coreMinutes}
            remMinutes={session.remMinutes}
            awakeMinutes={session.awakeMinutes}
          />
        </Card>
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-2">Night Stats</h3>
          <NightStatsPanel session={session} />
        </div>
      </div>

      {/* Biometrics */}
      <Section title="Biometrics">
        <BiometricsPanel biometrics={biometrics} />
      </Section>
    </div>
  )
}
