import { useState, useEffect, useCallback } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/dashboard/Dashboard'
import { NightDetail } from './components/detail/NightDetail'
import { TrendsView } from './components/trends/TrendsView'
import { StageDistribution } from './components/stages/StageDistribution'
import { FileImport } from './components/import/FileImport'
import { ImportProgress } from './components/import/ImportProgress'
import { SampleDataButton } from './components/import/SampleDataButton'
import { Section } from './components/layout/Section'
import { Card } from './components/layout/Card'
import { useSleepDataContext } from './providers/SleepDataContext'
import { useImport } from './hooks/useImport'
import { db } from './db/schema'
import { Trash2 } from 'lucide-react'

function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedNight, setSelectedNight] = useState<string | null>(null)
  const { hasData, setHasData } = useSleepDataContext()
  const { importState, loadSampleData, handleFileDrop, clearData } = useImport()

  // Check for existing data on mount
  useEffect(() => {
    db.sleepSessions.count().then(count => {
      if (count > 0) setHasData(true)
    })
  }, [setHasData])

  const handleSelectNight = useCallback((nightDate: string) => {
    setSelectedNight(nightDate)
    setActiveSection('detail')
  }, [])

  const handleNavigateImport = useCallback(() => {
    setActiveSection('import')
  }, [])

  return (
    <AppShell activeSection={activeSection} onNavigate={setActiveSection}>
      {activeSection === 'dashboard' && (
        <Dashboard
          onNavigateImport={handleNavigateImport}
          onSelectNight={handleSelectNight}
        />
      )}

      {activeSection === 'detail' && (
        <NightDetail
          nightDate={selectedNight}
          onSelectNight={setSelectedNight}
          onNavigateImport={handleNavigateImport}
        />
      )}

      {activeSection === 'trends' && (
        <>
          <TrendsView onNavigateImport={handleNavigateImport} />
          {hasData && <StageDistribution />}
        </>
      )}

      {activeSection === 'import' && (
        <Section title="Import Data" subtitle="Import your Apple Health export or load sample data">
          <div className="max-w-xl mx-auto space-y-4">
            <FileImport
              onFileDrop={handleFileDrop}
              disabled={importState.status !== 'idle' && importState.status !== 'done' && importState.status !== 'error'}
            />
            <ImportProgress state={importState} />

            <div className="flex items-center gap-3">
              <SampleDataButton
                onClick={loadSampleData}
                loading={importState.status === 'processing'}
              />
            </div>

            {hasData && (
              <Card className="mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Clear All Data</p>
                    <p className="text-xs text-slate-500">Remove all imported sleep data</p>
                  </div>
                  <button
                    onClick={clearData}
                    className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </Card>
            )}

            {importState.status === 'done' && (
              <button
                onClick={() => setActiveSection('dashboard')}
                className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
                View Dashboard
              </button>
            )}
          </div>
        </Section>
      )}
    </AppShell>
  )
}

export default App
