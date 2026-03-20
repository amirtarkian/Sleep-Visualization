import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithApple = useCallback(async () => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
      if (authError) {
        setError(authError.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { user, loading, error, signInWithApple, signOut, clearError };
}
