# SleepViz iOS App — Design Document

## Overview

A native iOS app (SwiftUI) that automatically pulls sleep and biometric data from Apple HealthKit, computes composite sleep scores (0-100) and readiness scores, and displays them with an Oura-inspired dark UI. No manual data export required — the app reads directly from HealthKit.

**Target:** iOS 17+
**Language:** Swift 5.9+
**Frameworks:** SwiftUI, HealthKit, SwiftData, Swift Charts, BackgroundTasks
**Dependencies:** None (all Apple first-party)

## Architecture

```
HealthKit (source of truth)
    |
HealthKitService (queries sleep stages, HR, HRV, SpO2, resp rate, resting HR)
    |
SleepScoringEngine / ReadinessEngine (compute scores)
    |
SwiftData (caches SleepSession + ReadinessScore models)
    |
SwiftUI Views (reactive via @Query)
```

### Data Flow

1. **First launch:** Request HealthKit permissions, pull last 90 days of sleep data, compute scores, cache in SwiftData
2. **Subsequent launches:** Pull only new data since last sync, compute scores for new nights, merge into cache
3. **Background refresh:** `BGAppRefreshTask` triggers HealthKit query + scoring overnight, so the score is ready when the user opens the app in the morning
4. **UI reads from SwiftData** using `@Query` — reactive, automatic updates

## Tab Structure

| Tab | Purpose |
|-----|---------|
| **Today** | Last night's sleep score ring, key metrics, sub-score breakdown |
| **Sleep** | Night detail with hypnogram, biometrics, swipeable between nights |
| **Readiness** | HRV-based readiness score, contributing factors, HRV/HR trends |
| **Trends** | Score, duration, bedtime, stage composition, efficiency charts |
| **Settings** | HealthKit connection, background refresh, about |

## UI Design

### Theme
- Dark mode only (Oura aesthetic)
- Background: near-black (#0D0D0D)
- Cards: dark gray (#1A1A1A) with subtle border
- Score ring: gradient based on score color
- Stage colors: Deep (#1e40af), Core (#60a5fa), REM (#a78bfa), Awake (#ef4444)
- Score colors: Excellent/green (#22c55e), Good/blue (#3b82f6), Fair/yellow (#eab308), Poor/orange (#f97316), Very Poor/red (#ef4444)

### Today Tab
- Large animated score ring (center, dominant) with score number inside
- Score label ("Excellent", "Good", etc.)
- "Last Night" card: bedtime, wake time, total sleep duration
- 6 sub-score horizontal bars (Duration, Efficiency, Deep, REM, Latency, WASO)
- Quick insight: one-line summary comparing to personal averages
- Pull-to-refresh to re-sync from HealthKit

### Sleep Tab
- Date picker at top (swipeable left/right between nights)
- Hypnogram: custom Canvas drawing, Awake/REM/Core/Deep as colored step chart
- Heart rate overlay toggle
- Stage distribution: horizontal stacked bar or donut
- Biometrics cards: HR (min/avg/max), HRV (avg), SpO2 (avg), Respiratory Rate
- Score breakdown: sub-score bars for selected night

### Readiness Tab
- Readiness score ring (0-100, warm amber/gold color)
- Contributing factors: HRV vs baseline, resting HR vs baseline, sleep score
- HRV 30-day trend chart
- Resting HR 30-day trend chart
- Insight card: contextual summary

### Trends Tab
- Period selector: 7d / 30d / 90d segmented control
- Score trend: line chart with 7-day moving average
- Duration bars: daily bars with 8hr goal line
- Bedtime consistency: scatter plot or range bars
- Stage composition: stacked area chart
- Efficiency trend: line chart

### Settings Tab
- HealthKit connection status and re-authorization
- Background refresh toggle
- Scoring algorithm info
- About / version
- Clear cached data

## Data Models

### SleepSession (SwiftData)

```
id: UUID
nightDate: String              // "2024-01-15"
startDate: Date                // actual bedtime
endDate: Date                  // actual wake time
stages: [SleepStage]           // (stage, startDate, endDate) encoded as JSON
score: SleepScore              // composite + 6 sub-scores
stats: SleepStats              // duration, efficiency, latency, WASO, stage percentages
biometrics: SessionBiometrics  // HR, HRV, SpO2, resp rate summaries
isFallback: Bool               // true if no stage data
lastSyncedAt: Date
```

### ReadinessScore (SwiftData)

```
id: UUID
date: String                   // "2024-01-15"
score: Int                     // 0-100
hrvBaseline: Double            // 7-day rolling avg HRV
hrvCurrent: Double             // last night's avg HRV
restingHRBaseline: Double
restingHRCurrent: Double
sleepScoreContribution: Int
lastSyncedAt: Date
```

## Sleep Scoring Algorithm

Direct port from the existing PWA (`sleepScore.ts`). Six weighted sub-scores:

| Sub-Score | Weight | Ideal Range |
|-----------|--------|-------------|
| Duration | 25% | 7-9 hours |
| Efficiency | 20% | >= 90% |
| Deep Sleep | 20% | 15-25% of TST |
| REM Sleep | 15% | 20-30% of TST |
| Latency | 10% | <= 15 minutes |
| WASO | 10% | <= 10 minutes |

**Fallback mode** (no stage data): Duration 35%, Efficiency 30%, Latency 15%, WASO 20%.

**Score labels:** Excellent (90+), Good (75-89), Fair (60-74), Poor (40-59), Very Poor (0-39).

## Readiness Scoring Algorithm (New)

- **HRV component (50%):** Comparison of last-night HRV to 7-day rolling baseline. At baseline = 70 points, >15% above = 100, >15% below = 40.
- **Resting HR component (30%):** Comparison to 7-day baseline. At baseline = 80 points, lower is better, >5bpm above = 40.
- **Sleep score component (20%):** Last night's sleep score (0-100) passed through directly.

## HealthKit Data Types

| HealthKit Type | Used For |
|---------------|----------|
| `HKCategoryType.sleepAnalysis` | Sleep stages (InBed, Core, Deep, REM, Awake) |
| `HKQuantityType.heartRate` | HR during sleep window |
| `HKQuantityType.heartRateVariabilitySDNN` | Nightly HRV |
| `HKQuantityType.oxygenSaturation` | SpO2 |
| `HKQuantityType.respiratoryRate` | Breathing rate |
| `HKQuantityType.restingHeartRate` | Daily resting HR |

## Session Grouping

Port from `sleepSessions.ts`:
- Sort sleep analysis samples by start date
- Merge intervals with gaps < 3 hours into single sessions
- Assign night date: sleep ending before 6 AM belongs to previous day
- Source priority deduplication: Apple Watch > iPhone > third-party

## Project Structure

```
SleepViz/
├── SleepVizApp.swift
├── Info.plist
├── Models/
│   ├── SleepSession.swift
│   ├── ReadinessScore.swift
│   ├── SleepStage.swift
│   └── Biometrics.swift
├── Services/
│   ├── HealthKitService.swift
│   ├── SleepScoringEngine.swift
│   ├── ReadinessEngine.swift
│   ├── SessionBuilder.swift
│   └── SyncManager.swift
├── Views/
│   ├── MainTabView.swift
│   ├── Today/
│   │   ├── TodayView.swift
│   │   ├── ScoreRingView.swift
│   │   └── SubScoreBars.swift
│   ├── Sleep/
│   │   ├── SleepDetailView.swift
│   │   ├── HypnogramView.swift
│   │   ├── StageDonutChart.swift
│   │   ├── BiometricsCards.swift
│   │   └── NightPicker.swift
│   ├── Readiness/
│   │   ├── ReadinessView.swift
│   │   ├── HRVTrendChart.swift
│   │   └── RestingHRChart.swift
│   ├── Trends/
│   │   ├── TrendsView.swift
│   │   ├── ScoreTrendChart.swift
│   │   ├── DurationBarChart.swift
│   │   ├── BedtimeChart.swift
│   │   └── StageAreaChart.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── Components/
│       ├── ScoreRing.swift
│       ├── StatCard.swift
│       ├── PeriodSelector.swift
│       └── ScoreBadge.swift
├── Utilities/
│   ├── DateUtils.swift
│   ├── Constants.swift
│   └── Formatters.swift
└── Tests/
    ├── SleepScoringTests.swift
    └── SessionBuilderTests.swift
```

## What Gets Ported vs. New

| Component | Source |
|-----------|--------|
| Sleep scoring algorithm | Direct port from `sleepScore.ts` |
| Session grouping (3hr gap merge) | Direct port from `sleepSessions.ts` |
| Statistics computation | Direct port from `statistics.ts` |
| Night date resolution (6AM cutoff) | Direct port from `dateUtils.ts` |
| Constants (weights, thresholds, colors) | Direct port from `constants.ts` |
| Readiness score | New |
| HealthKit integration | New |
| Background sync | New |
| All SwiftUI views | New (inspired by PWA but native) |

## Technical Notes

- **iOS 17+ minimum** for SwiftData and modern Swift Charts
- **No third-party dependencies** — all Apple frameworks
- **Dark mode only** in v1
- **Score ring animation:** SwiftUI `.trim` animation on `Circle` shape with `withAnimation`
- **Hypnogram:** SwiftUI `Canvas` view with colored rectangles for each stage, pan gesture for long nights
- **Circular mean** for average bedtime/wake (port from `dateUtils.ts`)
- **Background refresh:** `BGAppRefreshTask` registered for daily overnight sync
- **Graceful degradation:** If HealthKit permission denied for specific types, show "Not Available" for those metrics
