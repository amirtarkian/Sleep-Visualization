import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { mapRowToSession } from './useSupabaseSessions'
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

      const mapped = mapRowToSession(row)
      setSession(mapped)

      // Fetch biometric time-series samples
      const { data: samples } = await supabase
        .from('biometric_samples')
        .select('*')
        .eq('session_night_date', nightDate)
        .order('timestamp', { ascending: true })

      const metricTypeMap: Record<string, BiometricRecord['type']> = {
        heart_rate: 'heartRate',
        hrv: 'hrv',
        spo2: 'spo2',
        respiratory_rate: 'respiratoryRate',
      }

      const records: BiometricRecord[] = (samples ?? []).map(s => ({
        sessionId: mapped.id,
        type: metricTypeMap[s.metric_type] ?? 'heartRate',
        value: s.value,
        date: new Date(s.timestamp),
        sourceName: 'Apple Watch',
      }))

      setBiometrics(records)

      setLoading(false)
    }

    fetch()
  }, [nightDate])

  return { session, biometrics, loading }
}
