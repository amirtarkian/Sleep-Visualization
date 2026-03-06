-- Sleep Sessions
CREATE TABLE sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  night_date TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  time_in_bed REAL,
  total_sleep_time REAL,
  sleep_efficiency REAL,
  sleep_latency REAL,
  waso REAL,
  deep_minutes REAL,
  rem_minutes REAL,
  core_minutes REAL,
  awake_minutes REAL,
  deep_percent REAL,
  rem_percent REAL,
  core_percent REAL,
  awake_percent REAL,
  score_overall INT,
  score_duration INT,
  score_efficiency INT,
  score_deep INT,
  score_rem INT,
  score_latency INT,
  score_waso INT,
  score_timing INT,
  score_restoration INT,
  is_fallback BOOLEAN DEFAULT FALSE,
  avg_heart_rate REAL,
  min_heart_rate REAL,
  avg_hrv REAL,
  avg_spo2 REAL,
  avg_respiratory_rate REAL,
  resting_heart_rate REAL,
  stages JSONB,
  source_name TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, night_date)
);

-- Readiness Records
CREATE TABLE readiness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date TEXT NOT NULL,
  score INT,
  hrv_baseline REAL,
  hrv_current REAL,
  resting_hr_baseline REAL,
  resting_hr_current REAL,
  sleep_score_contribution INT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Sleep Goals
CREATE TABLE sleep_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  duration_target_min REAL DEFAULT 480,
  score_target INT DEFAULT 75,
  bedtime_start_min INT DEFAULT 1350,
  bedtime_end_min INT DEFAULT 1380,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_sessions_user_date ON sleep_sessions(user_id, night_date);
CREATE INDEX idx_readiness_user_date ON readiness_records(user_id, date);

-- Row Level Security
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions" ON sleep_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own readiness" ON readiness_records
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own goals" ON sleep_goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for PWA subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE sleep_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE readiness_records;
ALTER PUBLICATION supabase_realtime ADD TABLE sleep_goals;
