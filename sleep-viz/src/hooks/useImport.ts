import { useCallback } from 'react'
import { useSleepDataContext } from '../providers/SleepDataContext'

export function useImport() {
  const { importState, loadSampleData, importFile, clearData } = useSleepDataContext()

  const handleFileDrop = useCallback(async (file: File) => {
    if (file.name.endsWith('.xml') || file.name.endsWith('.zip')) {
      await importFile(file)
    }
  }, [importFile])

  return {
    importState,
    loadSampleData,
    handleFileDrop,
    clearData,
  }
}
