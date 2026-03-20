# Phase 2 Design — High Priority User-Facing Fixes

## 2.1 Time-Series Biometrics Pipeline

### Problem
PWA NightDetail biometrics panel always shows "Not available" because `useSleepSession` hardcodes `setBiometrics([])`. Biometric data exists only as aggregates on the session row (avgHeartRate, avgHrv, etc.) — no time-series data for charts.

### Design
New `biometric_samples` table in Supabase:

```sql
CREATE TABLE biometric_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  session_night_date text NOT NULL,
  metric_type text NOT NULL,  -- 'heart_rate' | 'hrv' | 'spo2' | 'respiratory_rate'
  timestamp timestamptz NOT NULL,
  value double precision NOT NULL
);

CREATE INDEX idx_biometric_samples_lookup
  ON biometric_samples (user_id, session_night_date, metric_type);

ALTER TABLE biometric_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own ON biometric_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY insert_own ON biometric_samples FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**iOS (SyncManager)**: After fetching HR/HRV/SpO2/RR samples per session, batch-push raw samples to `biometric_samples` via `SupabaseService.pushBiometricSamples()`. Samples are already fetched — forward them instead of only computing averages.

**PWA (useSleepSession)**: Fetch from `biometric_samples` where `session_night_date = nightDate`, group by `metric_type`, map to `BiometricRecord[]`. Existing BiometricsPanel renders charts from this data.

**Data volume**: ~500 rows per night (480 HR at 1/min, ~8 each for HRV/SpO2/RR). Manageable.

## 2.2 iOS Test Suite

### Problem
Zero test coverage on iOS. All 4 engines (SleepScoringEngine, CoachingEngine, ReportEngine, GoalsEngine) have no tests.

### Design
4 test files using Swift Testing framework (`import Testing`, `@Test`):

- **SleepScoringEngineTests.swift** (~20 tests): All 8 sub-score functions at boundary values (0, ideal, max), `computeSleepScore` with and without stages (fallback mode).
- **CoachingEngineTests.swift** (~12 tests): Each of 7 heuristic rules, priority sorting, max 3 tip limit, empty sessions.
- **ReportEngineTests.swift** (~10 tests): Weekly/monthly generation, trend detection (improving/declining/stable), insights thresholds, empty sessions.
- **GoalsEngineTests.swift** (~12 tests): Goal checks (duration, score, bedtime), streak counting, optimal bedtime, midnight crossing.

All tests are pure logic — no HealthKit or Supabase mocking needed.

## 2.3 SyncManager Error Surfacing

### Problem
`try?` on Supabase push calls silently discards errors. `syncError` is captured but never displayed in SettingsView.

### Design

**SyncManager**:
- Replace `try? await supabase.pushSleepSession(payload)` and `try? await supabase.pushReadinessRecord(payload)` with `do/catch` blocks.
- Accumulate errors into a local `pushErrors: [String]` array during sync.
- After sync, set `syncError` to summary if any pushes failed (e.g., "2 sessions failed to sync").
- Keep `try?` for biometric fetches (graceful degradation is correct).

**SettingsView**:
- Display `syncManager.syncError` as red warning text below sync status.
- Add "Retry Sync" button when error is present.

## 2.4 PWA Auth Error Handling

### Problem
`useAuth.ts` has no error state. If OAuth fails, user sees nothing.

### Design

**useAuth.ts**:
- Add `error: string | null` state.
- Wrap `signInWithOAuth` in try/catch, set error on failure.
- Return `error` and `clearError` function.

**SignIn.tsx**:
- Display error in red text below sign-in button (matching iOS SignInView pattern).
- Clear error on retry.
