import type { BiometricRecord, BiometricType, SleepSession } from '../providers/types'

/**
 * Filter biometric records that fall within a session's time window.
 */
export function filterBiometricsForSession(
  records: BiometricRecord[],
  session: { startDate: Date; endDate: Date },
): BiometricRecord[] {
  const start = session.startDate.getTime()
  const end = session.endDate.getTime()
  return records.filter(r => {
    const t = r.date.getTime()
    return t >= start && t <= end
  })
}

/**
 * Compute biometric summary for a session.
 */
export function computeBiometricSummary(
  records: BiometricRecord[],
): Pick<SleepSession, 'avgHeartRate' | 'minHeartRate' | 'avgHrv' | 'avgSpo2' | 'avgRespiratoryRate'> {
  const byType = groupByType(records)

  return {
    avgHeartRate: average(byType.heartRate),
    minHeartRate: minimum(byType.heartRate),
    avgHrv: average(byType.hrv),
    avgSpo2: average(byType.spo2),
    avgRespiratoryRate: average(byType.respiratoryRate),
  }
}

function groupByType(records: BiometricRecord[]): Record<BiometricType, number[]> {
  const result: Record<BiometricType, number[]> = {
    heartRate: [],
    hrv: [],
    spo2: [],
    respiratoryRate: [],
    bodyTemperature: [],
  }
  for (const r of records) {
    result[r.type].push(r.value)
  }
  return result
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

function minimum(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.min(...values)
}
