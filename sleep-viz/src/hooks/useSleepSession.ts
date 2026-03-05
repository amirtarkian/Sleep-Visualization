import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { SleepSession, BiometricRecord } from '../providers/types'

export function useSleepSession(nightDate: string | null): {
  session: SleepSession | null
  biometrics: BiometricRecord[]
  loading: boolean
} {
  const [session, setSession] = useState<SleepSession | null>(null)
  const [biometrics, setBiometrics] = useState<BiometricRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!nightDate) {
      setSession(null)
      setBiometrics([])
      setLoading(false)
      return
    }

    const fetch = async () => {
      setLoading(true)

      const { data: row } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('night_date', nightDate)
        .single()

      if (!row) {
        setSession(null)
        setBiometrics([])
        setLoading(false)
        return
      }

      const mapped: SleepSession = {
        id: row.id,
        nightDate: row.night_date,
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        stages: row.stages ?? [],
        score: {
          overall: row.score_overall,
          duration: row.score_duration,
          efficiency: row.score_efficiency,
          deepSleep: row.score_deep,
          rem: row.score_rem,
          latency: row.score_latency,
          waso: row.score_waso,
          timing: row.score_timing ?? 0,
          restoration: row.score_restoration ?? 0,
          isFallback: row.is_fallback,
        },
        sourceName: row.source_name ?? 'Apple Watch',
        sourceNames: [row.source_name ?? 'Apple Watch'],
        timeInBed: row.time_in_bed,
        totalSleepTime: row.total_sleep_time,
        sleepEfficiency: row.sleep_efficiency,
        sleepLatency: row.sleep_latency,
        waso: row.waso,
        deepMinutes: row.deep_minutes,
        remMinutes: row.rem_minutes,
        coreMinutes: row.core_minutes,
        awakeMinutes: row.awake_minutes,
        deepPercent: row.deep_percent,
        remPercent: row.rem_percent,
        corePercent: row.core_percent,
        awakePercent: row.awake_percent,
        avgHeartRate: row.avg_heart_rate,
        minHeartRate: row.min_heart_rate,
        avgHrv: row.avg_hrv,
        avgSpo2: row.avg_spo2,
        avgRespiratoryRate: row.avg_respiratory_rate,
      }

      setSession(mapped)

      // Fetch biometrics for this session
      const { data: bioRows } = await supabase
        .from('biometric_records')
        .select('*')
        .eq('session_id', row.id)

      if (bioRows) {
        setBiometrics(bioRows.map((b: any) => ({
          id: b.id,
          sessionId: b.session_id,
          type: b.type,
          value: b.value,
          date: new Date(b.date),
          sourceName: b.source_name ?? 'Apple Watch',
        })))
      } else {
        setBiometrics([])
      }

      setLoading(false)
    }

    fetch()
  }, [nightDate])

  return { session, biometrics, loading }
}
