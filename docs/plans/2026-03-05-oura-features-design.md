# Health Dashboard Design — Revised

**Date:** 2026-03-05 (revised)
**Scope:** Supabase backend, iOS app (data source), PWA (read-only dashboard)
**Key Change:** Central backend replaces client-only architecture. Scoring algorithm updated to match industry best practices.

---

## Architecture Overview

```
[Apple Watch] → [HealthKit] → [iOS App]
                                  ↓
                         Compute scores locally
                         (SleepScoringEngine, ReadinessEngine)
                                  ↓
                         Upsert to Supabase via supabase-swift
                                  ↓
                          [Supabase Postgres]
                          ├── Auth (Apple Sign-In)
                          ├── Row Level Security (per-user)
                          ├── Realtime subscriptions
                          └── Edge Functions (weekly report cron)
                                  ↓
                         Realtime subscription via supabase-js
                                  ↓
                          [React PWA — read-only dashboard]
```

- **iOS app** is the sole data source. It reads HealthKit, computes all scores, and pushes to Supabase.
- **PWA** is a read-only dashboard. No more XML import. Reads from Supabase, renders visualizations.
- **Auth:** Apple Sign-In only via Supabase Auth.
- **Data isolation:** Row Level Security ensures each user only sees their own data.

---

## Updated Sleep Scoring Algorithm

Based on research across Oura, WHOOP, Fitbit, PSQI, and AASM standards.

### Changes from Current Algorithm

| Metric | Old Value | New Value | Rationale |
|---|---|---|---|
| Duration weight | 25% | 35% | Fitbit uses 50%, Oura says "most significant" |
| Efficiency threshold | 90% = perfect | 85% = perfect | PSQI/CBT-I gold standard |
| Deep sleep range | 15-25% | 10-25% | 10% is normal for older adults (StatPearls) |
| Latency ideal | ≤15 min | 10-20 min | <5 min flags sleep debt (Oura, PSQI) |
| WASO ideal | ≤10 min | ≤20 min | Clinical standard for young adults |
| Timing/Consistency | Not scored | New sub-score | Oura and WHOOP both score this |
| Restoration (HR) | Not scored | New sub-score | Fitbit's 25% Restoration component |

### New Scoring Formula

**8 sub-scores, weighted composite:**

| Sub-Score | Weight | Ideal Range | Scoring |
|---|---|---|---|
| **Duration** | 30% | 7-9 hours | Below 5h=0, 7h=100; above 9h=100, 11h=0 |
| **Efficiency** | 15% | ≥85% | 85%+=100, 65%=0, linear |
| **Deep Sleep** | 12% | 10-25% of TST | Below 10%: linear 0→0, 10→100; above 25%: 25→100, 40→0 |
| **REM Sleep** | 10% | 20-25% of TST | Below 20%: linear 0→0, 20→100; above 25%: 25→100, 40→0 |
| **Latency** | 8% | 10-20 min | <5min=70 (sleep debt flag), 10-20=100, 45min=0 |
| **WASO** | 8% | ≤20 min | 20min=100, 60min=0, linear |
| **Timing** | 8% | Midpoint midnight-3AM | Midpoint in range=100, each hour off=-25 |
| **Restoration** | 9% | Sleeping HR < resting HR | HR drop 10%+=100, 0% drop=50, HR rise=30 |

**Fallback (no stage data):** Duration 40%, Efficiency 25%, Latency 10%, WASO 10%, Timing 8%, Restoration 7%

### Score Brackets (aligned with Oura)

| Label | Range |
|---|---|
| Optimal | 85-100 |
| Good | 70-84 |
| Fair | 55-69 |
| Needs Improvement | 0-54 |

### Readiness Score (unchanged from iOS, applied to both apps)

- HRV comparison (50%): 14-day rolling baseline, rMSSD metric
- Resting HR comparison (30%): 14-day rolling baseline
- Sleep Score (20%): last night's overall score
- Caution: research shows HRV and sleep are correlated, so we cap HRV weight at 50% to avoid double-counting

---

## Supabase Schema

```sql
-- Users handled by Supabase Auth (Apple Sign-In)

CREATE TABLE sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  night_date TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  -- Stats
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
  -- Scores
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
  -- Biometrics
  avg_heart_rate REAL,
  min_heart_rate REAL,
  avg_hrv REAL,
  avg_spo2 REAL,
  avg_respiratory_rate REAL,
  resting_heart_rate REAL,
  -- Stages (JSON array of {stage, startDate, endDate})
  stages JSONB,
  -- Metadata
  source_name TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, night_date)
);

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

CREATE TABLE sleep_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  duration_target_min REAL DEFAULT 480,
  score_target INT DEFAULT 75,
  bedtime_start_min INT DEFAULT 1350,  -- 22:30 in minutes from midnight
  bedtime_end_min INT DEFAULT 1380,    -- 23:00
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

CREATE POLICY "Users see own data" ON sleep_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON readiness_records
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON sleep_goals
  FOR ALL USING (auth.uid() = user_id);
```

---

## Feature 1: Coaching Tips

Same rule-based engine as before, but with updated thresholds:

- Deep sleep < 10% (was 15%) for 3+ nights → temperature advice
- Sleep efficiency < 85% → bed restriction advice
- Latency > 30 min → wind-down routine
- Latency < 5 min → sleep debt warning (NEW)
- Bedtime variance > 1 hour → consistency advice
- Score trending down 7 days → lifestyle check
- Score 85+ (was 90+) → positive reinforcement
- Low timing score → circadian alignment advice (NEW)

Tips stored nowhere — generated on-the-fly from session data by both apps.

## Feature 2: Weekly/Monthly Reports

Same design as before. Reports generated client-side from Supabase data.

Optional: Supabase Edge Function cron job generates a weekly summary and stores it for fast retrieval.

## Feature 3: Sleep Goals & Tracking

Goals stored in `sleep_goals` table in Supabase (synced between devices). Streaks and optimal bedtime computed client-side from session data.

---

## PWA Refactor

The PWA becomes a **read-only Supabase client**:

**Remove:**
- Apple Health XML parser (`parseHealthExport.ts`)
- Import components (`components/import/`)
- Dexie/IndexedDB (`db/schema.ts`)
- SleepDataContext provider (data import state)
- `useImport` hook

**Keep:**
- All visualization components (dashboard, hypnogram, trends, etc.)
- Scoring display logic (ScoreRing, formatters, constants)
- Date utilities

**Add:**
- Supabase client (`@supabase/supabase-js`)
- Apple Sign-In flow
- Realtime subscription hook for live data updates
- New hooks: `useSupabaseSessions`, `useSupabaseReadiness`, `useSupabaseGoals`
- Readiness UI components
- Coaching tips UI
- Reports UI
- Goals UI

**Scoring:** All scores are computed by the iOS app and stored in Supabase. The PWA only displays them. No scoring logic in the PWA.

## iOS Refactor

**Keep:**
- All HealthKit integration
- SleepScoringEngine (updated algorithm)
- ReadinessEngine
- SessionBuilder
- All views

**Add:**
- `supabase-swift` package
- Apple Sign-In auth flow
- Supabase sync in SyncManager (upsert after local computation)
- CoachingEngine + CoachingTipsCard
- ReportEngine + ReportsView
- GoalsEngine + GoalsView (goals synced to/from Supabase)
- Updated scoring with Timing and Restoration sub-scores

**Modify:**
- SyncManager: after computing session, upsert to Supabase
- SleepScoringEngine: add Timing and Restoration sub-scores, adjust weights
- Constants: update thresholds and brackets
