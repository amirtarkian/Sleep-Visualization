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

      setSession(mapRowToSession(row))

      // Biometrics are stored inline on the session row, not in a separate table
      setBiometrics([])

      setLoading(false)
    }

    fetch()
  }, [nightDate])

  return { session, biometrics, loading }
}
