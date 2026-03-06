# Health Dashboard Implementation Plan — Revised

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Supabase backend, update scoring algorithm to industry best practices, refactor PWA to read-only dashboard, add coaching tips / reports / goals to both apps.

**Architecture:** iOS reads HealthKit → computes scores → pushes to Supabase Postgres. PWA reads from Supabase via realtime subscriptions. Apple Sign-In auth. Row Level Security.

**Tech Stack:** Supabase (Postgres + Auth + Realtime), React/TypeScript/Recharts (PWA), SwiftUI/SwiftData/HealthKit (iOS), supabase-swift, @supabase/supabase-js, Vitest

---

## Phase 1: Supabase Backend Setup

### Task 1: Create Supabase Project and Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/.env.example`

**Step 1: Install Supabase CLI and init**

Run: `brew install supabase/tap/supabase && cd /Users/atarkian2/conductor/workspaces/Sleep-Visualization/lima && supabase init`
Expected: Creates `supabase/` directory with config

**Step 2: Write the initial migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
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
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own readiness" ON readiness_records
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own goals" ON sleep_goals
  FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for PWA subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE sleep_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE readiness_records;
ALTER PUBLICATION supabase_realtime ADD TABLE sleep_goals;
```

**Step 3: Create .env.example**

Create `supabase/.env.example`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Create the Supabase project via dashboard**

Manual step: Go to https://supabase.com/dashboard, create a new project. Note the URL and anon key.

Then enable Apple Sign-In: Dashboard → Authentication → Providers → Apple → Enable. Follow the Apple Developer setup instructions for Sign in with Apple.

**Step 5: Apply migration**

Run: `supabase db push` (if linked) or paste SQL into Supabase SQL Editor.

**Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase project config and initial schema"
```

---

## Phase 2: iOS — Updated Scoring Algorithm

### Task 2: Update SleepScoringEngine — Tests

**Files:**
- Modify: `Amir-SleepApp/Amir-SleepAppTests/Amir_SleepAppTests.swift`

**Step 1: Add tests for new scoring functions**

```swift
import XCTest
@testable import Amir_SleepApp

final class SleepScoringTests: XCTestCase {
    // Duration: 7-9h = 100
    func testScoreDuration_optimal() {
        XCTAssertEqual(SleepScoringEngine.scoreDuration(totalSleepMinutes: 480), 100)
    }
    func testScoreDuration_short() {
        XCTAssertEqual(SleepScoringEngine.scoreDuration(totalSleepMinutes: 300), 0) // 5h
    }
    func testScoreDuration_long() {
        XCTAssertEqual(SleepScoringEngine.scoreDuration(totalSleepMinutes: 660), 0) // 11h
    }

    // Efficiency: 85%+ = 100 (updated from 90%)
    func testScoreEfficiency_85() {
        XCTAssertEqual(SleepScoringEngine.scoreEfficiency(efficiency: 85), 100)
    }
    func testScoreEfficiency_65() {
        XCTAssertEqual(SleepScoringEngine.scoreEfficiency(efficiency: 65), 0)
    }

    // Deep: 10-25% = 100 (updated from 15-25%)
    func testScoreDeepSleep_10percent() {
        XCTAssertEqual(SleepScoringEngine.scoreDeepSleep(deepPercent: 10), 100)
    }
    func testScoreDeepSleep_5percent() {
        XCTAssertEqual(SleepScoringEngine.scoreDeepSleep(deepPercent: 5), 50)
    }

    // Latency: 10-20 min = 100, <5 min = 70 (sleep debt)
    func testScoreLatency_15min() {
        XCTAssertEqual(SleepScoringEngine.scoreLatency(latencyMinutes: 15), 100)
    }
    func testScoreLatency_3min_sleepDebt() {
        XCTAssertEqual(SleepScoringEngine.scoreLatency(latencyMinutes: 3), 70)
    }
    func testScoreLatency_45min() {
        XCTAssertEqual(SleepScoringEngine.scoreLatency(latencyMinutes: 45), 0)
    }

    // WASO: ≤20 min = 100 (updated from 10)
    func testScoreWaso_20min() {
        XCTAssertEqual(SleepScoringEngine.scoreWaso(wasoMinutes: 20), 100)
    }

    // Timing: midpoint midnight-3AM = 100
    func testScoreTiming_1am() {
        // midnight = 0, 3AM = 180 → midpoint of midnight-3AM
        XCTAssertEqual(SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: 90), 100)
    }
    func testScoreTiming_5am() {
        let score = SleepScoringEngine.scoreTiming(midpointMinutesFromMidnight: 300)
        XCTAssertLessThan(score, 50)
    }

    // Restoration: HR drop 10%+ = 100
    func testScoreRestoration_goodDrop() {
        XCTAssertEqual(SleepScoringEngine.scoreRestoration(sleepingHR: 54, restingHR: 60), 100)
    }
    func testScoreRestoration_noDrop() {
        XCTAssertEqual(SleepScoringEngine.scoreRestoration(sleepingHR: 60, restingHR: 60), 50)
    }
}
```

**Step 2: Run tests to verify they fail**

Run: In Xcode, Cmd+U to run tests.
Expected: FAIL — `scoreTiming` and `scoreRestoration` not found; other tests fail on updated thresholds.

**Step 3: Commit**

```bash
git add Amir-SleepApp/Amir-SleepAppTests/
git commit -m "test: add tests for updated scoring algorithm (red)"
```

---

### Task 3: Update SleepScoringEngine — Implementation

**Files:**
- Modify: `Amir-SleepApp/Amir-SleepApp/Services/SleepScoringEngine.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Utilities/Constants.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Models/SleepSession.swift` (add new score fields)

**Step 1: Update Constants.swift**

Replace score weights:

```swift
enum ScoreWeights {
    static let duration = 0.30
    static let efficiency = 0.15
    static let deepSleep = 0.12
    static let rem = 0.10
    static let latency = 0.08
    static let waso = 0.08
    static let timing = 0.08
    static let restoration = 0.09
}

enum ScoreWeightsFallback {
    static let duration = 0.40
    static let efficiency = 0.25
    static let latency = 0.10
    static let waso = 0.10
    static let timing = 0.08
    static let restoration = 0.07
}
```

Update `getScoreInfo`:

```swift
func getScoreInfo(_ score: Int) -> ScoreInfo {
    switch score {
    case 85...100: return ScoreInfo(label: "Optimal", color: Color(hex: "#22c55e"))
    case 70...84: return ScoreInfo(label: "Good", color: Color(hex: "#3b82f6"))
    case 55...69: return ScoreInfo(label: "Fair", color: Color(hex: "#eab308"))
    default: return ScoreInfo(label: "Needs Improvement", color: Color(hex: "#ef4444"))
    }
}
```

**Step 2: Update SleepScoreData model**

In `SleepSession.swift`, add new fields to `SleepScoreData`:

```swift
struct SleepScoreData: Codable {
    let overall: Int
    let duration: Int
    let efficiency: Int
    let deepSleep: Int
    let rem: Int
    let latency: Int
    let waso: Int
    let timing: Int
    let restoration: Int
    let isFallback: Bool
}
```

**Step 3: Update SleepScoringEngine**

In `SleepScoringEngine.swift`, update existing functions and add new ones:

```swift
enum SleepScoringEngine {
    private static func clamp(_ value: Double, min: Double, max: Double) -> Double {
        Swift.max(min, Swift.min(max, value))
    }
    private static func linearScale(_ value: Double, min: Double, max: Double) -> Double {
        clamp((value - min) / (max - min) * 100, min: 0, max: 100)
    }

    // Duration: 7-9h = 100 (unchanged range, weight changed)
    static func scoreDuration(totalSleepMinutes: Double) -> Int {
        let hours = totalSleepMinutes / 60.0
        if hours >= 7 && hours <= 9 { return 100 }
        if hours < 7 { return Int(linearScale(hours, min: 5, max: 7)) }
        return Int(linearScale(11 - hours, min: 0, max: 2))
    }

    // Efficiency: 85%+ = 100 (updated from 90%)
    static func scoreEfficiency(efficiency: Double) -> Int {
        if efficiency >= 85 { return 100 }
        return Int(linearScale(efficiency, min: 65, max: 85))
    }

    // Deep: 10-25% = 100 (updated from 15-25%)
    static func scoreDeepSleep(deepPercent: Double) -> Int {
        if deepPercent >= 10 && deepPercent <= 25 { return 100 }
        if deepPercent < 10 { return Int(linearScale(deepPercent, min: 0, max: 10)) }
        return Int(linearScale(40 - deepPercent, min: 0, max: 15))
    }

    // REM: 20-25% = 100 (tightened from 20-30%)
    static func scoreRem(remPercent: Double) -> Int {
        if remPercent >= 20 && remPercent <= 25 { return 100 }
        if remPercent < 20 { return Int(linearScale(remPercent, min: 0, max: 20)) }
        return Int(linearScale(40 - remPercent, min: 0, max: 15))
    }

    // Latency: 10-20 min = 100, <5 min = 70 (sleep debt), >45 min = 0
    static func scoreLatency(latencyMinutes: Double) -> Int {
        if latencyMinutes < 5 { return 70 }
        if latencyMinutes >= 10 && latencyMinutes <= 20 { return 100 }
        if latencyMinutes < 10 { return Int(70 + (latencyMinutes - 5) / 5 * 30) }
        return Int(clamp(linearScale(45 - latencyMinutes, min: 0, max: 25), min: 0, max: 100))
    }

    // WASO: ≤20 min = 100 (updated from 10), 60 min = 0
    static func scoreWaso(wasoMinutes: Double) -> Int {
        if wasoMinutes <= 20 { return 100 }
        return Int(linearScale(60 - wasoMinutes, min: 0, max: 40))
    }

    // NEW: Timing — sleep midpoint between midnight-3AM = 100
    static func scoreTiming(midpointMinutesFromMidnight: Double) -> Int {
        // Ideal range: 0 (midnight) to 180 (3AM)
        // Each hour outside range = -25 points
        let midpoint = midpointMinutesFromMidnight
        if midpoint >= 0 && midpoint <= 180 { return 100 }
        let distanceFromRange: Double
        if midpoint < 0 {
            distanceFromRange = abs(midpoint)
        } else if midpoint > 180 {
            distanceFromRange = midpoint - 180
        } else {
            distanceFromRange = 0
        }
        let hoursOff = distanceFromRange / 60.0
        return Int(clamp(100 - hoursOff * 25, min: 0, max: 100))
    }

    // NEW: Restoration — sleeping HR vs resting HR
    static func scoreRestoration(sleepingHR: Double, restingHR: Double) -> Int {
        guard restingHR > 0 else { return 50 }
        let dropPercent = (restingHR - sleepingHR) / restingHR * 100
        if dropPercent >= 10 { return 100 }
        if dropPercent <= 0 { return 30 }
        // Linear 0% drop = 50, 10% drop = 100
        return Int(50 + dropPercent * 5)
    }

    // Updated composite
    static func computeSleepScore(
        totalSleepTime: Double,
        sleepEfficiency: Double,
        deepPercent: Double,
        remPercent: Double,
        sleepLatency: Double,
        waso: Double,
        hasStages: Bool,
        midpointMinutesFromMidnight: Double,
        sleepingHR: Double,
        restingHR: Double
    ) -> SleepScoreData {
        let dur = scoreDuration(totalSleepMinutes: totalSleepTime)
        let eff = scoreEfficiency(efficiency: sleepEfficiency)
        let lat = scoreLatency(latencyMinutes: sleepLatency)
        let w = scoreWaso(wasoMinutes: waso)
        let tim = scoreTiming(midpointMinutesFromMidnight: midpointMinutesFromMidnight)
        let res = scoreRestoration(sleepingHR: sleepingHR, restingHR: restingHR)

        if hasStages {
            let dep = scoreDeepSleep(deepPercent: deepPercent)
            let rem = scoreRem(remPercent: remPercent)
            let overall = Int(
                Double(dur) * ScoreWeights.duration +
                Double(eff) * ScoreWeights.efficiency +
                Double(dep) * ScoreWeights.deepSleep +
                Double(rem) * ScoreWeights.rem +
                Double(lat) * ScoreWeights.latency +
                Double(w) * ScoreWeights.waso +
                Double(tim) * ScoreWeights.timing +
                Double(res) * ScoreWeights.restoration
            )
            return SleepScoreData(
                overall: min(100, max(0, overall)),
                duration: dur, efficiency: eff, deepSleep: dep, rem: rem,
                latency: lat, waso: w, timing: tim, restoration: res,
                isFallback: false
            )
        } else {
            let overall = Int(
                Double(dur) * ScoreWeightsFallback.duration +
                Double(eff) * ScoreWeightsFallback.efficiency +
                Double(lat) * ScoreWeightsFallback.latency +
                Double(w) * ScoreWeightsFallback.waso +
                Double(tim) * ScoreWeightsFallback.timing +
                Double(res) * ScoreWeightsFallback.restoration
            )
            return SleepScoreData(
                overall: min(100, max(0, overall)),
                duration: dur, efficiency: eff, deepSleep: 0, rem: 0,
                latency: lat, waso: w, timing: tim, restoration: res,
                isFallback: true
            )
        }
    }
}
```

**Step 4: Update SyncManager to pass new parameters**

In `SyncManager.swift`, when calling `computeSleepScore`, compute the sleep midpoint and pass `sleepingHR` (avgHeartRate from biometrics) and `restingHR` (from HealthKit resting HR):

```swift
// Compute midpoint
let midpoint = startDate.timeIntervalSince(startDate.startOfDay) / 60.0
let sleepMidpointMin = midpoint + (stats.timeInBed / 2.0)
// Normalize: if past midnight, subtract 1440
let normalizedMidpoint = sleepMidpointMin >= 1440 ? sleepMidpointMin - 1440 : sleepMidpointMin

let restingHRSamples = try await healthKit.fetchRestingHeartRate(
    from: Calendar.current.date(byAdding: .day, value: -1, to: startDate)!,
    to: endDate
)
let restingHR = restingHRSamples.isEmpty ? 0 : restingHRSamples.map(\.value).reduce(0, +) / Double(restingHRSamples.count)

let score = SleepScoringEngine.computeSleepScore(
    totalSleepTime: stats.totalSleepTime,
    sleepEfficiency: stats.sleepEfficiency,
    deepPercent: stats.deepPercent,
    remPercent: stats.remPercent,
    sleepLatency: stats.sleepLatency,
    waso: stats.waso,
    hasStages: !stageIntervals.isEmpty,
    midpointMinutesFromMidnight: normalizedMidpoint,
    sleepingHR: biometrics.avgHeartRate ?? 0,
    restingHR: restingHR
)
```

**Step 5: Run tests**

Run: Xcode Cmd+U
Expected: All scoring tests PASS

**Step 6: Commit**

```bash
git add Amir-SleepApp/
git commit -m "feat: update scoring algorithm to industry best practices (iOS)"
```

---

### Task 4: iOS — Add Supabase SDK and Auth

**Files:**
- Modify: `Amir-SleepApp/Amir-SleepApp.xcodeproj` (add package dependency)
- Create: `Amir-SleepApp/Amir-SleepApp/Services/SupabaseClient.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/Amir_SleepAppApp.swift` (add auth gate)

**Step 1: Add supabase-swift package**

In Xcode: File → Add Package Dependencies → URL: `https://github.com/supabase/supabase-swift` → Add Package.

**Step 2: Create SupabaseClient singleton**

Create `Amir-SleepApp/Amir-SleepApp/Services/SupabaseClient.swift`:

```swift
import Foundation
import Supabase

enum AppSupabase {
    static let client = SupabaseClient(
        supabaseURL: URL(string: Secrets.supabaseURL)!,
        supabaseKey: Secrets.supabaseAnonKey
    )
}

// Store in a plist or environment — not in source control
private enum Secrets {
    static let supabaseURL = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? ""
    static let supabaseAnonKey = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String ?? ""
}
```

**Step 3: Add Apple Sign-In flow**

Create `Amir-SleepApp/Amir-SleepApp/Views/Auth/SignInView.swift`:

```swift
import SwiftUI
import AuthenticationServices
import Supabase

struct SignInView: View {
    @State private var isSigningIn = false
    @State private var error: String?

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()
            VStack(spacing: 32) {
                Spacer()
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: 64))
                    .foregroundColor(.purple)
                Text("SleepViz")
                    .font(.largeTitle).bold()
                    .foregroundColor(.white)
                Text("Your personalized sleep dashboard")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
                Spacer()

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.email, .fullName]
                } onCompletion: { result in
                    Task { await handleSignIn(result: result) }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 50)
                .cornerRadius(12)
                .padding(.horizontal, 40)

                if let error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
                Spacer().frame(height: 40)
            }
        }
    }

    private func handleSignIn(result: Result<ASAuthorization, Error>) async {
        isSigningIn = true
        defer { isSigningIn = false }
        do {
            guard case .success(let auth) = result,
                  let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let identityToken = credential.identityToken,
                  let tokenString = String(data: identityToken, encoding: .utf8)
            else {
                error = "Apple Sign-In failed"
                return
            }
            try await AppSupabase.client.auth.signInWithIdToken(
                credentials: .init(provider: .apple, idToken: tokenString)
            )
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

**Step 4: Add auth gate to app entry point**

In `Amir_SleepAppApp.swift`, observe Supabase auth state and show `SignInView` or `MainTabView`:

```swift
@main
struct Amir_SleepAppApp: App {
    @State private var syncManager = SyncManager()
    @State private var isAuthenticated = false
    let modelContainer: ModelContainer

    init() {
        // ... existing init code ...
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if isAuthenticated {
                    MainTabView()
                        .environment(syncManager)
                } else {
                    SignInView()
                }
            }
            .preferredColorScheme(.dark)
            .task {
                // Check existing session
                if let _ = try? await AppSupabase.client.auth.session {
                    isAuthenticated = true
                }
                // Listen for auth changes
                for await state in AppSupabase.client.auth.authStateChanges {
                    isAuthenticated = state.session != nil
                }
            }
        }
        .modelContainer(modelContainer)
    }
}
```

**Step 5: Build and verify**

Run: Xcode Cmd+B
Expected: Build succeeds

**Step 6: Commit**

```bash
git add Amir-SleepApp/
git commit -m "feat: add Supabase auth with Apple Sign-In (iOS)"
```

---

### Task 5: iOS — Supabase Sync in SyncManager

**Files:**
- Modify: `Amir-SleepApp/Amir-SleepApp/Services/SyncManager.swift`

**Step 1: Add Supabase upsert after local save**

Add a new method to SyncManager and call it at the end of `sync()`:

```swift
private func pushToSupabase(session: SleepSession, modelContext: ModelContext) async throws {
    guard let userId = AppSupabase.client.auth.currentUser?.id else { return }

    let payload: [String: AnyJSON] = [
        "user_id": .string(userId.uuidString),
        "night_date": .string(session.nightDate),
        "start_date": .string(ISO8601DateFormatter().string(from: session.startDate)),
        "end_date": .string(ISO8601DateFormatter().string(from: session.endDate)),
        "time_in_bed": .double(session.stats.timeInBed),
        "total_sleep_time": .double(session.stats.totalSleepTime),
        "sleep_efficiency": .double(session.stats.sleepEfficiency),
        "sleep_latency": .double(session.stats.sleepLatency),
        "waso": .double(session.stats.waso),
        "deep_minutes": .double(session.stats.deepMinutes),
        "rem_minutes": .double(session.stats.remMinutes),
        "core_minutes": .double(session.stats.coreMinutes),
        "awake_minutes": .double(session.stats.awakeMinutes),
        "deep_percent": .double(session.stats.deepPercent),
        "rem_percent": .double(session.stats.remPercent),
        "core_percent": .double(session.stats.corePercent),
        "awake_percent": .double(session.stats.awakePercent),
        "score_overall": .integer(session.score.overall),
        "score_duration": .integer(session.score.duration),
        "score_efficiency": .integer(session.score.efficiency),
        "score_deep": .integer(session.score.deepSleep),
        "score_rem": .integer(session.score.rem),
        "score_latency": .integer(session.score.latency),
        "score_waso": .integer(session.score.waso),
        "score_timing": .integer(session.score.timing),
        "score_restoration": .integer(session.score.restoration),
        "is_fallback": .bool(session.isFallback),
        "avg_heart_rate": session.biometrics.avgHeartRate.map { .double($0) } ?? .null,
        "min_heart_rate": session.biometrics.minHeartRate.map { .double($0) } ?? .null,
        "avg_hrv": session.biometrics.avgHrv.map { .double($0) } ?? .null,
        "avg_spo2": session.biometrics.avgSpo2.map { .double($0) } ?? .null,
        "avg_respiratory_rate": session.biometrics.avgRespiratoryRate.map { .double($0) } ?? .null,
        "source_name": .string("Apple Watch"),
    ]

    try await AppSupabase.client
        .from("sleep_sessions")
        .upsert(payload, onConflict: "user_id,night_date")
        .execute()
}

private func pushReadinessToSupabase(record: ReadinessRecord) async throws {
    guard let userId = AppSupabase.client.auth.currentUser?.id else { return }

    let payload: [String: AnyJSON] = [
        "user_id": .string(userId.uuidString),
        "date": .string(record.date),
        "score": .integer(record.score),
        "hrv_baseline": .double(record.hrvBaseline),
        "hrv_current": .double(record.hrvCurrent),
        "resting_hr_baseline": .double(record.restingHRBaseline),
        "resting_hr_current": .double(record.restingHRCurrent),
        "sleep_score_contribution": .integer(record.sleepScoreContribution),
    ]

    try await AppSupabase.client
        .from("readiness_records")
        .upsert(payload, onConflict: "user_id,date")
        .execute()
}
```

Then at the end of the `sync()` method, after inserting each session into SwiftData, call:

```swift
try? await pushToSupabase(session: newSession, modelContext: modelContext)
```

And after inserting each readiness record:

```swift
try? await pushReadinessToSupabase(record: newRecord)
```

**Step 2: Build and verify**

Run: Xcode Cmd+B
Expected: Build succeeds

**Step 3: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/SyncManager.swift
git commit -m "feat: push sleep data to Supabase after HealthKit sync (iOS)"
```

---

## Phase 3: iOS — New Features

### Task 6: iOS — Coaching Tips

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Services/CoachingEngine.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Today/CoachingTipsCard.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/Today/TodayView.swift`

**Step 1: Create CoachingEngine**

```swift
import Foundation

struct CoachingTip: Identifiable {
    let id: String
    let title: String
    let message: String
    let priority: Int
    enum TipType { case warning, info, positive }
    let type: TipType
}

enum CoachingEngine {
    static func generateTips(sessions: [SleepSession]) -> [CoachingTip] {
        guard let latest = sessions.last else { return [] }
        var tips: [CoachingTip] = []
        let recent3 = Array(sessions.suffix(3))
        let recent7 = Array(sessions.suffix(7))

        // Deep sleep < 10% for 3+ nights
        if recent3.count >= 3, recent3.allSatisfy({ $0.stats.deepPercent < 10 }) {
            tips.append(.init(id: "low-deep", title: "Low Deep Sleep",
                message: "Your deep sleep has been below 10% recently. Try keeping your room at 65-68°F and avoiding alcohol before bed.",
                priority: 1, type: .warning))
        }
        // Efficiency < 85%
        if latest.stats.sleepEfficiency < 85 {
            tips.append(.init(id: "low-eff", title: "Low Sleep Efficiency",
                message: "You're spending too much time awake in bed. Go to bed only when sleepy.",
                priority: 2, type: .warning))
        }
        // Latency > 30 min
        if latest.stats.sleepLatency > 30 {
            tips.append(.init(id: "high-lat", title: "Slow Sleep Onset",
                message: "Taking over 30 minutes to fall asleep. Try a wind-down routine with no screens 30 min before bed.",
                priority: 3, type: .warning))
        }
        // Latency < 5 min (sleep debt)
        if latest.stats.sleepLatency < 5 {
            tips.append(.init(id: "sleep-debt", title: "Possible Sleep Debt",
                message: "Falling asleep in under 5 minutes may indicate sleep deprivation. Try adding 30 minutes to your sleep time.",
                priority: 2, type: .warning))
        }
        // Inconsistent bedtime
        if recent7.count >= 5 {
            let bedtimes = recent7.map { s -> Double in
                let c = Calendar.current
                let h = c.component(.hour, from: s.startDate)
                let m = c.component(.minute, from: s.startDate)
                return Double(h < 12 ? h * 60 + m + 1440 : h * 60 + m)
            }
            let mean = bedtimes.reduce(0, +) / Double(bedtimes.count)
            let stdDev = sqrt(bedtimes.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(bedtimes.count))
            if stdDev > 60 {
                tips.append(.init(id: "inconsistent", title: "Inconsistent Bedtime",
                    message: "Your bedtime varies by over an hour. A consistent schedule helps your circadian rhythm.",
                    priority: 4, type: .info))
            }
        }
        // Declining trend
        if recent7.count >= 7 {
            let first3 = Double(recent7.prefix(3).reduce(0) { $0 + $1.score.overall }) / 3
            let last3 = Double(recent7.suffix(3).reduce(0) { $0 + $1.score.overall }) / 3
            if last3 < first3 - 10 {
                tips.append(.init(id: "declining", title: "Sleep Quality Declining",
                    message: "Your sleep score has trended down. Check recent changes to stress, caffeine, or exercise.",
                    priority: 2, type: .warning))
            }
        }
        // Excellent
        if latest.score.overall >= 85 {
            tips.append(.init(id: "excellent", title: "Excellent Sleep!",
                message: "Great sleep last night! Keep it up.", priority: 10, type: .positive))
        }
        return Array(tips.sorted { $0.priority < $1.priority }.prefix(3))
    }
}
```

**Step 2: Create CoachingTipsCard SwiftUI view**

```swift
import SwiftUI

struct CoachingTipsCard: View {
    let tips: [CoachingTip]
    var body: some View {
        if !tips.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today's Tips").font(.caption).foregroundColor(.white.opacity(0.6))
                ForEach(tips) { tip in
                    HStack(alignment: .top, spacing: 12) {
                        Group {
                            switch tip.type {
                            case .warning: Image(systemName: "exclamationmark.triangle.fill").foregroundColor(.orange)
                            case .info: Image(systemName: "lightbulb.fill").foregroundColor(.blue)
                            case .positive: Image(systemName: "star.fill").foregroundColor(.green)
                            }
                        }.font(.system(size: 16)).frame(width: 20)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(tip.title).font(.subheadline).fontWeight(.medium).foregroundColor(.white)
                            Text(tip.message).font(.caption).foregroundColor(.white.opacity(0.5))
                        }
                    }
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder))
                }
            }
        }
    }
}
```

**Step 3: Add to TodayView**

In `TodayView.swift`, query recent sessions with `@Query(sort: \SleepSession.nightDate)`, call `CoachingEngine.generateTips(sessions:)`, and render `CoachingTipsCard(tips:)` below the existing insight card.

**Step 4: Build and verify**

Run: Xcode Cmd+B
Expected: Build succeeds

**Step 5: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/CoachingEngine.swift Amir-SleepApp/Amir-SleepApp/Views/Today/
git commit -m "feat: add coaching tips engine and UI (iOS)"
```

---

### Task 7: iOS — Reports

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Services/ReportEngine.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Reports/ReportsView.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Reports/ReportCard.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift`

**Step 1: Create ReportEngine** — Port the report generation logic. `SleepReport` struct with avgScore, avgDuration, bestNight, worstNight, trendDirection, insights, recommendations, weeklyBreakdown. `generateWeeklyReport(sessions:)` and `generateMonthlyReport(sessions:)` static functions. Same insight logic: weekend vs weekday comparison, best bedtime correlation.

**Step 2: Create ReportCard** — SwiftUI view showing key stats grid (avg score, duration, efficiency), best/worst night cards (green/red), stage averages, insights list, recommendations list, weekly breakdown (monthly only).

**Step 3: Create ReportsView** — Picker between weekly/monthly. Query sessions from SwiftData. Pass to ReportEngine. Render ReportCard.

**Step 4: Add Reports tab to MainTabView**

Add between Trends and Settings:

```swift
Tab("Reports", systemImage: "chart.bar.doc.horizontal") {
    ReportsView()
}
```

**Step 5: Build and verify**

Run: Xcode Cmd+B
Expected: Build succeeds, 6 tabs visible

**Step 6: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/ReportEngine.swift Amir-SleepApp/Amir-SleepApp/Views/Reports/ Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift
git commit -m "feat: add weekly/monthly reports (iOS)"
```

---

### Task 8: iOS — Goals & Tracking

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Services/GoalsEngine.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Goals/GoalsView.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Goals/StreakCalendar.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift`

**Step 1: Create GoalsEngine**

```swift
import Foundation

struct SleepGoalConfig: Codable {
    var durationTargetMin: Double = 480
    var scoreTarget: Int = 75
    var bedtimeStartMin: Int = 1350  // 22:30
    var bedtimeEndMin: Int = 1380    // 23:00
}

struct OptimalBedtime {
    let startHour: Int, startMinute: Int
    let endHour: Int, endMinute: Int
}

enum GoalsEngine {
    static func checkDurationGoalMet(session: SleepSession, target: Double) -> Bool {
        session.stats.totalSleepTime >= target
    }
    static func checkScoreGoalMet(session: SleepSession, target: Int) -> Bool {
        session.score.overall >= target
    }
    static func checkBedtimeGoalMet(session: SleepSession, startMin: Int, endMin: Int) -> Bool {
        let cal = Calendar.current
        let h = cal.component(.hour, from: session.startDate)
        let m = cal.component(.minute, from: session.startDate)
        let bedtimeMin = h * 60 + m
        return bedtimeMin >= startMin && bedtimeMin <= endMin
    }

    static func computeStreak(sessions: [SleepSession], check: (SleepSession) -> Bool) -> Int {
        var streak = 0
        for session in sessions.reversed() {
            if check(session) { streak += 1 } else { break }
        }
        return streak
    }

    static func computeOptimalBedtime(sessions: [SleepSession]) -> OptimalBedtime? {
        guard sessions.count >= 7 else { return nil }
        let sorted = sessions.sorted { $0.score.overall > $1.score.overall }
        let topCount = max(3, sessions.count / 3)
        let top = Array(sorted.prefix(topCount))
        let bedtimes = top.map { s -> Int in
            let cal = Calendar.current
            let h = cal.component(.hour, from: s.startDate)
            let m = cal.component(.minute, from: s.startDate)
            return h < 12 ? h * 60 + m + 1440 : h * 60 + m
        }.sorted()
        let earliest = bedtimes.first! % 1440
        let latest = bedtimes.last! % 1440
        return OptimalBedtime(
            startHour: earliest / 60, startMinute: earliest % 60,
            endHour: latest / 60, endMinute: latest % 60
        )
    }
}
```

**Step 2: Create StreakCalendar** — SwiftUI LazyVGrid of 30 colored circles (green=met, red=missed, gray=no data).

**Step 3: Create GoalsView** — Shows 3 streak cards, StreakCalendar for primary goal, optimal bedtime card, goal settings form with sliders. Goals persisted to UserDefaults (and synced to Supabase `sleep_goals` table).

**Step 4: Add Goals tab to MainTabView**

```swift
Tab("Goals", systemImage: "target") {
    GoalsView()
}
```

**Step 5: Sync goals to Supabase** — On save, upsert to `sleep_goals` table. On app launch, fetch from Supabase to seed local config.

**Step 6: Build and verify**

Run: Xcode Cmd+B
Expected: Build succeeds, 7 tabs visible

**Step 7: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/GoalsEngine.swift Amir-SleepApp/Amir-SleepApp/Views/Goals/ Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift
git commit -m "feat: add sleep goals and streak tracking (iOS)"
```

---

### Task 9: iOS — Update Settings View

**Files:**
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/Settings/SettingsView.swift`

**Step 1: Update scoring explanation to reflect new algorithm**

Update the scoring info text to show new weights (Duration 30%, Efficiency 15%, Deep 12%, REM 10%, Latency 8%, WASO 8%, Timing 8%, Restoration 9%) and new thresholds.

**Step 2: Add Account section**

Add section showing signed-in Apple ID email with a Sign Out button that calls `AppSupabase.client.auth.signOut()`.

**Step 3: Add Supabase sync status**

Show last push date, number of sessions synced, and a "Force Resync" button that clears local data and re-syncs from HealthKit + pushes to Supabase.

**Step 4: Build and verify**

Run: Xcode Cmd+B
Expected: Build succeeds

**Step 5: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Views/Settings/SettingsView.swift
git commit -m "feat: update settings with new scoring info and account section (iOS)"
```

---

## Phase 4: PWA Refactor — Read-Only Supabase Dashboard

### Task 10: PWA — Add Supabase Client and Remove Import

**Files:**
- Modify: `sleep-viz/package.json` (add @supabase/supabase-js, remove fflate)
- Create: `sleep-viz/src/lib/supabase.ts`
- Delete: `sleep-viz/src/providers/SleepDataContext.tsx`
- Delete: `sleep-viz/src/hooks/useImport.ts`
- Delete: `sleep-viz/src/lib/parseHealthExport.ts`
- Delete: `sleep-viz/src/providers/SampleDataProvider.ts` (if exists)
- Delete: `sleep-viz/src/db/schema.ts`
- Delete: `sleep-viz/src/components/import/` (entire directory)

**Step 1: Install Supabase JS**

Run: `cd sleep-viz && npm install @supabase/supabase-js && npm uninstall fflate dexie dexie-react-hooks`

**Step 2: Create Supabase client**

Create `sleep-viz/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Create `sleep-viz/.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 3: Delete import-related files**

Remove the files listed above. These are no longer needed since the iOS app is the sole data source.

**Step 4: Commit**

```bash
git add -A sleep-viz/
git commit -m "refactor: replace local DB with Supabase client, remove import (PWA)"
```

---

### Task 11: PWA — Auth and Data Hooks

**Files:**
- Create: `sleep-viz/src/hooks/useAuth.ts`
- Create: `sleep-viz/src/hooks/useSupabaseSessions.ts`
- Create: `sleep-viz/src/hooks/useSupabaseReadiness.ts`
- Create: `sleep-viz/src/hooks/useSupabaseGoals.ts`
- Create: `sleep-viz/src/components/auth/SignIn.tsx`

**Step 1: Create auth hook**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signInWithApple = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'apple' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signInWithApple, signOut };
}
```

**Step 2: Create sessions hook with realtime**

```typescript
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
```

**Step 3: Create readiness and goals hooks** — Same pattern as sessions hook but querying `readiness_records` and `sleep_goals` tables.

**Step 4: Create SignIn component**

```tsx
interface Props { onSignIn: () => void; }

export function SignIn({ onSignIn }: Props) {
  const { signInWithApple } = useAuth();
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">🌙</div>
      <h1 className="text-3xl font-bold text-white mb-2">SleepViz</h1>
      <p className="text-white/40 mb-8">Your personalized sleep dashboard</p>
      <button
        onClick={signInWithApple}
        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
      >
         Sign in with Apple
      </button>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add sleep-viz/src/
git commit -m "feat: add Supabase auth, realtime data hooks, sign-in UI (PWA)"
```

---

### Task 12: PWA — Update App.tsx and Dashboard

**Files:**
- Modify: `sleep-viz/src/App.tsx`
- Modify: `sleep-viz/src/components/dashboard/Dashboard.tsx`
- Modify: `sleep-viz/src/providers/types.ts` (add timing/restoration to SleepScore)

**Step 1: Update SleepScore type**

In `types.ts`, add timing and restoration fields:

```typescript
interface SleepScore {
  overall: number;
  duration: number;
  efficiency: number;
  deepSleep: number;
  rem: number;
  latency: number;
  waso: number;
  timing: number;       // NEW
  restoration: number;  // NEW
  isFallback: boolean;
}
```

**Step 2: Rewrite App.tsx**

Replace Dexie-based data loading with Supabase hooks. Add auth gate:

```tsx
import { useAuth } from './hooks/useAuth';
import { useSupabaseSessions } from './hooks/useSupabaseSessions';
import { SignIn } from './components/auth/SignIn';
// ... keep existing component imports for Dashboard, NightDetail, TrendsView

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedNight, setSelectedNight] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const { sessions, loading } = useSupabaseSessions(dateRange);

  if (authLoading) return <div className="min-h-screen bg-[#0D0D0D]" />;
  if (!user) return <SignIn onSignIn={() => {}} />;

  // ... rest of section routing using sessions from Supabase
}
```

Remove all references to: `useSleepData`, `useImport`, `SleepDataContext`, `db`, file drop handlers.

**Step 3: Update Dashboard to accept sessions as prop**

The Dashboard currently uses `useSleepData` internally. Refactor it to receive `sessions` as a prop from App.tsx (which now gets them from Supabase), or keep internal hook but replace `useSleepData` with `useSupabaseSessions`.

**Step 4: Run type check**

Run: `cd sleep-viz && npx tsc --noEmit`
Expected: No type errors

**Step 5: Commit**

```bash
git add sleep-viz/src/
git commit -m "refactor: wire App.tsx and Dashboard to Supabase data (PWA)"
```

---

### Task 13: PWA — Readiness, Coaching, Reports, Goals UI

**Files:**
- Create: `sleep-viz/src/lib/readinessScore.ts` (display helpers only — scoring done on iOS)
- Create: `sleep-viz/src/lib/coachingTips.ts`
- Create: `sleep-viz/src/lib/reports.ts`
- Create: `sleep-viz/src/lib/goals.ts`
- Create: `sleep-viz/src/components/readiness/ReadinessPanel.tsx`
- Create: `sleep-viz/src/components/dashboard/CoachingTips.tsx`
- Create: `sleep-viz/src/components/reports/ReportsView.tsx`
- Create: `sleep-viz/src/components/reports/ReportCard.tsx`
- Create: `sleep-viz/src/components/goals/GoalsView.tsx`
- Create: `sleep-viz/src/components/goals/StreakCalendar.tsx`
- Create: `sleep-viz/src/components/goals/GoalSettings.tsx`
- Modify: `sleep-viz/src/App.tsx` (add new sections to navigation)

**Step 1: Create readiness display** — `ReadinessPanel` shows score ring (from Supabase readiness_records), contributing factors, and 30-day trend chart. No scoring logic — just display.

**Step 2: Create coaching tips engine** — Same `generateTips()` function as the original plan (Task 6 from old plan). Rules use updated thresholds (deep < 10%, efficiency < 85%, latency < 5 min flag, score 85+ positive). Renders as tip cards on dashboard.

**Step 3: Create reports engine and UI** — Same `generateWeeklyReport()` / `generateMonthlyReport()` as original plan. ReportCard and ReportsView components.

**Step 4: Create goals engine and UI** — `checkGoalMet()`, `computeStreak()`, `computeOptimalBedtime()` functions. GoalsView with StreakCalendar and GoalSettings. Goals read/write from Supabase `sleep_goals` table via `useSupabaseGoals` hook.

**Step 5: Add navigation sections to App.tsx**

Add nav items: readiness, reports, goals alongside existing dashboard, detail, trends.

**Step 6: Verify visually**

Run: `cd sleep-viz && npm run dev`
Expected: All sections render, data flows from Supabase

**Step 7: Commit**

```bash
git add sleep-viz/src/
git commit -m "feat: add readiness, coaching, reports, goals UI (PWA)"
```

---

### Task 14: PWA — Update Constants and Scoring Display

**Files:**
- Modify: `sleep-viz/src/lib/constants.ts`

**Step 1: Update score brackets and thresholds**

```typescript
export const SCORE_THRESHOLDS = {
  optimal: { min: 85, color: '#22c55e', label: 'Optimal' },
  good: { min: 70, color: '#3b82f6', label: 'Good' },
  fair: { min: 55, color: '#eab308', label: 'Fair' },
  needsImprovement: { min: 0, color: '#ef4444', label: 'Needs Improvement' },
};

export const READINESS_COLORS = { ring: '#f59e0b' };

export const SCORE_WEIGHT_LABELS = [
  { key: 'duration', label: 'Duration', weight: '30%' },
  { key: 'efficiency', label: 'Efficiency', weight: '15%' },
  { key: 'deepSleep', label: 'Deep Sleep', weight: '12%' },
  { key: 'rem', label: 'REM Sleep', weight: '10%' },
  { key: 'latency', label: 'Latency', weight: '8%' },
  { key: 'waso', label: 'WASO', weight: '8%' },
  { key: 'timing', label: 'Timing', weight: '8%' },
  { key: 'restoration', label: 'Restoration', weight: '9%' },
];
```

**Step 2: Update `getScoreInfo` function** to use new brackets (Optimal/Good/Fair/Needs Improvement).

**Step 3: Commit**

```bash
git add sleep-viz/src/lib/constants.ts
git commit -m "feat: update score brackets and weight labels (PWA)"
```

---

## Phase 5: Testing and Verification

### Task 15: PWA — Tests

**Files:**
- Create: `sleep-viz/src/test/coachingTips.test.ts`
- Create: `sleep-viz/src/test/reports.test.ts`
- Create: `sleep-viz/src/test/goals.test.ts`
- Modify: `sleep-viz/src/test/sleepScore.test.ts` (update thresholds)

**Step 1: Update sleepScore tests** — Adjust expected values for new brackets (85+ = Optimal, etc.). Remove tests that reference old Dexie-specific code.

**Step 2: Add coaching tips tests** — Test each rule fires correctly with updated thresholds.

**Step 3: Add reports tests** — Test weekly/monthly report generation, averages, best/worst night, trend direction.

**Step 4: Add goals tests** — Test checkGoalMet, computeStreak, computeOptimalBedtime.

**Step 5: Run all tests**

Run: `cd sleep-viz && npx vitest run`
Expected: All PASS

**Step 6: Commit**

```bash
git add sleep-viz/src/test/
git commit -m "test: update and add tests for new features (PWA)"
```

---

### Task 16: Build Verification

**Step 1: PWA type check**

Run: `cd sleep-viz && npx tsc --noEmit`
Expected: No errors

**Step 2: PWA lint**

Run: `cd sleep-viz && npm run lint`
Expected: Clean

**Step 3: PWA build**

Run: `cd sleep-viz && npm run build`
Expected: Successful production build

**Step 4: iOS build**

Run: Xcode Cmd+B
Expected: Build succeeds

**Step 5: iOS tests**

Run: Xcode Cmd+U
Expected: All tests pass

**Step 6: Final commit if needed**

```bash
git add -A && git commit -m "chore: fix any build/lint issues from integration"
```
