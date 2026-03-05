import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ReadinessRecord {
  id: string;
  date: string;
  score: number;
  hrvBaseline: number | null;
  hrvCurrent: number | null;
  restingHrBaseline: number | null;
  restingHrCurrent: number | null;
  sleepScoreContribution: number | null;
}

export function useSupabaseReadiness(dateRange: '7d' | '30d' | '90d' | 'all') {
  const [records, setRecords] = useState<ReadinessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      let query = supabase
        .from('readiness_records')
        .select('*')
        .order('date', { ascending: true });

      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte('date', since.toISOString().slice(0, 10));
      }

      const { data, error } = await query;
      if (!error && data) {
        setRecords(data.map(mapRowToReadiness));
      }
      setLoading(false);
    };

    fetchRecords();

    // Realtime subscription
    const channel = supabase
      .channel('readiness-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readiness_records' },
        () => { fetchRecords(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateRange]);

  return { records, loading };
}

function mapRowToReadiness(row: any): ReadinessRecord {
  return {
    id: row.id,
    date: row.date,
    score: row.score,
    hrvBaseline: row.hrv_baseline,
    hrvCurrent: row.hrv_current,
    restingHrBaseline: row.resting_hr_baseline,
    restingHrCurrent: row.resting_hr_current,
    sleepScoreContribution: row.sleep_score_contribution,
  };
}
