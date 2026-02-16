import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ImportState } from './types'
import { SampleDataProvider } from './SampleDataProvider'
import { db } from '../db/schema'

interface SleepDataContextValue {
  importState: ImportState
  loadSampleData: () => Promise<void>
  importFile: (file: File) => Promise<void>
  clearData: () => Promise<void>
  hasData: boolean
  setHasData: (v: boolean) => void
}

const SleepDataContext = createContext<SleepDataContextValue | null>(null)

export function SleepDataProviderComponent({ children }: { children: ReactNode }) {
  const [importState, setImportState] = useState<ImportState>({
    status: 'idle',
    progress: 0,
    recordCount: 0,
    sessionCount: 0,
  })
  const [hasData, setHasData] = useState(false)

  const sampleProvider = new SampleDataProvider()

  const loadSampleData = useCallback(async () => {
    setImportState({ status: 'processing', progress: 30, recordCount: 0, sessionCount: 0 })
    try {
      await sampleProvider.import()
      const count = await db.sleepSessions.count()
      setImportState({ status: 'done', progress: 100, recordCount: 0, sessionCount: count })
      setHasData(true)
    } catch (e) {
      setImportState({ status: 'error', progress: 0, recordCount: 0, sessionCount: 0, error: String(e) })
    }
  }, [])

  const importFile = useCallback(async (file: File) => {
    setImportState({ status: 'reading', progress: 5, recordCount: 0, sessionCount: 0 })
    try {
      const { parseHealthExport } = await import('../lib/parseHealthExport')
      await parseHealthExport(file, (state) => setImportState(state))
      setHasData(true)
    } catch (e) {
      setImportState({ status: 'error', progress: 0, recordCount: 0, sessionCount: 0, error: String(e) })
    }
  }, [])

  const clearData = useCallback(async () => {
    await sampleProvider.clearData()
    setHasData(false)
    setImportState({ status: 'idle', progress: 0, recordCount: 0, sessionCount: 0 })
  }, [])

  return (
    <SleepDataContext.Provider value={{ importState, loadSampleData, importFile, clearData, hasData, setHasData }}>
      {children}
    </SleepDataContext.Provider>
  )
}

export function useSleepDataContext() {
  const ctx = useContext(SleepDataContext)
  if (!ctx) throw new Error('useSleepDataContext must be used within SleepDataProviderComponent')
  return ctx
}
