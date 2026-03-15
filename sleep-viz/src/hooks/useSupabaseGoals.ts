import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_GOALS } from '../lib/goals';
export type { SleepGoalsConfig } from '../lib/goals';

export function useSupabaseGoals() {
  const [goals, setGoals] = useState<SleepGoalsConfig>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('sleep_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setGoals({
          durationTargetMin: data.duration_target_min ?? DEFAULT_GOALS.durationTargetMin,
          scoreTarget: data.score_target ?? DEFAULT_GOALS.scoreTarget,
          bedtimeStartMin: data.bedtime_start_min ?? DEFAULT_GOALS.bedtimeStartMin,
          bedtimeEndMin: data.bedtime_end_min ?? DEFAULT_GOALS.bedtimeEndMin,
        });
      }
      setLoading(false);
    };

    fetchGoals();

    // Realtime subscription
    const channel = supabase
      .channel('goals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_goals' },
        () => { fetchGoals(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const saveGoals = useCallback(async (config: SleepGoalsConfig) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('sleep_goals')
      .upsert({
        user_id: user.id,
        duration_target_min: config.durationTargetMin,
        score_target: config.scoreTarget,
        bedtime_start_min: config.bedtimeStartMin,
        bedtime_end_min: config.bedtimeEndMin,
      }, { onConflict: 'user_id' });

    if (!error) {
      setGoals(config);
    }
  }, []);

  return { goals, loading, saveGoals };
}
