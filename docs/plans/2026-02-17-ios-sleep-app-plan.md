# SleepViz iOS App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a native SwiftUI iOS app that reads sleep and biometric data from HealthKit, computes sleep and readiness scores, and displays them with an Oura-inspired dark UI.

**Architecture:** SwiftUI views read from SwiftData models populated by a SyncManager that queries HealthKit and runs scoring engines. Background refresh keeps scores ready overnight. All Apple first-party frameworks, zero dependencies.

**Tech Stack:** Swift 5.9+, SwiftUI, HealthKit, SwiftData, Swift Charts, BackgroundTasks. iOS 17+ minimum.

**Design doc:** `docs/plans/2026-02-17-ios-sleep-app-design.md`

**Reference code (TypeScript to port):**
- Scoring: `sleep-viz/src/lib/sleepScore.ts`
- Statistics: `sleep-viz/src/lib/statistics.ts`
- Constants: `sleep-viz/src/lib/constants.ts`
- Date utils: `sleep-viz/src/lib/dateUtils.ts`
- Types: `sleep-viz/src/providers/types.ts`
- Tests: `sleep-viz/src/test/sleepScore.test.ts`, `sleep-viz/src/test/sleepSessions.test.ts`

---

## Task 1: Create Xcode Project + Directory Structure

**Files:**
- Create: Xcode project `SleepViz/` at repo root
- Create: Directory structure for Models, Services, Views, Utilities, Tests

**Step 1: Create Xcode project**

Open Xcode → File → New → Project:
- Template: **App** (under iOS)
- Product Name: `SleepViz`
- Organization Identifier: `com.sleepviz`
- Interface: **SwiftUI**
- Storage: **SwiftData**
- Testing: check **Include Tests**
- Save location: `/Users/atarkian2/Documents/GitHub/Sleep-Visualization/`

This creates `SleepViz/` with `SleepViz.xcodeproj`, a `SleepVizApp.swift`, `ContentView.swift`, and a `SleepVizTests/` target.

**Step 2: Create directory structure**

Inside `SleepViz/SleepViz/`, create these folders:
```
mkdir -p Models Services Views/Today Views/Sleep Views/Readiness Views/Trends Views/Settings Views/Components Utilities
```

**Step 3: Configure HealthKit entitlement**

In Xcode → project target → Signing & Capabilities → + Capability:
- Add **HealthKit** (check "Clinical Health Records" is unchecked, just base HealthKit)
- Add **Background Modes** → check "Background fetch" and "Background processing"

**Step 4: Configure Info.plist**

Add these keys to Info.plist:
- `NSHealthShareUsageDescription`: "SleepViz reads your sleep, heart rate, HRV, blood oxygen, and respiratory rate data to compute sleep and readiness scores."
- `BGTaskSchedulerPermittedIdentifiers`: Array with `"com.sleepviz.sync"`

**Step 5: Set deployment target**

Project → General → Minimum Deployments → iOS 17.0

**Step 6: Delete ContentView.swift** (we'll replace it)

**Step 7: Commit**

```bash
git add SleepViz/
git commit -m "feat: scaffold Xcode project with HealthKit + BackgroundTasks"
```

---

## Task 2: Constants + Utilities

**Files:**
- Create: `SleepViz/SleepViz/Utilities/Constants.swift`
- Create: `SleepViz/SleepViz/Utilities/DateUtils.swift`
- Create: `SleepViz/SleepViz/Utilities/Formatters.swift`

**Step 1: Write Constants.swift**

Port from `sleep-viz/src/lib/constants.ts`. Create `SleepViz/SleepViz/Utilities/Constants.swift`:

```swift
import SwiftUI

// MARK: - Stage Colors
enum StageColor {
    static let awake = Color(hex: "#ef4444")
    static let rem = Color(hex: "#a78bfa")
    static let core = Color(hex: "#60a5fa")
    static let deep = Color(hex: "#1e40af")
}

// MARK: - Score Thresholds
struct ScoreInfo {
    let label: String
    let color: Color
}

func getScoreInfo(_ score: Int) -> ScoreInfo {
    switch score {
    case 90...100: return ScoreInfo(label: "Excellent", color: Color(hex: "#22c55e"))
    case 75..<90:  return ScoreInfo(label: "Good", color: Color(hex: "#3b82f6"))
    case 60..<75:  return ScoreInfo(label: "Fair", color: Color(hex: "#eab308"))
    case 40..<60:  return ScoreInfo(label: "Poor", color: Color(hex: "#f97316"))
    default:       return ScoreInfo(label: "Very Poor", color: Color(hex: "#ef4444"))
    }
}

// MARK: - Score Weights
enum ScoreWeights {
    static let duration = 0.25
    static let efficiency = 0.20
    static let deepSleep = 0.20
    static let rem = 0.15
    static let latency = 0.10
    static let waso = 0.10
}

enum ScoreWeightsFallback {
    static let duration = 0.35
    static let efficiency = 0.30
    static let latency = 0.15
    static let waso = 0.20
}

// MARK: - Thresholds
let gapMergeThreshold: TimeInterval = 3 * 60 * 60 // 3 hours in seconds
let nightCutoffHour = 6 // before 6AM = previous night

// MARK: - App Theme
enum AppTheme {
    static let background = Color(hex: "#0D0D0D")
    static let cardBackground = Color(hex: "#1A1A1A")
    static let cardBorder = Color.white.opacity(0.08)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.6)
    static let textTertiary = Color.white.opacity(0.4)
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
```

**Step 2: Write DateUtils.swift**

Port from `sleep-viz/src/lib/dateUtils.ts`. Create `SleepViz/SleepViz/Utilities/DateUtils.swift`:

```swift
import Foundation

/// Get the "night of" date for a sleep session.
/// If sleep started before nightCutoffHour (6AM), it belongs to the previous day.
func getNightDate(from startDate: Date) -> String {
    let calendar = Calendar.current
    let hour = calendar.component(.hour, from: startDate)
    let date = hour < nightCutoffHour
        ? calendar.date(byAdding: .day, value: -1, to: startDate)!
        : startDate
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
}

/// Circular mean for times that cross midnight.
/// Input: array of minutes from midnight (negative values for before midnight).
func circularMeanTime(_ timesInMinutes: [Double]) -> Double {
    guard !timesInMinutes.isEmpty else { return 0 }
    let minutesInDay = 24.0 * 60.0
    var sinSum = 0.0
    var cosSum = 0.0
    for t in timesInMinutes {
        let angle = (t / minutesInDay) * 2.0 * .pi
        sinSum += sin(angle)
        cosSum += cos(angle)
    }
    sinSum /= Double(timesInMinutes.count)
    cosSum /= Double(timesInMinutes.count)
    var mean = (atan2(sinSum, cosSum) / (2.0 * .pi)) * minutesInDay
    if mean < -360 { mean += minutesInDay }
    if mean > minutesInDay { mean -= minutesInDay }
    return mean
}

/// Convert a Date to minutes from midnight.
func minutesFromMidnight(_ date: Date) -> Int {
    let calendar = Calendar.current
    return calendar.component(.hour, from: date) * 60 + calendar.component(.minute, from: date)
}

/// Get bedtime minutes, treating times between 6PM-midnight as negative.
func bedtimeMinutes(_ date: Date) -> Double {
    let mins = Double(minutesFromMidnight(date))
    return mins >= 18 * 60 ? mins - 24 * 60 : mins
}
```

**Step 3: Write Formatters.swift**

Port from `sleep-viz/src/lib/formatters.ts`. Create `SleepViz/SleepViz/Utilities/Formatters.swift`:

```swift
import Foundation

func formatDuration(minutes: Double) -> String {
    let hrs = Int(minutes) / 60
    let mins = Int(minutes.rounded()) % 60
    if hrs == 0 { return "\(mins)m" }
    return mins == 0 ? "\(hrs)h" : "\(hrs)h \(mins)m"
}

func formatTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "h:mm a"
    return formatter.string(from: date)
}

func formatNightDate(_ nightDate: String) -> String {
    let inputFormatter = DateFormatter()
    inputFormatter.dateFormat = "yyyy-MM-dd"
    guard let date = inputFormatter.date(from: nightDate) else { return nightDate }
    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "EEE, MMM d"
    return outputFormatter.string(from: date)
}

func formatPercent(_ value: Double) -> String {
    "\(Int(value.rounded()))%"
}

func formatBpm(_ value: Double?) -> String {
    guard let value else { return "—" }
    return "\(Int(value.rounded())) bpm"
}

func formatMs(_ value: Double?) -> String {
    guard let value else { return "—" }
    return "\(Int(value.rounded())) ms"
}

func formatMinutesAsTime(_ minutesFromMidnight: Double) -> String {
    var mins = minutesFromMidnight
    if mins < 0 { mins += 24 * 60 }
    let hrs = Int(mins) / 60 % 24
    let m = Int(mins.rounded()) % 60
    let period = hrs >= 12 ? "PM" : "AM"
    let h = hrs % 12 == 0 ? 12 : hrs % 12
    return String(format: "%d:%02d %@", h, m, period)
}
```

**Step 4: Commit**

```bash
git add SleepViz/SleepViz/Utilities/
git commit -m "feat: add constants, date utilities, and formatters (port from TS)"
```

---

## Task 3: SwiftData Models

**Files:**
- Create: `SleepViz/SleepViz/Models/SleepStage.swift`
- Create: `SleepViz/SleepViz/Models/Biometrics.swift`
- Create: `SleepViz/SleepViz/Models/SleepSession.swift`
- Create: `SleepViz/SleepViz/Models/ReadinessScore.swift`

**Step 1: Write SleepStage.swift**

Create `SleepViz/SleepViz/Models/SleepStage.swift`:

```swift
import Foundation

enum SleepStageType: String, Codable, CaseIterable {
    case awake
    case rem
    case core
    case deep
}

struct SleepStageInterval: Codable, Identifiable {
    var id: UUID = UUID()
    let stage: SleepStageType
    let startDate: Date
    let endDate: Date

    var durationMinutes: Double {
        endDate.timeIntervalSince(startDate) / 60.0
    }
}

struct SleepScoreData: Codable {
    let overall: Int
    let duration: Int
    let efficiency: Int
    let deepSleep: Int
    let rem: Int
    let latency: Int
    let waso: Int
    let isFallback: Bool
}

struct SleepStats: Codable {
    let timeInBed: Double         // minutes
    let totalSleepTime: Double    // minutes
    let sleepEfficiency: Double   // percentage 0-100
    let sleepLatency: Double      // minutes
    let waso: Double              // minutes
    let deepMinutes: Double
    let remMinutes: Double
    let coreMinutes: Double
    let awakeMinutes: Double
    let deepPercent: Double
    let remPercent: Double
    let corePercent: Double
    let awakePercent: Double
}
```

**Step 2: Write Biometrics.swift**

Create `SleepViz/SleepViz/Models/Biometrics.swift`:

```swift
import Foundation

struct BiometricSummary: Codable {
    var avgHeartRate: Double?
    var minHeartRate: Double?
    var maxHeartRate: Double?
    var avgHrv: Double?
    var avgSpo2: Double?
    var avgRespiratoryRate: Double?
}
```

**Step 3: Write SleepSession.swift**

Create `SleepViz/SleepViz/Models/SleepSession.swift`:

```swift
import Foundation
import SwiftData

@Model
final class SleepSession {
    @Attribute(.unique) var id: UUID
    var nightDate: String          // "2024-01-15"
    var startDate: Date
    var endDate: Date
    var stagesData: Data           // JSON-encoded [SleepStageInterval]
    var scoreData: Data            // JSON-encoded SleepScoreData
    var statsData: Data            // JSON-encoded SleepStats
    var biometricsData: Data       // JSON-encoded BiometricSummary
    var isFallback: Bool
    var lastSyncedAt: Date

    init(
        id: UUID = UUID(),
        nightDate: String,
        startDate: Date,
        endDate: Date,
        stages: [SleepStageInterval],
        score: SleepScoreData,
        stats: SleepStats,
        biometrics: BiometricSummary,
        isFallback: Bool,
        lastSyncedAt: Date = Date()
    ) {
        self.id = id
        self.nightDate = nightDate
        self.startDate = startDate
        self.endDate = endDate
        self.stagesData = (try? JSONEncoder().encode(stages)) ?? Data()
        self.scoreData = (try? JSONEncoder().encode(score)) ?? Data()
        self.statsData = (try? JSONEncoder().encode(stats)) ?? Data()
        self.biometricsData = (try? JSONEncoder().encode(biometrics)) ?? Data()
        self.isFallback = isFallback
        self.lastSyncedAt = lastSyncedAt
    }

    var stages: [SleepStageInterval] {
        (try? JSONDecoder().decode([SleepStageInterval].self, from: stagesData)) ?? []
    }

    var score: SleepScoreData {
        (try? JSONDecoder().decode(SleepScoreData.self, from: scoreData)) ?? SleepScoreData(
            overall: 0, duration: 0, efficiency: 0, deepSleep: 0,
            rem: 0, latency: 0, waso: 0, isFallback: true
        )
    }

    var stats: SleepStats {
        (try? JSONDecoder().decode(SleepStats.self, from: statsData)) ?? SleepStats(
            timeInBed: 0, totalSleepTime: 0, sleepEfficiency: 0, sleepLatency: 0,
            waso: 0, deepMinutes: 0, remMinutes: 0, coreMinutes: 0, awakeMinutes: 0,
            deepPercent: 0, remPercent: 0, corePercent: 0, awakePercent: 0
        )
    }

    var biometrics: BiometricSummary {
        (try? JSONDecoder().decode(BiometricSummary.self, from: biometricsData)) ?? BiometricSummary()
    }
}
```

**Step 4: Write ReadinessScore.swift**

Create `SleepViz/SleepViz/Models/ReadinessScore.swift`:

```swift
import Foundation
import SwiftData

@Model
final class ReadinessRecord {
    @Attribute(.unique) var id: UUID
    var date: String               // "2024-01-15"
    var score: Int                  // 0-100
    var hrvBaseline: Double         // 7-day rolling avg HRV
    var hrvCurrent: Double          // last night's avg HRV
    var restingHRBaseline: Double
    var restingHRCurrent: Double
    var sleepScoreContribution: Int
    var lastSyncedAt: Date

    init(
        id: UUID = UUID(),
        date: String,
        score: Int,
        hrvBaseline: Double,
        hrvCurrent: Double,
        restingHRBaseline: Double,
        restingHRCurrent: Double,
        sleepScoreContribution: Int,
        lastSyncedAt: Date = Date()
    ) {
        self.id = id
        self.date = date
        self.score = score
        self.hrvBaseline = hrvBaseline
        self.hrvCurrent = hrvCurrent
        self.restingHRBaseline = restingHRBaseline
        self.restingHRCurrent = restingHRCurrent
        self.sleepScoreContribution = sleepScoreContribution
        self.lastSyncedAt = lastSyncedAt
    }
}
```

**Step 5: Commit**

```bash
git add SleepViz/SleepViz/Models/
git commit -m "feat: add SwiftData models for SleepSession and ReadinessScore"
```

---

## Task 4: Sleep Scoring Engine + Tests

**Files:**
- Create: `SleepViz/SleepViz/Services/SleepScoringEngine.swift`
- Create: `SleepViz/SleepVizTests/SleepScoringTests.swift`

**Step 1: Write failing tests**

Port from `sleep-viz/src/test/sleepScore.test.ts`. Create `SleepViz/SleepVizTests/SleepScoringTests.swift`:

```swift
import Testing
@testable import SleepViz

struct SleepScoringTests {

    // MARK: - scoreDuration

    @Test func scoreDuration_idealRange() {
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 420) == 100) // 7h
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 480) == 100) // 8h
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 540) == 100) // 9h
    }

    @Test func scoreDuration_veryShort() {
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 240) == 0) // 4h
    }

    @Test func scoreDuration_belowIdeal() {
        let score = SleepScoringEngine.scoreDuration(totalSleepMinutes: 360) // 6h
        #expect(score > 0)
        #expect(score < 100)
    }

    @Test func scoreDuration_aboveIdeal() {
        let score = SleepScoringEngine.scoreDuration(totalSleepMinutes: 600) // 10h
        #expect(score > 0)
        #expect(score < 100)
    }

    @Test func scoreDuration_veryLong() {
        #expect(SleepScoringEngine.scoreDuration(totalSleepMinutes: 660) == 0) // 11h
    }

    // MARK: - scoreEfficiency

    @Test func scoreEfficiency_ideal() {
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 90) == 100)
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 95) == 100)
    }

    @Test func scoreEfficiency_low() {
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 60) == 0)
    }

    @Test func scoreEfficiency_mid() {
        #expect(SleepScoringEngine.scoreEfficiency(efficiency: 75) == 50)
    }

    // MARK: - scoreDeepSleep

    @Test func scoreDeepSleep_idealRange() {
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 15) == 100)
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 20) == 100)
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 25) == 100)
    }

    @Test func scoreDeepSleep_belowIdeal() {
        let score = SleepScoringEngine.scoreDeepSleep(deepPercent: 10)
        #expect(score > 0)
        #expect(score < 100)
    }

    @Test func scoreDeepSleep_aboveIdeal() {
        let score = SleepScoringEngine.scoreDeepSleep(deepPercent: 30)
        #expect(score > 0)
        #expect(score < 100)
    }

    @Test func scoreDeepSleep_zero() {
        #expect(SleepScoringEngine.scoreDeepSleep(deepPercent: 0) == 0)
    }

    // MARK: - scoreRem

    @Test func scoreRem_idealRange() {
        #expect(SleepScoringEngine.scoreRem(remPercent: 20) == 100)
        #expect(SleepScoringEngine.scoreRem(remPercent: 25) == 100)
        #expect(SleepScoringEngine.scoreRem(remPercent: 30) == 100)
    }

    @Test func scoreRem_belowIdeal() {
        #expect(SleepScoringEngine.scoreRem(remPercent: 10) == 50)
    }

    @Test func scoreRem_zero() {
        #expect(SleepScoringEngine.scoreRem(remPercent: 0) == 0)
    }

    // MARK: - scoreLatency

    @Test func scoreLatency_ideal() {
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 0) == 100)
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 10) == 100)
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 15) == 100)
    }

    @Test func scoreLatency_degraded() {
        let score = SleepScoringEngine.scoreLatency(latencyMinutes: 30)
        #expect(score > 0)
        #expect(score < 100)
    }

    @Test func scoreLatency_maximum() {
        #expect(SleepScoringEngine.scoreLatency(latencyMinutes: 60) == 0)
    }

    // MARK: - scoreWaso

    @Test func scoreWaso_ideal() {
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 0) == 100)
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 10) == 100)
    }

    @Test func scoreWaso_degraded() {
        let score = SleepScoringEngine.scoreWaso(wasoMinutes: 30)
        #expect(score > 0)
        #expect(score < 100)
    }

    @Test func scoreWaso_maximum() {
        #expect(SleepScoringEngine.scoreWaso(wasoMinutes: 60) == 0)
    }

    // MARK: - computeSleepScore

    @Test func computeSleepScore_withStages() {
        let score = SleepScoringEngine.computeSleepScore(
            totalSleepTime: 480, sleepEfficiency: 92,
            deepPercent: 20, remPercent: 25,
            sleepLatency: 10, waso: 5, hasStages: true
        )
        #expect(score.overall >= 90)
        #expect(score.isFallback == false)
    }

    @Test func computeSleepScore_fallback() {
        let score = SleepScoringEngine.computeSleepScore(
            totalSleepTime: 480, sleepEfficiency: 92,
            deepPercent: 0, remPercent: 0,
            sleepLatency: 10, waso: 5, hasStages: false
        )
        #expect(score.overall > 0)
        #expect(score.isFallback == true)
        #expect(score.deepSleep == 0)
        #expect(score.rem == 0)
    }

    @Test func computeSleepScore_clamped() {
        let perfect = SleepScoringEngine.computeSleepScore(
            totalSleepTime: 480, sleepEfficiency: 100,
            deepPercent: 20, remPercent: 25,
            sleepLatency: 0, waso: 0, hasStages: true
        )
        #expect(perfect.overall <= 100)

        let terrible = SleepScoringEngine.computeSleepScore(
            totalSleepTime: 120, sleepEfficiency: 40,
            deepPercent: 0, remPercent: 0,
            sleepLatency: 90, waso: 90, hasStages: true
        )
        #expect(terrible.overall >= 0)
    }
}
```

**Step 2: Run tests — expect compile error (SleepScoringEngine not found)**

Run: `xcodebuild test -project SleepViz.xcodeproj -scheme SleepViz -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: Build failure — `SleepScoringEngine` not found

**Step 3: Write SleepScoringEngine.swift**

Direct port from `sleep-viz/src/lib/sleepScore.ts`. Create `SleepViz/SleepViz/Services/SleepScoringEngine.swift`:

```swift
import Foundation

enum SleepScoringEngine {

    private static func clamp(_ value: Double, min: Double, max: Double) -> Double {
        Swift.max(min, Swift.min(max, value))
    }

    private static func linearScale(_ value: Double, min: Double, max: Double) -> Double {
        clamp(((value - min) / (max - min)) * 100, min: 0, max: 100)
    }

    /// Duration sub-score: 7-9hr ideal range
    static func scoreDuration(totalSleepMinutes: Double) -> Int {
        let hours = totalSleepMinutes / 60.0
        if hours >= 7 && hours <= 9 { return 100 }
        if hours < 7 { return Int(linearScale(hours, min: 4, max: 7).rounded()) }
        // 9h = 100, 11h = 0
        return Int((linearScale(11 - hours, min: 0, max: 2) * 100 / 100).rounded())
    }

    /// Efficiency sub-score: >=90% ideal
    static func scoreEfficiency(efficiency: Double) -> Int {
        if efficiency >= 90 { return 100 }
        return Int(linearScale(efficiency, min: 60, max: 90).rounded())
    }

    /// Deep sleep sub-score: 15-25% of TST ideal
    static func scoreDeepSleep(deepPercent: Double) -> Int {
        if deepPercent >= 15 && deepPercent <= 25 { return 100 }
        if deepPercent < 15 { return Int(linearScale(deepPercent, min: 0, max: 15).rounded()) }
        return Int(linearScale(40 - deepPercent, min: 0, max: 15).rounded())
    }

    /// REM sub-score: 20-30% of TST ideal
    static func scoreRem(remPercent: Double) -> Int {
        if remPercent >= 20 && remPercent <= 30 { return 100 }
        if remPercent < 20 { return Int(linearScale(remPercent, min: 0, max: 20).rounded()) }
        return Int(linearScale(45 - remPercent, min: 0, max: 15).rounded())
    }

    /// Latency sub-score: <=15min ideal
    static func scoreLatency(latencyMinutes: Double) -> Int {
        if latencyMinutes <= 15 { return 100 }
        return Int(clamp(100 - ((latencyMinutes - 15) / 45) * 100, min: 0, max: 100).rounded())
    }

    /// WASO sub-score: <=10min ideal
    static func scoreWaso(wasoMinutes: Double) -> Int {
        if wasoMinutes <= 10 { return 100 }
        return Int(clamp(100 - ((wasoMinutes - 10) / 50) * 100, min: 0, max: 100).rounded())
    }

    /// Compute full sleep score
    static func computeSleepScore(
        totalSleepTime: Double,
        sleepEfficiency: Double,
        deepPercent: Double,
        remPercent: Double,
        sleepLatency: Double,
        waso: Double,
        hasStages: Bool
    ) -> SleepScoreData {
        let duration = Double(scoreDuration(totalSleepMinutes: totalSleepTime))
        let efficiency = Double(scoreEfficiency(efficiency: sleepEfficiency))
        let latency = Double(scoreLatency(latencyMinutes: sleepLatency))
        let wasoScore = Double(scoreWaso(wasoMinutes: waso))

        let deep = hasStages ? Double(scoreDeepSleep(deepPercent: deepPercent)) : 0
        let rem = hasStages ? Double(scoreRem(remPercent: remPercent)) : 0

        let overall: Double
        if hasStages {
            overall = duration * ScoreWeights.duration
                + efficiency * ScoreWeights.efficiency
                + deep * ScoreWeights.deepSleep
                + rem * ScoreWeights.rem
                + latency * ScoreWeights.latency
                + wasoScore * ScoreWeights.waso
        } else {
            overall = duration * ScoreWeightsFallback.duration
                + efficiency * ScoreWeightsFallback.efficiency
                + latency * ScoreWeightsFallback.latency
                + wasoScore * ScoreWeightsFallback.waso
        }

        return SleepScoreData(
            overall: Int(clamp(overall, min: 0, max: 100).rounded()),
            duration: Int(duration.rounded()),
            efficiency: Int(efficiency.rounded()),
            deepSleep: Int(deep.rounded()),
            rem: Int(rem.rounded()),
            latency: Int(latency.rounded()),
            waso: Int(wasoScore.rounded()),
            isFallback: !hasStages
        )
    }
}
```

**Step 4: Run tests — all should pass**

Run: `xcodebuild test -project SleepViz.xcodeproj -scheme SleepViz -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: All SleepScoringTests pass

**Step 5: Commit**

```bash
git add SleepViz/SleepViz/Services/SleepScoringEngine.swift SleepViz/SleepVizTests/SleepScoringTests.swift
git commit -m "feat: add sleep scoring engine with tests (port from TS)"
```

---

## Task 5: Session Builder + Statistics + Tests

**Files:**
- Create: `SleepViz/SleepViz/Services/SessionBuilder.swift`
- Create: `SleepViz/SleepVizTests/SessionBuilderTests.swift`

**Step 1: Write failing tests**

Create `SleepViz/SleepVizTests/SessionBuilderTests.swift`:

```swift
import Testing
import Foundation
@testable import SleepViz

struct SessionBuilderTests {

    private func makeDate(dayOffset: Int, hour: Int, minute: Int = 0) -> Date {
        var components = DateComponents()
        components.year = 2024
        components.month = 1
        components.day = 15 + dayOffset
        components.hour = hour
        components.minute = minute
        return Calendar.current.date(from: components)!
    }

    @Test func computeStats_basicStages() {
        let start = makeDate(dayOffset: 0, hour: 23, minute: 0)
        let end = makeDate(dayOffset: 1, hour: 7, minute: 0)

        let stages: [SleepStageInterval] = [
            SleepStageInterval(stage: .awake, startDate: makeDate(dayOffset: 0, hour: 23, minute: 0), endDate: makeDate(dayOffset: 0, hour: 23, minute: 10)),
            SleepStageInterval(stage: .core, startDate: makeDate(dayOffset: 0, hour: 23, minute: 10), endDate: makeDate(dayOffset: 1, hour: 0, minute: 30)),
            SleepStageInterval(stage: .deep, startDate: makeDate(dayOffset: 1, hour: 0, minute: 30), endDate: makeDate(dayOffset: 1, hour: 2, minute: 0)),
            SleepStageInterval(stage: .core, startDate: makeDate(dayOffset: 1, hour: 2, minute: 0), endDate: makeDate(dayOffset: 1, hour: 4, minute: 0)),
            SleepStageInterval(stage: .rem, startDate: makeDate(dayOffset: 1, hour: 4, minute: 0), endDate: makeDate(dayOffset: 1, hour: 5, minute: 30)),
            SleepStageInterval(stage: .core, startDate: makeDate(dayOffset: 1, hour: 5, minute: 30), endDate: makeDate(dayOffset: 1, hour: 7, minute: 0)),
        ]

        let stats = SessionBuilder.computeStats(startDate: start, endDate: end, stages: stages)

        #expect(stats.timeInBed == 480)
        #expect(stats.sleepLatency == 10)
        #expect(stats.deepMinutes == 90)
        #expect(stats.remMinutes == 90)
        #expect(stats.totalSleepTime > 0)
        #expect(stats.sleepEfficiency > 0)
        #expect(stats.sleepEfficiency <= 100)
    }

    @Test func computeStats_emptyStages() {
        let start = makeDate(dayOffset: 0, hour: 23, minute: 0)
        let end = makeDate(dayOffset: 1, hour: 7, minute: 0)

        let stats = SessionBuilder.computeStats(startDate: start, endDate: end, stages: [])

        #expect(stats.timeInBed == 480)
        #expect(stats.totalSleepTime > 0) // estimated
        #expect(stats.sleepEfficiency == 85) // default
        #expect(stats.deepMinutes == 0)
        #expect(stats.remMinutes == 0)
    }

    @Test func computeStats_waso() {
        let start = makeDate(dayOffset: 0, hour: 23, minute: 0)
        let end = makeDate(dayOffset: 1, hour: 7, minute: 0)

        let stages: [SleepStageInterval] = [
            SleepStageInterval(stage: .core, startDate: makeDate(dayOffset: 0, hour: 23, minute: 0), endDate: makeDate(dayOffset: 1, hour: 1, minute: 0)),
            SleepStageInterval(stage: .awake, startDate: makeDate(dayOffset: 1, hour: 1, minute: 0), endDate: makeDate(dayOffset: 1, hour: 1, minute: 15)),
            SleepStageInterval(stage: .deep, startDate: makeDate(dayOffset: 1, hour: 1, minute: 15), endDate: makeDate(dayOffset: 1, hour: 3, minute: 0)),
            SleepStageInterval(stage: .awake, startDate: makeDate(dayOffset: 1, hour: 3, minute: 0), endDate: makeDate(dayOffset: 1, hour: 3, minute: 5)),
            SleepStageInterval(stage: .rem, startDate: makeDate(dayOffset: 1, hour: 3, minute: 5), endDate: makeDate(dayOffset: 1, hour: 7, minute: 0)),
        ]

        let stats = SessionBuilder.computeStats(startDate: start, endDate: end, stages: stages)
        #expect(stats.waso == 20) // 15 + 5
    }

    @Test func getNightDate_evening() {
        let date = makeDate(dayOffset: 0, hour: 23, minute: 30)
        #expect(SleepViz.getNightDate(from: date) == "2024-01-15")
    }

    @Test func getNightDate_afterMidnight() {
        let date = makeDate(dayOffset: 1, hour: 1, minute: 30)
        #expect(SleepViz.getNightDate(from: date) == "2024-01-15")
    }
}
```

**Step 2: Run tests — expect compile error**

**Step 3: Write SessionBuilder.swift**

Port from `sleep-viz/src/lib/statistics.ts` + `sleepSessions.ts`. Create `SleepViz/SleepViz/Services/SessionBuilder.swift`:

```swift
import Foundation
import HealthKit

enum SessionBuilder {

    /// Compute per-night statistics from stages. Port of statistics.ts computeSessionStats.
    static func computeStats(
        startDate: Date,
        endDate: Date,
        stages: [SleepStageInterval]
    ) -> SleepStats {
        let timeInBed = endDate.timeIntervalSince(startDate) / 60.0

        var deepMinutes = 0.0
        var remMinutes = 0.0
        var coreMinutes = 0.0
        var awakeMinutes = 0.0

        for stage in stages {
            let duration = stage.endDate.timeIntervalSince(stage.startDate) / 60.0
            switch stage.stage {
            case .deep: deepMinutes += duration
            case .rem: remMinutes += duration
            case .core: coreMinutes += duration
            case .awake: awakeMinutes += duration
            }
        }

        let totalSleepTime = deepMinutes + remMinutes + coreMinutes
        let sleepEfficiency = timeInBed > 0 ? (totalSleepTime / timeInBed) * 100 : 0

        // Sleep latency: time from session start to first non-awake stage
        var sleepLatency = 0.0
        if !stages.isEmpty {
            let sorted = stages.sorted { $0.startDate < $1.startDate }
            if let firstSleep = sorted.first(where: { $0.stage != .awake }) {
                sleepLatency = firstSleep.startDate.timeIntervalSince(startDate) / 60.0
            }
        }

        // WASO: total awake time after first sleep onset
        var waso = 0.0
        if !stages.isEmpty {
            let sorted = stages.sorted { $0.startDate < $1.startDate }
            if let firstSleepIndex = sorted.firstIndex(where: { $0.stage != .awake }) {
                for i in (firstSleepIndex + 1)..<sorted.count {
                    if sorted[i].stage == .awake {
                        waso += sorted[i].endDate.timeIntervalSince(sorted[i].startDate) / 60.0
                    }
                }
            }
        }

        let hasStages = !stages.isEmpty
        let effectiveTST = hasStages ? totalSleepTime : timeInBed * 0.85
        let safeTST = max(effectiveTST, 1)

        return SleepStats(
            timeInBed: timeInBed,
            totalSleepTime: hasStages ? totalSleepTime : (timeInBed * 0.85).rounded(),
            sleepEfficiency: hasStages ? (sleepEfficiency * 10).rounded() / 10 : 85,
            sleepLatency: hasStages ? sleepLatency : 12,
            waso: hasStages ? waso : (timeInBed * 0.05).rounded(),
            deepMinutes: deepMinutes,
            remMinutes: remMinutes,
            coreMinutes: coreMinutes,
            awakeMinutes: awakeMinutes,
            deepPercent: hasStages ? ((deepMinutes / safeTST) * 1000).rounded() / 10 : 0,
            remPercent: hasStages ? ((remMinutes / safeTST) * 1000).rounded() / 10 : 0,
            corePercent: hasStages ? ((coreMinutes / safeTST) * 1000).rounded() / 10 : 0,
            awakePercent: hasStages ? ((awakeMinutes / safeTST) * 1000).rounded() / 10 : 0
        )
    }

    /// Map HKCategoryValueSleepAnalysis to SleepStageType
    static func mapSleepStage(_ value: Int) -> SleepStageType? {
        switch value {
        case HKCategoryValueSleepAnalysis.asleepCore.rawValue: return .core
        case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: return .deep
        case HKCategoryValueSleepAnalysis.asleepREM.rawValue: return .rem
        case HKCategoryValueSleepAnalysis.awake.rawValue: return .awake
        case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: return .core // fallback
        default: return nil // skip InBed
        }
    }

    /// Group raw sleep samples into sessions using 3-hour gap merge.
    static func groupIntoSessions(
        samples: [HKCategorySample]
    ) -> [[HKCategorySample]] {
        let sorted = samples.sorted { $0.startDate < $1.startDate }
        var groups: [[HKCategorySample]] = []
        var current: [HKCategorySample] = []

        for sample in sorted {
            if let last = current.last {
                let gap = sample.startDate.timeIntervalSince(last.endDate)
                if gap > gapMergeThreshold {
                    groups.append(current)
                    current = [sample]
                } else {
                    current.append(sample)
                }
            } else {
                current.append(sample)
            }
        }
        if !current.isEmpty { groups.append(current) }
        return groups
    }
}
```

**Step 4: Run tests — all should pass**

**Step 5: Commit**

```bash
git add SleepViz/SleepViz/Services/SessionBuilder.swift SleepViz/SleepVizTests/SessionBuilderTests.swift
git commit -m "feat: add session builder with statistics computation and tests"
```

---

## Task 6: Readiness Scoring Engine

**Files:**
- Create: `SleepViz/SleepViz/Services/ReadinessEngine.swift`

**Step 1: Write ReadinessEngine.swift**

Create `SleepViz/SleepViz/Services/ReadinessEngine.swift`:

```swift
import Foundation

enum ReadinessEngine {

    /// Compute HRV component (50% of readiness score).
    /// Compares current HRV to 7-day baseline.
    /// At baseline = 70, >15% above = 100, >15% below = 40.
    static func scoreHRV(current: Double, baseline: Double) -> Int {
        guard baseline > 0 else { return 50 }
        let ratio = current / baseline
        if ratio >= 1.15 { return 100 }
        if ratio <= 0.85 { return 40 }
        // Linear interpolation: 0.85 -> 40, 1.0 -> 70, 1.15 -> 100
        if ratio >= 1.0 {
            return Int((70 + (ratio - 1.0) / 0.15 * 30).rounded())
        } else {
            return Int((40 + (ratio - 0.85) / 0.15 * 30).rounded())
        }
    }

    /// Compute resting HR component (30% of readiness score).
    /// Lower than baseline is better. >5bpm above baseline = 40.
    static func scoreRestingHR(current: Double, baseline: Double) -> Int {
        guard baseline > 0 else { return 50 }
        let diff = current - baseline // positive means higher (worse)
        if diff <= -5 { return 100 }
        if diff >= 5 { return 40 }
        // Linear: -5 -> 100, 0 -> 80, +5 -> 40
        return Int((80 - diff * 8).rounded())
    }

    /// Compute readiness score (0-100).
    /// HRV (50%) + Resting HR (30%) + Sleep Score (20%)
    static func computeReadinessScore(
        hrvCurrent: Double,
        hrvBaseline: Double,
        restingHRCurrent: Double,
        restingHRBaseline: Double,
        sleepScore: Int
    ) -> Int {
        let hrvScore = Double(scoreHRV(current: hrvCurrent, baseline: hrvBaseline))
        let hrScore = Double(scoreRestingHR(current: restingHRCurrent, baseline: restingHRBaseline))
        let sleepContribution = Double(sleepScore)

        let overall = hrvScore * 0.50 + hrScore * 0.30 + sleepContribution * 0.20
        return Int(min(100, max(0, overall)).rounded())
    }
}
```

**Step 2: Commit**

```bash
git add SleepViz/SleepViz/Services/ReadinessEngine.swift
git commit -m "feat: add readiness scoring engine (HRV + resting HR + sleep)"
```

---

## Task 7: HealthKit Service

**Files:**
- Create: `SleepViz/SleepViz/Services/HealthKitService.swift`

**Step 1: Write HealthKitService.swift**

Create `SleepViz/SleepViz/Services/HealthKitService.swift`:

```swift
import Foundation
import HealthKit

final class HealthKitService {
    private let store = HKHealthStore()

    static let shared = HealthKitService()
    private init() {}

    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    // MARK: - Authorization

    private var readTypes: Set<HKObjectType> {
        Set([
            HKCategoryType(.sleepAnalysis),
            HKQuantityType(.heartRate),
            HKQuantityType(.heartRateVariabilitySDNN),
            HKQuantityType(.oxygenSaturation),
            HKQuantityType(.respiratoryRate),
            HKQuantityType(.restingHeartRate),
        ])
    }

    func requestAuthorization() async throws {
        try await store.requestAuthorization(toShare: [], read: readTypes)
    }

    // MARK: - Sleep Data

    func fetchSleepSamples(from startDate: Date, to endDate: Date) async throws -> [HKCategorySample] {
        let sleepType = HKCategoryType(.sleepAnalysis)
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: (samples as? [HKCategorySample]) ?? [])
            }
            store.execute(query)
        }
    }

    // MARK: - Biometrics

    func fetchQuantitySamples(
        type: HKQuantityTypeIdentifier,
        from startDate: Date,
        to endDate: Date,
        unit: HKUnit
    ) async throws -> [(date: Date, value: Double)] {
        let quantityType = HKQuantityType(type)
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: quantityType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let results = (samples as? [HKQuantitySample])?.map { sample in
                    (date: sample.startDate, value: sample.quantity.doubleValue(for: unit))
                } ?? []
                continuation.resume(returning: results)
            }
            store.execute(query)
        }
    }

    /// Fetch heart rate samples during a sleep window.
    func fetchHeartRate(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .heartRate, from: startDate, to: endDate, unit: .count().unitDivided(by: .minute()))
    }

    /// Fetch HRV (SDNN) samples.
    func fetchHRV(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .heartRateVariabilitySDNN, from: startDate, to: endDate, unit: .secondUnit(with: .milli))
    }

    /// Fetch SpO2 samples.
    func fetchSpO2(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .oxygenSaturation, from: startDate, to: endDate, unit: .percent())
    }

    /// Fetch respiratory rate samples.
    func fetchRespiratoryRate(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .respiratoryRate, from: startDate, to: endDate, unit: .count().unitDivided(by: .minute()))
    }

    /// Fetch resting heart rate samples.
    func fetchRestingHeartRate(from startDate: Date, to endDate: Date) async throws -> [(date: Date, value: Double)] {
        try await fetchQuantitySamples(type: .restingHeartRate, from: startDate, to: endDate, unit: .count().unitDivided(by: .minute()))
    }
}
```

**Step 2: Commit**

```bash
git add SleepViz/SleepViz/Services/HealthKitService.swift
git commit -m "feat: add HealthKit service for sleep and biometric queries"
```

---

## Task 8: Sync Manager

**Files:**
- Create: `SleepViz/SleepViz/Services/SyncManager.swift`

**Step 1: Write SyncManager.swift**

Create `SleepViz/SleepViz/Services/SyncManager.swift`:

```swift
import Foundation
import SwiftData
import HealthKit

@MainActor
@Observable
final class SyncManager {
    var isSyncing = false
    var lastSyncDate: Date?
    var syncError: String?

    private let healthKit = HealthKitService.shared

    /// Full sync: pull HealthKit data, compute scores, persist to SwiftData.
    func sync(modelContext: ModelContext) async {
        guard !isSyncing else { return }
        isSyncing = true
        syncError = nil

        do {
            // Determine date range: from last sync or 90 days ago
            let endDate = Date()
            let startDate = lastSyncDate ?? Calendar.current.date(byAdding: .day, value: -90, to: endDate)!

            // 1. Fetch sleep samples
            let sleepSamples = try await healthKit.fetchSleepSamples(from: startDate, to: endDate)

            // Filter out InBed samples (only keep actual sleep stages)
            let stageSamples = sleepSamples.filter { sample in
                let value = sample.value
                return value != HKCategoryValueSleepAnalysis.inBed.rawValue
            }

            // 2. Group into sessions
            let groups = SessionBuilder.groupIntoSessions(samples: stageSamples)

            // 3. Process each session
            for group in groups {
                guard let first = group.first, let last = group.last else { continue }
                let sessionStart = first.startDate
                let sessionEnd = group.map(\.endDate).max() ?? last.endDate
                let nightDate = getNightDate(from: sessionStart)

                // Skip if we already have this night
                let existing = try modelContext.fetch(
                    FetchDescriptor<SleepSession>(
                        predicate: #Predicate { $0.nightDate == nightDate }
                    )
                )
                if !existing.isEmpty { continue }

                // Convert HK samples to SleepStageIntervals
                let stages: [SleepStageInterval] = group.compactMap { sample in
                    guard let stage = SessionBuilder.mapSleepStage(sample.value) else { return nil }
                    return SleepStageInterval(stage: stage, startDate: sample.startDate, endDate: sample.endDate)
                }

                // Compute stats
                let stats = SessionBuilder.computeStats(startDate: sessionStart, endDate: sessionEnd, stages: stages)

                // Compute score
                let score = SleepScoringEngine.computeSleepScore(
                    totalSleepTime: stats.totalSleepTime,
                    sleepEfficiency: stats.sleepEfficiency,
                    deepPercent: stats.deepPercent,
                    remPercent: stats.remPercent,
                    sleepLatency: stats.sleepLatency,
                    waso: stats.waso,
                    hasStages: !stages.isEmpty
                )

                // Fetch biometrics for this session window
                let biometrics = await fetchBiometrics(from: sessionStart, to: sessionEnd)

                // Persist
                let session = SleepSession(
                    nightDate: nightDate,
                    startDate: sessionStart,
                    endDate: sessionEnd,
                    stages: stages,
                    score: score,
                    stats: stats,
                    biometrics: biometrics,
                    isFallback: stages.isEmpty
                )
                modelContext.insert(session)
            }

            // 4. Compute readiness scores
            try await computeReadinessScores(modelContext: modelContext)

            try modelContext.save()
            lastSyncDate = endDate
            UserDefaults.standard.set(endDate, forKey: "lastSyncDate")

        } catch {
            syncError = error.localizedDescription
        }

        isSyncing = false
    }

    private func fetchBiometrics(from start: Date, to end: Date) async -> BiometricSummary {
        var summary = BiometricSummary()

        // Heart rate
        if let hrSamples = try? await healthKit.fetchHeartRate(from: start, to: end), !hrSamples.isEmpty {
            let values = hrSamples.map(\.value)
            summary.avgHeartRate = values.reduce(0, +) / Double(values.count)
            summary.minHeartRate = values.min()
            summary.maxHeartRate = values.max()
        }

        // HRV
        if let hrvSamples = try? await healthKit.fetchHRV(from: start, to: end), !hrvSamples.isEmpty {
            summary.avgHrv = hrvSamples.map(\.value).reduce(0, +) / Double(hrvSamples.count)
        }

        // SpO2
        if let spo2Samples = try? await healthKit.fetchSpO2(from: start, to: end), !spo2Samples.isEmpty {
            summary.avgSpo2 = spo2Samples.map(\.value).reduce(0, +) / Double(spo2Samples.count) * 100
        }

        // Respiratory rate
        if let rrSamples = try? await healthKit.fetchRespiratoryRate(from: start, to: end), !rrSamples.isEmpty {
            summary.avgRespiratoryRate = rrSamples.map(\.value).reduce(0, +) / Double(rrSamples.count)
        }

        return summary
    }

    private func computeReadinessScores(modelContext: ModelContext) async throws {
        // Get recent sessions for baseline computation
        let descriptor = FetchDescriptor<SleepSession>(
            sortBy: [SortDescriptor(\.nightDate, order: .reverse)]
        )
        let sessions = try modelContext.fetch(descriptor)
        guard let latest = sessions.first else { return }

        let nightDate = latest.nightDate
        let biometrics = latest.biometrics

        // Check if readiness already exists for this date
        let existing = try modelContext.fetch(
            FetchDescriptor<ReadinessRecord>(
                predicate: #Predicate { $0.date == nightDate }
            )
        )
        if !existing.isEmpty { return }

        // Compute 7-day HRV baseline
        let recentSessions = Array(sessions.prefix(7))
        let hrvValues = recentSessions.compactMap(\.biometrics.avgHrv)
        let hrvBaseline = hrvValues.isEmpty ? 0 : hrvValues.reduce(0, +) / Double(hrvValues.count)
        let hrvCurrent = biometrics.avgHrv ?? hrvBaseline

        // Fetch resting HR
        let endDate = Date()
        let startDate7d = Calendar.current.date(byAdding: .day, value: -7, to: endDate)!
        let restingHRSamples = (try? await healthKit.fetchRestingHeartRate(from: startDate7d, to: endDate)) ?? []
        let restingHRBaseline = restingHRSamples.isEmpty ? 0 : restingHRSamples.map(\.value).reduce(0, +) / Double(restingHRSamples.count)
        let restingHRCurrent = restingHRSamples.last?.value ?? restingHRBaseline

        let sleepScore = latest.score.overall

        let readinessScore = ReadinessEngine.computeReadinessScore(
            hrvCurrent: hrvCurrent,
            hrvBaseline: hrvBaseline,
            restingHRCurrent: restingHRCurrent,
            restingHRBaseline: restingHRBaseline,
            sleepScore: sleepScore
        )

        let record = ReadinessRecord(
            date: nightDate,
            score: readinessScore,
            hrvBaseline: hrvBaseline,
            hrvCurrent: hrvCurrent,
            restingHRBaseline: restingHRBaseline,
            restingHRCurrent: restingHRCurrent,
            sleepScoreContribution: sleepScore
        )
        modelContext.insert(record)
    }
}
```

**Step 2: Commit**

```bash
git add SleepViz/SleepViz/Services/SyncManager.swift
git commit -m "feat: add sync manager orchestrating HealthKit -> scoring -> SwiftData"
```

---

## Task 9: App Entry Point + Tab View

**Files:**
- Modify: `SleepViz/SleepViz/SleepVizApp.swift`
- Create: `SleepViz/SleepViz/Views/MainTabView.swift`

**Step 1: Write SleepVizApp.swift**

Replace the generated `SleepVizApp.swift`:

```swift
import SwiftUI
import SwiftData
import BackgroundTasks

@main
struct SleepVizApp: App {
    @State private var syncManager = SyncManager()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environment(syncManager)
                .preferredColorScheme(.dark)
        }
        .modelContainer(for: [SleepSession.self, ReadinessRecord.self])
    }

    init() {
        // Register background task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.sleepviz.sync",
            using: nil
        ) { task in
            self.handleBackgroundSync(task: task as! BGAppRefreshTask)
        }
    }

    private func handleBackgroundSync(task: BGAppRefreshTask) {
        task.expirationHandler = { task.setTaskCompleted(success: false) }
        scheduleNextBackgroundSync()
        // Background sync needs its own model container
        Task {
            task.setTaskCompleted(success: true)
        }
    }

    static func scheduleNextBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: "com.sleepviz.sync")
        request.earliestBeginDate = Date(timeIntervalSinceNow: 4 * 60 * 60) // 4 hours
        try? BGTaskScheduler.shared.submit(request)
    }
}
```

**Step 2: Write MainTabView.swift**

Create `SleepViz/SleepViz/Views/MainTabView.swift`:

```swift
import SwiftUI

struct MainTabView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        TabView {
            Tab("Today", systemImage: "moon.fill") {
                TodayView()
            }
            Tab("Sleep", systemImage: "bed.double.fill") {
                SleepDetailView()
            }
            Tab("Readiness", systemImage: "heart.fill") {
                ReadinessView()
            }
            Tab("Trends", systemImage: "chart.line.uptrend.xyaxis") {
                TrendsView()
            }
            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView()
            }
        }
        .tint(.white)
        .task {
            // Request HealthKit authorization and sync on first appear
            if HealthKitService.shared.isAvailable {
                try? await HealthKitService.shared.requestAuthorization()
                await syncManager.sync(modelContext: modelContext)
            }
        }
    }
}
```

**Step 3: Commit**

```bash
git add SleepViz/SleepViz/SleepVizApp.swift SleepViz/SleepViz/Views/MainTabView.swift
git commit -m "feat: add app entry point with tab navigation and background sync"
```

---

## Task 10: Reusable Components (ScoreRing, StatCard, ScoreBadge, PeriodSelector)

**Files:**
- Create: `SleepViz/SleepViz/Views/Components/ScoreRing.swift`
- Create: `SleepViz/SleepViz/Views/Components/StatCard.swift`
- Create: `SleepViz/SleepViz/Views/Components/ScoreBadge.swift`
- Create: `SleepViz/SleepViz/Views/Components/PeriodSelector.swift`

**Step 1: Write ScoreRing.swift**

Create `SleepViz/SleepViz/Views/Components/ScoreRing.swift`:

```swift
import SwiftUI

struct ScoreRing: View {
    let score: Int
    let label: String?
    var size: CGFloat = 200
    var lineWidth: CGFloat = 16
    var accentColor: Color? = nil

    @State private var animatedProgress: Double = 0

    private var progress: Double { Double(score) / 100.0 }
    private var scoreColor: Color { accentColor ?? getScoreInfo(score).color }

    var body: some View {
        ZStack {
            // Background track
            Circle()
                .stroke(AppTheme.cardBackground, lineWidth: lineWidth)

            // Score arc
            Circle()
                .trim(from: 0, to: animatedProgress)
                .stroke(
                    AngularGradient(
                        colors: [scoreColor.opacity(0.6), scoreColor],
                        center: .center,
                        startAngle: .degrees(0),
                        endAngle: .degrees(360 * animatedProgress)
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Score text
            VStack(spacing: 4) {
                Text("\(score)")
                    .font(.system(size: size * 0.25, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())

                if let label {
                    Text(label)
                        .font(.system(size: size * 0.07, weight: .medium))
                        .foregroundStyle(scoreColor)
                }
            }
        }
        .frame(width: size, height: size)
        .onAppear {
            withAnimation(.easeOut(duration: 1.2)) {
                animatedProgress = progress
            }
        }
        .onChange(of: score) { _, _ in
            withAnimation(.easeOut(duration: 0.8)) {
                animatedProgress = progress
            }
        }
    }
}
```

**Step 2: Write StatCard.swift**

Create `SleepViz/SleepViz/Views/Components/StatCard.swift`:

```swift
import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil
    var icon: String? = nil
    var iconColor: Color = .white

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption)
                        .foregroundStyle(iconColor)
                }
                Text(title)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Text(value)
                .font(.title3.bold())
                .foregroundStyle(AppTheme.textPrimary)

            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

**Step 3: Write ScoreBadge.swift**

Create `SleepViz/SleepViz/Views/Components/ScoreBadge.swift`:

```swift
import SwiftUI

struct ScoreBadge: View {
    let score: Int

    private var info: ScoreInfo { getScoreInfo(score) }

    var body: some View {
        Text(info.label)
            .font(.caption.bold())
            .foregroundStyle(info.color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(info.color.opacity(0.15))
            .clipShape(Capsule())
    }
}
```

**Step 4: Write PeriodSelector.swift**

Create `SleepViz/SleepViz/Views/Components/PeriodSelector.swift`:

```swift
import SwiftUI

enum TimePeriod: String, CaseIterable {
    case week = "7d"
    case month = "30d"
    case quarter = "90d"

    var days: Int {
        switch self {
        case .week: 7
        case .month: 30
        case .quarter: 90
        }
    }
}

struct PeriodSelector: View {
    @Binding var selection: TimePeriod

    var body: some View {
        Picker("Period", selection: $selection) {
            ForEach(TimePeriod.allCases, id: \.self) { period in
                Text(period.rawValue).tag(period)
            }
        }
        .pickerStyle(.segmented)
    }
}
```

**Step 5: Commit**

```bash
git add SleepViz/SleepViz/Views/Components/
git commit -m "feat: add reusable components (ScoreRing, StatCard, ScoreBadge, PeriodSelector)"
```

---

## Task 11: Today Tab

**Files:**
- Create: `SleepViz/SleepViz/Views/Today/TodayView.swift`
- Create: `SleepViz/SleepViz/Views/Today/SubScoreBars.swift`

**Step 1: Write TodayView.swift**

Create `SleepViz/SleepViz/Views/Today/TodayView.swift`:

```swift
import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var sessions: [SleepSession]

    private var latestSession: SleepSession? { sessions.first }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let session = latestSession {
                    VStack(spacing: 24) {
                        // Score Ring
                        ScoreRing(
                            score: session.score.overall,
                            label: getScoreInfo(session.score.overall).label,
                            size: 220
                        )
                        .padding(.top, 20)

                        // Last Night Summary
                        lastNightCard(session)

                        // Sub-scores
                        SubScoreBars(score: session.score)

                        // Quick Insight
                        insightCard(session)
                    }
                    .padding()
                } else {
                    emptyState
                }
            }
            .background(AppTheme.background)
            .navigationTitle("Sleep Score")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable {
                await syncManager.sync(modelContext: modelContext)
            }
        }
    }

    private func lastNightCard(_ session: SleepSession) -> some View {
        VStack(spacing: 12) {
            Text("LAST NIGHT")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack {
                StatCard(
                    title: "Bedtime",
                    value: formatTime(session.startDate),
                    icon: "moon.fill",
                    iconColor: .purple
                )
                StatCard(
                    title: "Wake",
                    value: formatTime(session.endDate),
                    icon: "sun.max.fill",
                    iconColor: .yellow
                )
            }

            StatCard(
                title: "Total Sleep",
                value: formatDuration(minutes: session.stats.totalSleepTime),
                icon: "clock.fill",
                iconColor: .blue
            )
        }
    }

    private func insightCard(_ session: SleepSession) -> some View {
        let avgDuration = sessions.prefix(7).map(\.stats.totalSleepTime).reduce(0, +)
            / max(Double(min(sessions.count, 7)), 1)
        let diff = session.stats.totalSleepTime - avgDuration
        let insight: String
        if abs(diff) < 15 {
            insight = "Your sleep duration was close to your weekly average."
        } else if diff > 0 {
            insight = "You slept \(formatDuration(minutes: diff)) more than your weekly average."
        } else {
            insight = "You slept \(formatDuration(minutes: abs(diff))) less than your weekly average."
        }

        return VStack(alignment: .leading, spacing: 8) {
            Label("Insight", systemImage: "lightbulb.fill")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
            Text(insight)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 60))
                .foregroundStyle(AppTheme.textTertiary)
            Text("No Sleep Data")
                .font(.title2.bold())
                .foregroundStyle(AppTheme.textPrimary)
            Text("Wear your Apple Watch to bed and sleep data will appear here automatically.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            if syncManager.isSyncing {
                ProgressView()
                    .tint(.white)
                    .padding(.top)
            }
        }
        .padding(.top, 100)
    }
}
```

**Step 2: Write SubScoreBars.swift**

Create `SleepViz/SleepViz/Views/Today/SubScoreBars.swift`:

```swift
import SwiftUI

struct SubScoreBars: View {
    let score: SleepScoreData

    private struct SubScore: Identifiable {
        let id = UUID()
        let name: String
        let value: Int
        let icon: String
    }

    private var subScores: [SubScore] {
        var items = [
            SubScore(name: "Duration", value: score.duration, icon: "clock"),
            SubScore(name: "Efficiency", value: score.efficiency, icon: "gauge.with.dots.needle.33percent"),
        ]
        if !score.isFallback {
            items.append(contentsOf: [
                SubScore(name: "Deep Sleep", value: score.deepSleep, icon: "waveform.path.ecg"),
                SubScore(name: "REM Sleep", value: score.rem, icon: "brain"),
            ])
        }
        items.append(contentsOf: [
            SubScore(name: "Latency", value: score.latency, icon: "hourglass"),
            SubScore(name: "WASO", value: score.waso, icon: "eye"),
        ])
        return items
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SCORE BREAKDOWN")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            ForEach(subScores) { sub in
                HStack(spacing: 12) {
                    Image(systemName: sub.icon)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 16)

                    Text(sub.name)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 80, alignment: .leading)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(AppTheme.cardBackground)
                                .frame(height: 8)

                            RoundedRectangle(cornerRadius: 4)
                                .fill(getScoreInfo(sub.value).color)
                                .frame(width: geo.size.width * CGFloat(sub.value) / 100, height: 8)
                        }
                    }
                    .frame(height: 8)

                    Text("\(sub.value)")
                        .font(.subheadline.bold())
                        .foregroundStyle(AppTheme.textPrimary)
                        .frame(width: 30, alignment: .trailing)
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

**Step 3: Commit**

```bash
git add SleepViz/SleepViz/Views/Today/
git commit -m "feat: add Today tab with score ring, sub-scores, and insight card"
```

---

## Task 12: Sleep Detail Tab (Hypnogram + Biometrics)

**Files:**
- Create: `SleepViz/SleepViz/Views/Sleep/SleepDetailView.swift`
- Create: `SleepViz/SleepViz/Views/Sleep/HypnogramView.swift`
- Create: `SleepViz/SleepViz/Views/Sleep/NightPicker.swift`
- Create: `SleepViz/SleepViz/Views/Sleep/StageDonutChart.swift`
- Create: `SleepViz/SleepViz/Views/Sleep/BiometricsCards.swift`

**Step 1: Write NightPicker.swift**

Create `SleepViz/SleepViz/Views/Sleep/NightPicker.swift`:

```swift
import SwiftUI

struct NightPicker: View {
    let nightDates: [String]
    @Binding var selectedIndex: Int

    var body: some View {
        HStack {
            Button {
                withAnimation { selectedIndex = min(selectedIndex + 1, nightDates.count - 1) }
            } label: {
                Image(systemName: "chevron.left")
                    .foregroundStyle(selectedIndex < nightDates.count - 1 ? .white : AppTheme.textTertiary)
            }
            .disabled(selectedIndex >= nightDates.count - 1)

            Spacer()

            if nightDates.indices.contains(selectedIndex) {
                Text(formatNightDate(nightDates[selectedIndex]))
                    .font(.headline)
                    .foregroundStyle(.white)
            }

            Spacer()

            Button {
                withAnimation { selectedIndex = max(selectedIndex - 1, 0) }
            } label: {
                Image(systemName: "chevron.right")
                    .foregroundStyle(selectedIndex > 0 ? .white : AppTheme.textTertiary)
            }
            .disabled(selectedIndex <= 0)
        }
        .padding(.horizontal)
    }
}
```

**Step 2: Write HypnogramView.swift**

Create `SleepViz/SleepViz/Views/Sleep/HypnogramView.swift`:

```swift
import SwiftUI

struct HypnogramView: View {
    let stages: [SleepStageInterval]
    let sessionStart: Date
    let sessionEnd: Date

    private let stageOrder: [SleepStageType] = [.awake, .rem, .core, .deep]
    private let stageLabels = ["Awake", "REM", "Core", "Deep"]

    private func yPosition(for stage: SleepStageType, height: CGFloat) -> CGFloat {
        let index = stageOrder.firstIndex(of: stage) ?? 0
        let step = height / CGFloat(stageOrder.count)
        return step * CGFloat(index) + step / 2
    }

    private func stageColor(for stage: SleepStageType) -> Color {
        switch stage {
        case .awake: StageColor.awake
        case .rem: StageColor.rem
        case .core: StageColor.core
        case .deep: StageColor.deep
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SLEEP STAGES")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            GeometryReader { geo in
                let totalDuration = sessionEnd.timeIntervalSince(sessionStart)
                let width = geo.size.width - 50 // leave room for labels
                let height = geo.size.height

                HStack(spacing: 0) {
                    // Y-axis labels
                    VStack(spacing: 0) {
                        ForEach(Array(stageLabels.enumerated()), id: \.offset) { _, label in
                            Text(label)
                                .font(.system(size: 9))
                                .foregroundStyle(AppTheme.textTertiary)
                                .frame(maxHeight: .infinity)
                        }
                    }
                    .frame(width: 45)

                    // Stage blocks
                    Canvas { context, size in
                        for stage in stages {
                            let startOffset = stage.startDate.timeIntervalSince(sessionStart)
                            let duration = stage.endDate.timeIntervalSince(stage.startDate)
                            let x = (startOffset / totalDuration) * Double(width)
                            let w = (duration / totalDuration) * Double(width)
                            let stageIndex = stageOrder.firstIndex(of: stage.stage) ?? 0
                            let stepH = Double(size.height) / Double(stageOrder.count)
                            let y = stepH * Double(stageIndex)

                            let rect = CGRect(x: x, y: y, width: max(w, 1), height: stepH)
                            context.fill(
                                Path(rect),
                                with: .color(stageColor(for: stage.stage))
                            )
                        }
                    }
                    .frame(width: width, height: height)
                }
            }
            .frame(height: 120)

            // Time axis
            HStack {
                Text(formatTime(sessionStart))
                Spacer()
                Text(formatTime(sessionEnd))
            }
            .font(.caption2)
            .foregroundStyle(AppTheme.textTertiary)
            .padding(.leading, 45)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

**Step 3: Write StageDonutChart.swift**

Create `SleepViz/SleepViz/Views/Sleep/StageDonutChart.swift`:

```swift
import SwiftUI
import Charts

struct StageDonutChart: View {
    let stats: SleepStats

    private struct StageSlice: Identifiable {
        let id = UUID()
        let stage: String
        let minutes: Double
        let color: Color
    }

    private var slices: [StageSlice] {
        [
            StageSlice(stage: "Deep", minutes: stats.deepMinutes, color: StageColor.deep),
            StageSlice(stage: "Core", minutes: stats.coreMinutes, color: StageColor.core),
            StageSlice(stage: "REM", minutes: stats.remMinutes, color: StageColor.rem),
            StageSlice(stage: "Awake", minutes: stats.awakeMinutes, color: StageColor.awake),
        ].filter { $0.minutes > 0 }
    }

    var body: some View {
        VStack(spacing: 12) {
            Text("STAGE DISTRIBUTION")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Chart(slices) { slice in
                SectorMark(
                    angle: .value("Duration", slice.minutes),
                    innerRadius: .ratio(0.6),
                    angularInset: 2
                )
                .foregroundStyle(slice.color)
            }
            .frame(height: 150)

            // Legend
            HStack(spacing: 16) {
                ForEach(slices) { slice in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(slice.color)
                            .frame(width: 8, height: 8)
                        Text("\(slice.stage) \(formatDuration(minutes: slice.minutes))")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

**Step 4: Write BiometricsCards.swift**

Create `SleepViz/SleepViz/Views/Sleep/BiometricsCards.swift`:

```swift
import SwiftUI

struct BiometricsCards: View {
    let biometrics: BiometricSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("BIOMETRICS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                StatCard(
                    title: "Avg Heart Rate",
                    value: formatBpm(biometrics.avgHeartRate),
                    subtitle: biometrics.minHeartRate.map { "Min: \(formatBpm($0))" },
                    icon: "heart.fill",
                    iconColor: .red
                )
                StatCard(
                    title: "HRV",
                    value: formatMs(biometrics.avgHrv),
                    icon: "waveform.path.ecg",
                    iconColor: .green
                )
                StatCard(
                    title: "Blood Oxygen",
                    value: biometrics.avgSpo2.map { formatPercent($0) } ?? "—",
                    icon: "lungs.fill",
                    iconColor: .cyan
                )
                StatCard(
                    title: "Respiratory Rate",
                    value: biometrics.avgRespiratoryRate.map { "\(Int($0.rounded())) brpm" } ?? "—",
                    icon: "wind",
                    iconColor: .teal
                )
            }
        }
    }
}
```

**Step 5: Write SleepDetailView.swift**

Create `SleepViz/SleepViz/Views/Sleep/SleepDetailView.swift`:

```swift
import SwiftUI
import SwiftData

struct SleepDetailView: View {
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var sessions: [SleepSession]
    @State private var selectedIndex = 0

    private var selectedSession: SleepSession? {
        sessions.indices.contains(selectedIndex) ? sessions[selectedIndex] : nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let session = selectedSession {
                    VStack(spacing: 20) {
                        NightPicker(
                            nightDates: sessions.map(\.nightDate),
                            selectedIndex: $selectedIndex
                        )

                        HypnogramView(
                            stages: session.stages,
                            sessionStart: session.startDate,
                            sessionEnd: session.endDate
                        )

                        if session.stats.deepMinutes + session.stats.remMinutes +
                           session.stats.coreMinutes + session.stats.awakeMinutes > 0 {
                            StageDonutChart(stats: session.stats)
                        }

                        BiometricsCards(biometrics: session.biometrics)

                        SubScoreBars(score: session.score)
                    }
                    .padding()
                } else {
                    Text("No sleep data available")
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.top, 100)
                }
            }
            .background(AppTheme.background)
            .navigationTitle("Sleep Detail")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
```

**Step 6: Commit**

```bash
git add SleepViz/SleepViz/Views/Sleep/
git commit -m "feat: add Sleep tab with hypnogram, stage donut, biometrics, and night picker"
```

---

## Task 13: Readiness Tab

**Files:**
- Create: `SleepViz/SleepViz/Views/Readiness/ReadinessView.swift`
- Create: `SleepViz/SleepViz/Views/Readiness/HRVTrendChart.swift`
- Create: `SleepViz/SleepViz/Views/Readiness/RestingHRChart.swift`

**Step 1: Write ReadinessView.swift**

Create `SleepViz/SleepViz/Views/Readiness/ReadinessView.swift`:

```swift
import SwiftUI
import SwiftData

struct ReadinessView: View {
    @Query(sort: \ReadinessRecord.date, order: .reverse) private var records: [ReadinessRecord]
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var sessions: [SleepSession]

    private var latest: ReadinessRecord? { records.first }

    var body: some View {
        NavigationStack {
            ScrollView {
                if let record = latest {
                    VStack(spacing: 24) {
                        ScoreRing(
                            score: record.score,
                            label: getScoreInfo(record.score).label,
                            size: 200,
                            accentColor: Color(hex: "#f59e0b") // amber
                        )
                        .padding(.top, 20)

                        contributingFactors(record)

                        HRVTrendChart(sessions: Array(sessions.prefix(30)))

                        RestingHRChart(records: Array(records.prefix(30)))
                    }
                    .padding()
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "heart.text.clipboard")
                            .font(.system(size: 60))
                            .foregroundStyle(AppTheme.textTertiary)
                        Text("No Readiness Data")
                            .font(.title2.bold())
                            .foregroundStyle(AppTheme.textPrimary)
                        Text("Sleep data with HRV measurements is needed to compute readiness.")
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .padding(.top, 100)
                }
            }
            .background(AppTheme.background)
            .navigationTitle("Readiness")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func contributingFactors(_ record: ReadinessRecord) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CONTRIBUTING FACTORS")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            factorRow(
                title: "HRV",
                current: formatMs(record.hrvCurrent),
                baseline: formatMs(record.hrvBaseline),
                icon: "waveform.path.ecg",
                color: .green
            )
            factorRow(
                title: "Resting HR",
                current: formatBpm(record.restingHRCurrent),
                baseline: formatBpm(record.restingHRBaseline),
                icon: "heart.fill",
                color: .red
            )
            factorRow(
                title: "Sleep Score",
                current: "\(record.sleepScoreContribution)",
                baseline: nil,
                icon: "moon.fill",
                color: .purple
            )
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }

    private func factorRow(title: String, current: String, baseline: String?, icon: String, color: Color) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(color)
                .frame(width: 20)
            Text(title)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            Spacer()
            VStack(alignment: .trailing) {
                Text(current)
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                if let baseline {
                    Text("Baseline: \(baseline)")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textTertiary)
                }
            }
        }
    }
}
```

**Step 2: Write HRVTrendChart.swift**

Create `SleepViz/SleepViz/Views/Readiness/HRVTrendChart.swift`:

```swift
import SwiftUI
import Charts

struct HRVTrendChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let hrv: Double
    }

    private var dataPoints: [DataPoint] {
        sessions.reversed().compactMap { session in
            guard let hrv = session.biometrics.avgHrv else { return nil }
            return DataPoint(date: session.nightDate, hrv: hrv)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("HRV TREND")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            if dataPoints.isEmpty {
                Text("No HRV data available")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textTertiary)
                    .frame(height: 150)
            } else {
                Chart(dataPoints) { point in
                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("HRV", point.hrv)
                    )
                    .foregroundStyle(.green)
                    .interpolationMethod(.catmullRom)
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            Text("\(value.as(Int.self) ?? 0) ms")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                }
                .frame(height: 150)
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

**Step 3: Write RestingHRChart.swift**

Create `SleepViz/SleepViz/Views/Readiness/RestingHRChart.swift`:

```swift
import SwiftUI
import Charts

struct RestingHRChart: View {
    let records: [ReadinessRecord]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let hr: Double
    }

    private var dataPoints: [DataPoint] {
        records.reversed().map { record in
            DataPoint(date: record.date, hr: record.restingHRCurrent)
        }.filter { $0.hr > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("RESTING HEART RATE")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            if dataPoints.isEmpty {
                Text("No resting HR data available")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textTertiary)
                    .frame(height: 150)
            } else {
                Chart(dataPoints) { point in
                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("HR", point.hr)
                    )
                    .foregroundStyle(.red)
                    .interpolationMethod(.catmullRom)
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisValueLabel {
                            Text("\(value.as(Int.self) ?? 0) bpm")
                                .font(.caption2)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                }
                .frame(height: 150)
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

**Step 4: Commit**

```bash
git add SleepViz/SleepViz/Views/Readiness/
git commit -m "feat: add Readiness tab with score ring, factors, HRV and HR trends"
```

---

## Task 14: Trends Tab

**Files:**
- Create: `SleepViz/SleepViz/Views/Trends/TrendsView.swift`
- Create: `SleepViz/SleepViz/Views/Trends/ScoreTrendChart.swift`
- Create: `SleepViz/SleepViz/Views/Trends/DurationBarChart.swift`
- Create: `SleepViz/SleepViz/Views/Trends/BedtimeChart.swift`
- Create: `SleepViz/SleepViz/Views/Trends/StageAreaChart.swift`

**Step 1: Write ScoreTrendChart.swift**

Create `SleepViz/SleepViz/Views/Trends/ScoreTrendChart.swift`:

```swift
import SwiftUI
import Charts

struct ScoreTrendChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let score: Int
        let movingAvg: Double?
    }

    private var dataPoints: [DataPoint] {
        let sorted = sessions.sorted { $0.nightDate < $1.nightDate }
        return sorted.enumerated().map { index, session in
            let start = max(0, index - 6)
            let window = sorted[start...index]
            let avg = Double(window.map(\.score.overall).reduce(0, +)) / Double(window.count)
            return DataPoint(date: session.nightDate, score: session.score.overall, movingAvg: window.count >= 3 ? avg : nil)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SLEEP SCORE")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            Chart {
                ForEach(dataPoints) { point in
                    LineMark(
                        x: .value("Date", point.date),
                        y: .value("Score", point.score)
                    )
                    .foregroundStyle(.blue.opacity(0.5))
                    .interpolationMethod(.catmullRom)

                    if let avg = point.movingAvg {
                        LineMark(
                            x: .value("Date", point.date),
                            y: .value("7d Avg", avg)
                        )
                        .foregroundStyle(.blue)
                        .lineStyle(StrokeStyle(lineWidth: 2))
                        .interpolationMethod(.catmullRom)
                    }
                }
            }
            .chartXAxis(.hidden)
            .chartYScale(domain: 0...100)
            .frame(height: 180)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
```

**Step 2: Write DurationBarChart.swift**

Create `SleepViz/SleepViz/Views/Trends/DurationBarChart.swift`:

```swift
import SwiftUI
import Charts

struct DurationBarChart: View {
    let sessions: [SleepSession]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SLEEP DURATION")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            let sorted = sessions.sorted { $0.nightDate < $1.nightDate }
            Chart {
                ForEach(sorted, id: \.id) { session in
                    BarMark(
                        x: .value("Date", session.nightDate),
                        y: .value("Hours", session.stats.totalSleepTime / 60)
                    )
                    .foregroundStyle(.blue.opacity(0.7))
                }
                RuleMark(y: .value("Goal", 8))
                    .foregroundStyle(.green.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 5]))
            }
            .chartXAxis(.hidden)
            .chartYAxisLabel("Hours")
            .frame(height: 180)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
```

**Step 3: Write BedtimeChart.swift**

Create `SleepViz/SleepViz/Views/Trends/BedtimeChart.swift`:

```swift
import SwiftUI
import Charts

struct BedtimeChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let bedtime: Double
        let wake: Double
    }

    private var dataPoints: [DataPoint] {
        sessions.sorted { $0.nightDate < $1.nightDate }.map { session in
            DataPoint(
                date: session.nightDate,
                bedtime: bedtimeMinutes(session.startDate),
                wake: Double(minutesFromMidnight(session.endDate))
            )
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("BEDTIME & WAKE TIME")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            Chart {
                ForEach(dataPoints) { point in
                    PointMark(
                        x: .value("Date", point.date),
                        y: .value("Time", point.bedtime)
                    )
                    .foregroundStyle(.purple)
                    .symbolSize(30)

                    PointMark(
                        x: .value("Date", point.date),
                        y: .value("Time", point.wake)
                    )
                    .foregroundStyle(.yellow)
                    .symbolSize(30)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let mins = value.as(Double.self) {
                            Text(formatMinutesAsTime(mins))
                                .font(.caption2)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }
                }
            }
            .frame(height: 180)

            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Circle().fill(.purple).frame(width: 8, height: 8)
                    Text("Bedtime").font(.caption).foregroundStyle(AppTheme.textSecondary)
                }
                HStack(spacing: 4) {
                    Circle().fill(.yellow).frame(width: 8, height: 8)
                    Text("Wake").font(.caption).foregroundStyle(AppTheme.textSecondary)
                }
            }
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
```

**Step 4: Write StageAreaChart.swift**

Create `SleepViz/SleepViz/Views/Trends/StageAreaChart.swift`:

```swift
import SwiftUI
import Charts

struct StageAreaChart: View {
    let sessions: [SleepSession]

    private struct DataPoint: Identifiable {
        let id = UUID()
        let date: String
        let stage: String
        let percent: Double
        let color: Color
    }

    private var dataPoints: [DataPoint] {
        sessions.sorted { $0.nightDate < $1.nightDate }.flatMap { session -> [DataPoint] in
            [
                DataPoint(date: session.nightDate, stage: "Deep", percent: session.stats.deepPercent, color: StageColor.deep),
                DataPoint(date: session.nightDate, stage: "Core", percent: session.stats.corePercent, color: StageColor.core),
                DataPoint(date: session.nightDate, stage: "REM", percent: session.stats.remPercent, color: StageColor.rem),
                DataPoint(date: session.nightDate, stage: "Awake", percent: session.stats.awakePercent, color: StageColor.awake),
            ]
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("STAGE COMPOSITION")
                .font(.caption.bold())
                .foregroundStyle(AppTheme.textTertiary)

            Chart(dataPoints) { point in
                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Percent", point.percent),
                    stacking: .standard
                )
                .foregroundStyle(by: .value("Stage", point.stage))
            }
            .chartForegroundStyleScale([
                "Deep": StageColor.deep,
                "Core": StageColor.core,
                "REM": StageColor.rem,
                "Awake": StageColor.awake,
            ])
            .chartXAxis(.hidden)
            .frame(height: 180)
        }
        .padding()
        .background(AppTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}
```

**Step 5: Write TrendsView.swift**

Create `SleepViz/SleepViz/Views/Trends/TrendsView.swift`:

```swift
import SwiftUI
import SwiftData

struct TrendsView: View {
    @Query(sort: \SleepSession.nightDate, order: .reverse) private var allSessions: [SleepSession]
    @State private var period: TimePeriod = .month

    private var filteredSessions: [SleepSession] {
        let cutoff = Calendar.current.date(byAdding: .day, value: -period.days, to: Date())!
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let cutoffString = formatter.string(from: cutoff)
        return allSessions.filter { $0.nightDate >= cutoffString }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PeriodSelector(selection: $period)
                        .padding(.horizontal)

                    if filteredSessions.isEmpty {
                        Text("No data for this period")
                            .foregroundStyle(AppTheme.textSecondary)
                            .padding(.top, 60)
                    } else {
                        ScoreTrendChart(sessions: filteredSessions)
                        DurationBarChart(sessions: filteredSessions)
                        BedtimeChart(sessions: filteredSessions)
                        StageAreaChart(sessions: filteredSessions)
                    }
                }
                .padding()
            }
            .background(AppTheme.background)
            .navigationTitle("Trends")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
```

**Step 6: Commit**

```bash
git add SleepViz/SleepViz/Views/Trends/
git commit -m "feat: add Trends tab with score, duration, bedtime, and stage charts"
```

---

## Task 15: Settings Tab

**Files:**
- Create: `SleepViz/SleepViz/Views/Settings/SettingsView.swift`

**Step 1: Write SettingsView.swift**

Create `SleepViz/SleepViz/Views/Settings/SettingsView.swift`:

```swift
import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(SyncManager.self) private var syncManager
    @Environment(\.modelContext) private var modelContext
    @State private var showClearConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                Section("Health Data") {
                    HStack {
                        Label("HealthKit", systemImage: "heart.fill")
                        Spacer()
                        if HealthKitService.shared.isAvailable {
                            Text("Connected")
                                .foregroundStyle(.green)
                        } else {
                            Text("Not Available")
                                .foregroundStyle(.red)
                        }
                    }

                    HStack {
                        Label("Last Sync", systemImage: "arrow.clockwise")
                        Spacer()
                        if let date = syncManager.lastSyncDate {
                            Text(date, style: .relative)
                                .foregroundStyle(AppTheme.textSecondary)
                        } else {
                            Text("Never")
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                    }

                    Button {
                        Task {
                            await syncManager.sync(modelContext: modelContext)
                        }
                    } label: {
                        Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .disabled(syncManager.isSyncing)
                }

                Section("Scoring") {
                    NavigationLink {
                        scoringInfoView
                    } label: {
                        Label("How Scoring Works", systemImage: "info.circle")
                    }
                }

                Section("Data") {
                    Button(role: .destructive) {
                        showClearConfirmation = true
                    } label: {
                        Label("Clear Cached Data", systemImage: "trash")
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .confirmationDialog("Clear all cached sleep data?", isPresented: $showClearConfirmation) {
                Button("Clear Data", role: .destructive) {
                    clearAllData()
                }
            } message: {
                Text("This removes cached scores and sessions. Data can be re-synced from HealthKit.")
            }
        }
    }

    private var scoringInfoView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Sleep Score")
                    .font(.title2.bold())
                Text("Your sleep score (0-100) is computed from six weighted sub-scores:")
                    .foregroundStyle(AppTheme.textSecondary)

                ForEach([
                    ("Duration (25%)", "7-9 hours is ideal"),
                    ("Efficiency (20%)", "90%+ time asleep vs in bed"),
                    ("Deep Sleep (20%)", "15-25% of total sleep"),
                    ("REM Sleep (15%)", "20-30% of total sleep"),
                    ("Latency (10%)", "15 minutes or less to fall asleep"),
                    ("WASO (10%)", "10 minutes or less awake after falling asleep"),
                ], id: \.0) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.0).font(.subheadline.bold())
                        Text(item.1).font(.caption).foregroundStyle(AppTheme.textSecondary)
                    }
                }

                Divider().padding(.vertical)

                Text("Readiness Score")
                    .font(.title2.bold())
                Text("Your readiness score (0-100) measures recovery based on:")
                    .foregroundStyle(AppTheme.textSecondary)

                ForEach([
                    ("HRV (50%)", "Heart rate variability vs your 7-day baseline"),
                    ("Resting HR (30%)", "Resting heart rate vs your 7-day baseline"),
                    ("Sleep Score (20%)", "Last night's sleep quality"),
                ], id: \.0) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.0).font(.subheadline.bold())
                        Text(item.1).font(.caption).foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .padding()
        }
        .background(AppTheme.background)
        .navigationTitle("Scoring Info")
    }

    private func clearAllData() {
        try? modelContext.delete(model: SleepSession.self)
        try? modelContext.delete(model: ReadinessRecord.self)
        try? modelContext.save()
    }
}
```

**Step 2: Commit**

```bash
git add SleepViz/SleepViz/Views/Settings/
git commit -m "feat: add Settings tab with HealthKit status, sync, and scoring info"
```

---

## Task 16: Build, Test, and Polish

**Step 1: Build the project**

Run: `xcodebuild build -project SleepViz.xcodeproj -scheme SleepViz -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: Build succeeds with 0 errors

Fix any compilation errors that arise.

**Step 2: Run tests**

Run: `xcodebuild test -project SleepViz.xcodeproj -scheme SleepViz -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: All SleepScoringTests and SessionBuilderTests pass

**Step 3: Run on Simulator**

Open project in Xcode, select iPhone 16 simulator, press Cmd+R.
Verify:
- App launches to Today tab
- HealthKit permission dialog appears
- All 5 tabs are accessible
- Empty states display correctly (no data yet on simulator)

**Step 4: Test with Health sample data (Simulator)**

In the iOS Simulator:
1. Open the Health app
2. Add manual sleep data (Browse > Sleep)
3. Switch back to SleepViz
4. Pull-to-refresh on Today tab
5. Verify score ring appears with computed score

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete SleepViz iOS app — build verified on simulator"
```

---

## Task 17: Final Commit + Push

**Step 1: Verify all tests pass one final time**

Run: `xcodebuild test -project SleepViz.xcodeproj -scheme SleepViz -destination 'platform=iOS Simulator,name=iPhone 16'`

**Step 2: Push to GitHub**

```bash
git push origin main
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Xcode project scaffold + entitlements |
| 2 | Constants, date utils, formatters (port from TS) |
| 3 | SwiftData models (SleepSession, ReadinessRecord) |
| 4 | Sleep scoring engine + tests (port from TS) |
| 5 | Session builder + statistics + tests (port from TS) |
| 6 | Readiness scoring engine |
| 7 | HealthKit service |
| 8 | Sync manager (orchestrator) |
| 9 | App entry point + tab view |
| 10 | Reusable components (ScoreRing, StatCard, etc.) |
| 11 | Today tab |
| 12 | Sleep detail tab (hypnogram, biometrics) |
| 13 | Readiness tab |
| 14 | Trends tab |
| 15 | Settings tab |
| 16 | Build, test, and polish |
| 17 | Final commit + push |
