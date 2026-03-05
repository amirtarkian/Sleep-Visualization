# Oura-Like Features Design

**Date:** 2026-03-05
**Scope:** Both PWA (sleep-viz) and iOS (Amir-SleepApp)
**Approach:** Build features in both apps simultaneously, keeping algorithms in sync

## Feature 1: Readiness Score on PWA

Port the iOS `ReadinessEngine` to TypeScript for the PWA.

**Algorithm:**
- 14-day rolling baseline for HRV and resting HR
- Compare last night's values to baseline
- Composite: HRV comparison (40%) + Resting HR comparison (30%) + Sleep Score (30%)
- Score 0-100, same labels as sleep score

**UI:**
- Second ScoreRing on dashboard next to sleep score
- Dedicated Readiness section with HRV trend, resting HR trend, sub-score breakdown

**Data:** HRV and resting HR already extracted by the PWA parser from Apple Health exports.

## Feature 2: Daily Coaching Tips

Rule-based engine generating actionable tips from last night's sleep and recent trends.

**Rules:**
- Deep sleep < 15% for 3+ nights → room temperature advice
- Sleep efficiency < 85% → go to bed only when sleepy
- Bedtime variance > 1 hour over the week → consistency advice
- Sleep latency > 30 min → wind-down routine suggestion
- Sleep score trending down over 7 days → check recent changes
- Sleep score 90+ → positive reinforcement

**UI:**
- "Tips" card on dashboard showing 1-2 most relevant daily tips
- Tips rotate daily, prioritized by severity

**Both apps:** Same rule definitions, rendered natively.

## Feature 3: Weekly/Monthly Reports

**Weekly report (generated every Monday, viewable anytime):**
- Average sleep score, readiness score, duration
- Best and worst nights
- Stage distribution summary (avg % deep, REM, core)
- Trend direction (improving/declining/stable) per metric
- Pattern insights (weekend vs weekday, bedtime correlation)
- 1-2 key recommendations

**Monthly report:** Same structure over 30 days, with week-over-week comparisons.

**UI:** "Reports" tab/section with scrollable report cards. Generated client-side.

## Feature 4: Sleep Goals & Tracking

**Goal types:**
- Duration goal: target hours/night (default 8h)
- Bedtime goal: target window (e.g., 10:30-11:00 PM)
- Score goal: target minimum sleep score (e.g., 75+)

**Streak tracking:**
- Consecutive nights meeting each goal
- Current streak and personal best
- Visual streak calendar (green/red dots per night)

**Optimal bedtime recommendation:**
- Analyze last 30 days
- Find bedtime range correlating with highest sleep scores
- Display as "Your optimal bedtime window: X - Y"

**UI:**
- Goals section in settings for configuration
- Dashboard shows streak counts
- Dedicated Goals view with streak calendar and optimal bedtime

**Storage:** IndexedDB (PWA) / SwiftData (iOS). No server needed.

## Architecture Notes

- All scoring/analysis algorithms implemented in TypeScript (PWA) and Swift (iOS) with identical logic
- No backend required — all computation client-side
- Tips and reports generated on-demand from stored sleep session data
- Goals persisted locally alongside sleep data
