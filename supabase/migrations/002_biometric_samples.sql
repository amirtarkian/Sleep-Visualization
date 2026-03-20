-- Biometric time-series samples (HR, HRV, SpO2, Respiratory Rate per sleep session)
CREATE TABLE biometric_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_night_date TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION NOT NULL
);

CREATE INDEX idx_biometric_samples_lookup
  ON biometric_samples (user_id, session_night_date, metric_type);

ALTER TABLE biometric_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own biometric samples" ON biometric_samples
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE biometric_samples;
