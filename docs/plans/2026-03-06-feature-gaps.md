# Sleep Visualization — Feature Gaps & Roadmap

## Current State

The app has two frontends (iOS SwiftUI + React PWA) backed by Supabase. Core features implemented: sleep scoring (8 sub-scores), readiness score, coaching tips, weekly/monthly reports, goals & streaks. The PWA reads data from Supabase; the iOS app is the sole data source via HealthKit.

**What works end-to-end:** PWA auth, PWA data display, PWA realtime updates, all PWA business logic, 86 passing tests, clean build.

**What doesn't work yet:** iOS-to-Supabase sync (SupabaseService is stubbed), iOS background sync (no-op), PWA biometrics display (always empty).

---

## Phase 1 — Critical (Blocking End-to-End)

### 1.1 Implement iOS SupabaseService

**Severity:** Critical — no data flows from iOS to Supabase without this.

**File:** `Amir-SleepApp/Services/SupabaseService.swift`

Every method is a TODO stub:
- `signInWithApple()` — sets `isAuthenticated = true` without token exchange
- `signOut()` — clears local state only, no Supabase API call
- `checkSession()` — always returns false
- `pushSleepSession()` — guard check only, no upsert
- `pushReadinessRecord()` — guard check only, no upsert
- `pushGoals()` — references wrong table name (`user_goals` vs `sleep_goals`)
- `fetchGoals()` — always returns nil

**How to fix:**
1. Add `supabase-swift` package in Xcode (File > Add Package Dependencies)
2. Initialize Supabase client with URL/key from Info.plist
3. Implement Apple Sign-In via `supabase.auth.signInWithApple()`
4. Implement upsert calls for each push method using `supabase.from("table").upsert()`
5. Implement `fetchGoals()` with `supabase.from("sleep_goals").select().single()`

### 1.2 Fix iOS Background Sync

**Severity:** Critical — background sync never runs.

**File:** `Amir-SleepApp/Amir_SleepAppApp.swift:39-45`

`handleBackgroundSync` immediately marks the task complete without calling `syncManager.sync()`.

**How to fix:**
```swift
private func handleBackgroundSync(task: BGAppRefreshTask) {
    task.expirationHandler = { task.setTaskCompleted(success: false) }
    Amir_SleepAppApp.scheduleNextBackgroundSync()
    Task {
        await syncManager.sync(modelContext: modelContainer.mainContext)
        task.setTaskCompleted(success: true)
    }
}
```

### 1.3 Align Sleep Scoring Thresholds

**Severity:** Critical — same night produces different scores on each platform.

The PWA has its own `sleepScore.ts` that's used by `sleepSessions.ts` (for the import path) and tests. While the PWA normally reads pre-computed scores from Supabase, the thresholds diverge from iOS:

| Metric | iOS | PWA | Action |
|--------|-----|-----|--------|
| Duration min | 5h | 4h | Align to 5h |
| Efficiency threshold | 85% | 90% | Align to 85% |
| Deep sleep min | 10% | 15% | Align to 10% |
| REM max | 25% | 30% | Align to 25% |
| WASO ideal | <=20min | <=10min | Align to 20min |
| Latency | Complex (sleep-debt bonus) | Simple linear | Match iOS formula |
| Timing | Implemented | Hardcoded 0 | Implement in PWA |
| Restoration | Implemented | Hardcoded 0 | Implement in PWA |

**How to fix:** Update `sleepScore.ts` to match iOS `SleepScoringEngine.swift` exactly. Add timing and restoration scoring. Update affected tests.

### 1.4 Remove Debug Auth Bypass

**Severity:** High — allows skipping authentication in production.

**File:** `Amir-SleepApp/Views/Auth/SignInView.swift:42-46`

"Continue without sign in" button sets `isAuthenticated = true` without credentials.

**How to fix:** Wrap in `#if DEBUG`:
```swift
#if DEBUG
Button("Continue without sign in") {
    supabase.isAuthenticated = true
}
#endif
```

---

## Phase 2 — High Priority (User-Facing Bugs)

### 2.1 Fix PWA Biometrics Display

**Severity:** High — NightDetail biometrics panel always shows "Not available."

**File:** `sleep-viz/src/hooks/useSleepSession.ts:80-81`

`setBiometrics([])` is hardcoded because biometrics are stored inline on the session row (avgHeartRate, avgHrv, etc.), not in a separate `biometric_records` table.

**How to fix:** Modify `useSleepSession.ts` to populate biometrics from the session's inline fields:
```typescript
const syntheticBiometrics: BiometricRecord[] = []
if (mapped.avgHeartRate) {
  syntheticBiometrics.push({ type: 'heartRate', value: mapped.avgHeartRate, ... })
}
// Same for minHeartRate, avgHrv, avgSpo2, avgRespiratoryRate
setBiometrics(syntheticBiometrics)
```

Or refactor `BiometricsPanel` and `NightDetail` to read directly from session fields instead of a separate biometrics array.

### 2.2 Add iOS Test Suite

**Severity:** High — zero test coverage on iOS.

The iOS app has only empty test stubs. All engines (SleepScoringEngine, CoachingEngine, ReportEngine, GoalsEngine) lack tests.

**How to fix:** Create XCTest files for each engine:
- `SleepScoringEngineTests.swift` — test all 8 sub-scores, boundary values, fallback mode
- `CoachingEngineTests.swift` — test all 7 rules, priority sorting, max 3 tip limit
- `ReportEngineTests.swift` — test weekly/monthly generation, insights, edge cases
- `GoalsEngineTests.swift` — test goal checks, streaks, optimal bedtime, midnight crossing

### 2.3 Fix Silent Error Swallowing

**Severity:** High — sync failures are invisible to the user.

**File:** `Amir-SleepApp/Services/SyncManager.swift`

Multiple `try?` calls silently discard errors:
- Line 72: `(try? await healthKit.fetchRestingHeartRate(...)) ?? []`
- Line 137: `try? await supabase.pushSleepSession(payload)`
- Line 239: `try? await supabase.pushReadinessRecord(payload)`

**How to fix:**
- Replace `try?` with `do/catch` blocks for Supabase push calls
- Accumulate push errors in `syncError` so they surface in the Settings > Cloud Sync UI
- Keep `try?` acceptable for optional biometric fetches (graceful degradation)

### 2.4 Add PWA Auth Error Handling

**Severity:** Medium — no feedback on sign-in failure.

**File:** `sleep-viz/src/hooks/useAuth.ts`

`signInWithApple()` doesn't handle errors. If OAuth fails, the user sees nothing.

**How to fix:** Add `error` state to the hook, catch errors in `signInWithApple`, display in `SignIn.tsx`.

---

## Phase 3 — Medium Priority (Consistency & Correctness)

### 3.1 Filter Realtime Subscriptions by User

**Files:** `useSupabaseSessions.ts`, `useSupabaseReadiness.ts`, `useSupabaseGoals.ts`

All subscribe to `event: '*'` on the whole table. Any user's insert triggers a re-fetch for all connected clients. Currently safe because RLS filters query results, but wasteful.

**How to fix:** Add filter parameter:
```typescript
.on('postgres_changes', {
  event: '*', schema: 'public', table: 'sleep_sessions',
  filter: `user_id=eq.${userId}`
}, () => { fetchSessions(); })
```

Requires passing `userId` into each hook.

### 3.2 Add Supabase `updated_at` Trigger

**File:** `supabase/migrations/001_initial_schema.sql`

`sleep_goals.updated_at` defaults to `NOW()` on insert but never updates.

**How to fix:** Add a new migration:
```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sleep_goals_updated_at
  BEFORE UPDATE ON sleep_goals
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

### 3.3 Align Cross-Platform Coaching Rules

| Rule | iOS | PWA | Fix |
|------|-----|-----|-----|
| Low deep sleep | Last 3 consecutive | Any 3 of last 7 | Align to "any 3 of last 7" |
| Declining trend | Needs 7 sessions | Needs 6 sessions | Align to 7 |
| Sleep debt (latency < 5min) | Checks `> 0` | Doesn't check `> 0` | Add `> 0` check to PWA |

### 3.4 Align Cross-Platform Report Thresholds

| Metric | iOS | PWA | Fix |
|--------|-----|-----|-----|
| Trend threshold | >3 points | >5 points | Align to 5 |
| Deep sleep recommendation | <30min absolute | <13% of TST | Align to percentage |
| Weekend vs weekday insight | Implemented | Missing | Add to PWA |

### 3.5 Fix PWA Duplicate `SleepGoalsConfig` Type

Two identical interfaces exist:
- `sleep-viz/src/hooks/useSupabaseGoals.ts`
- `sleep-viz/src/lib/goals.ts`

**How to fix:** Export from one location, import in the other.

---

## Phase 4 — New Features

### 4.1 Notifications & Reminders
- Bedtime reminder (iOS local notifications, PWA Push API)
- Goal achievement alerts
- Weekly summary notification
- "You haven't synced in X days" nudge

### 4.2 Data Export
- CSV export of sleep sessions
- PDF weekly/monthly report generation
- Shareable sleep score card (image)

### 4.3 Onboarding Flow
- First-launch tutorial explaining score components
- HealthKit permission walkthrough (iOS)
- Goal-setting wizard for new users

### 4.4 Theme Support
- Light/dark mode toggle
- System theme auto-detection
- Custom accent colors

### 4.5 Accessibility
- VoiceOver labels on all iOS views
- ARIA labels on PWA interactive elements
- Keyboard navigation for PWA
- High-contrast mode
- Dynamic type support (iOS)

### 4.6 Social & Comparison
- Anonymous sleep benchmarks (percentile vs age group)
- Share sleep score to social media
- Household/family sleep comparison

### 4.7 Advanced Analytics
- Sleep debt accumulation tracker
- Circadian rhythm analysis
- Correlation with external factors (exercise, caffeine, screen time)
- AI-powered sleep insights using historical patterns

---

## Quick Reference

| Priority | Count | Theme |
|----------|-------|-------|
| Phase 1 (Critical) | 4 items | End-to-end pipeline, scoring parity, security |
| Phase 2 (High) | 4 items | Biometrics display, iOS tests, error handling |
| Phase 3 (Medium) | 5 items | Cross-platform consistency, schema fixes |
| Phase 4 (New Features) | 7 categories | Notifications, export, onboarding, accessibility |
