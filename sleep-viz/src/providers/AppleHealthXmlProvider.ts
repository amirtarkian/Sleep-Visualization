import type { SleepDataProvider } from './types'
import { parseHealthExport } from '../lib/parseHealthExport'
import { db } from '../db/schema'

export class AppleHealthXmlProvider implements SleepDataProvider {
  name = 'Apple Health XML'

  async import(file?: File): Promise<void> {
    if (!file) throw new Error('File required for XML import')
    await parseHealthExport(file, () => {})
  }

  async hasData(): Promise<boolean> {
    return (await db.sleepSessions.count()) > 0
  }

  async clearData(): Promise<void> {
    await db.transaction('rw', db.sleepSessions, db.biometricRecords, async () => {
      await db.sleepSessions.clear()
      await db.biometricRecords.clear()
    })
  }
}
