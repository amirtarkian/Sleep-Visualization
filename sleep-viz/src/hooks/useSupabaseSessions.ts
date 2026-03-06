import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SleepSession } from '../providers/types';

export function useSupabaseSessions(dateRange: '7d' | '30d' | '90d' | 'all') {
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      let query = supabase
        .from('sleep_sessions')
        .select('*')
        .order('night_date', { ascending: true });

      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte('night_date', since.toISOString().slice(0, 10));
      }

      const { data, error } = await query;
      if (!error && data) {
        setSessions(data.map(mapRowToSession));
      }
      setLoading(false);
    };

    fetchSessions();

    // Realtime subscription
    const channel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_sessions' },
        () => { fetchSessions(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateRange]);

  return { sessions, loading };
}

function mapRowToSession(row: any): SleepSession {
  return {
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
  };
}
