import type { ImportState, BiometricRecord } from '../providers/types'
import { parseAppleHealthDate } from './dateUtils'
import { groupIntoSessions } from './sleepSessions'
import { db, serializeSession, serializeBiometric } from '../db/schema'
import { unzipSync } from 'fflate'

interface RawSleepRecord {
  type: string
  startDate: Date
  endDate: Date
  sourceName: string
  value?: string
}

const SLEEP_CATEGORY_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis'
const BIOMETRIC_TYPES: Record<string, string> = {
  'HKQuantityTypeIdentifierHeartRate': 'heartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': 'hrv',
  'HKQuantityTypeIdentifierOxygenSaturation': 'spo2',
  'HKQuantityTypeIdentifierRespiratoryRate': 'respiratoryRate',
  'HKQuantityTypeIdentifierBodyTemperature': 'bodyTemperature',
}

async function getXmlText(file: File): Promise<string> {
  if (file.name.endsWith('.zip')) {
    const buffer = await file.arrayBuffer()
    const unzipped = unzipSync(new Uint8Array(buffer))
    // Find export.xml inside the zip
    for (const [name, data] of Object.entries(unzipped)) {
      if (name.endsWith('export.xml') || name === 'apple_health_export/export.xml') {
        return new TextDecoder().decode(data)
      }
    }
    // Fallback: find any .xml file
    for (const [name, data] of Object.entries(unzipped)) {
      if (name.endsWith('.xml')) {
        return new TextDecoder().decode(data)
      }
    }
    throw new Error('No export.xml found in zip file')
  }
  return file.text()
}

/**
 * Stream-parse the XML using chunked regex matching for performance.
 * This avoids loading the full DOM for large files.
 */
function parseRecords(xml: string, onProgress: (pct: number) => void) {
  const sleepRecords: RawSleepRecord[] = []
  const biometricRecords: BiometricRecord[] = []

  // Match <Record> elements with the types we care about
  const recordRegex = /<Record\s+[^>]*?type="([^"]*)"[^>]*?\/?>/g
  const totalLength = xml.length
  let match: RegExpExecArray | null
  let lastProgressPct = 0

  while ((match = recordRegex.exec(xml)) !== null) {
    const recordType = match[1]
    const recordStr = match[0]

    // Report progress
    const pct = Math.round((match.index / totalLength) * 100)
    if (pct > lastProgressPct) {
      lastProgressPct = pct
      onProgress(pct)
    }

    if (recordType === SLEEP_CATEGORY_TYPE) {
      const sourceName = recordStr.match(/sourceName="([^"]*)"/)?.[1] ?? 'Unknown'
      const startStr = recordStr.match(/startDate="([^"]*)"/)?.[1]
      const endStr = recordStr.match(/endDate="([^"]*)"/)?.[1]
      const value = recordStr.match(/value="([^"]*)"/)?.[1]

      if (startStr && endStr) {
        sleepRecords.push({
          type: recordType,
          startDate: parseAppleHealthDate(startStr),
          endDate: parseAppleHealthDate(endStr),
          sourceName,
          value,
        })
      }
    } else if (BIOMETRIC_TYPES[recordType]) {
      const sourceName = recordStr.match(/sourceName="([^"]*)"/)?.[1] ?? 'Unknown'
      const startStr = recordStr.match(/startDate="([^"]*)"/)?.[1]
      const valueStr = recordStr.match(/value="([^"]*)"/)?.[1]

      if (startStr && valueStr) {
        const numValue = parseFloat(valueStr)
        if (!isNaN(numValue)) {
          biometricRecords.push({
            sessionId: '', // will be assigned later
            type: BIOMETRIC_TYPES[recordType] as BiometricRecord['type'],
            value: recordType === 'HKQuantityTypeIdentifierOxygenSaturation' ? numValue * 100 : numValue,
            date: parseAppleHealthDate(startStr),
            sourceName,
          })
        }
      }
    }
  }

  return { sleepRecords, biometricRecords }
}

export async function parseHealthExport(
  file: File,
  onStateChange: (state: ImportState) => void,
): Promise<void> {
  onStateChange({ status: 'reading', progress: 5, recordCount: 0, sessionCount: 0 })

  const xmlText = await getXmlText(file)

  onStateChange({ status: 'parsing', progress: 10, recordCount: 0, sessionCount: 0 })

  const { sleepRecords, biometricRecords } = parseRecords(xmlText, (pct) => {
    onStateChange({
      status: 'parsing',
      progress: 10 + Math.round(pct * 0.6),
      recordCount: sleepRecords.length + biometricRecords.length,
      sessionCount: 0,
    })
  })

  onStateChange({
    status: 'processing',
    progress: 75,
    recordCount: sleepRecords.length + biometricRecords.length,
    sessionCount: 0,
  })

  // Group into sessions
  const sessions = groupIntoSessions(sleepRecords, biometricRecords)

  // Assign biometric sessionIds
  for (const session of sessions) {
    const start = session.startDate.getTime()
    const end = session.endDate.getTime()
    for (const bio of biometricRecords) {
      const t = bio.date.getTime()
      if (t >= start && t <= end && !bio.sessionId) {
        bio.sessionId = session.id
      }
    }
  }

  const assignedBiometrics = biometricRecords.filter(b => b.sessionId)

  onStateChange({
    status: 'saving',
    progress: 85,
    recordCount: sleepRecords.length + biometricRecords.length,
    sessionCount: sessions.length,
  })

  // Clear existing data and save
  await db.transaction('rw', db.sleepSessions, db.biometricRecords, async () => {
    await db.sleepSessions.clear()
    await db.biometricRecords.clear()
    await db.sleepSessions.bulkPut(sessions.map(serializeSession))
    // Write biometrics in batches of 500
    for (let i = 0; i < assignedBiometrics.length; i += 500) {
      const batch = assignedBiometrics.slice(i, i + 500)
      await db.biometricRecords.bulkPut(batch.map(serializeBiometric))
    }
  })

  onStateChange({
    status: 'done',
    progress: 100,
    recordCount: sleepRecords.length + assignedBiometrics.length,
    sessionCount: sessions.length,
  })
}
