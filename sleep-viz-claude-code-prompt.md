# Claude Code Prompt: Apple Health Sleep Visualization & Scoring Tool

## Overview

Build a complete, polished sleep visualization and analytics tool as a **single-page React web app** (Vite + React + Tailwind) that:

1. Imports Apple Health export data (XML)
2. Parses all sleep-related records
3. Computes a **composite sleep score (0–100)** using the algorithm defined below (modeled after Pillow and Oura Ring scoring)
4. Displays rich visualizations: nightly hypnogram, trends over time, stage breakdowns, and detailed statistics
5. Runs entirely client-side (no backend needed) — all parsing and scoring happens in the browser

---

## Part 1: Apple Health Sleep Data — What to Parse

### Export Format

Apple Health exports as `export.xml`. The relevant record types are:

```xml
<Record type="HKCategoryTypeIdentifierSleepAnalysis"
        sourceName="Apple Watch" sourceVersion="10.0"
        startDate="2024-12-01 23:15:00 -0600"
        endDate="2024-12-02 00:45:00 -0600"
        value="HKCategoryValueSleepAnalysisAsleepDeep"
        creationDate="2024-12-02 07:00:00 -0600"/>
```

### Sleep Stage Values (iOS 16+ / watchOS 9+)

Parse ALL of these `value` attributes:

| Value | Meaning | Category |
|---|---|---|
| `HKCategoryValueSleepAnalysisInBed` | In bed but not necessarily asleep | In Bed |
| `HKCategoryValueSleepAnalysisAsleepUnspecified` | Asleep (no stage detail, older devices) | Asleep |
| `HKCategoryValueSleepAnalysisAwake` | Awake during sleep session | Awake |
| `HKCategoryValueSleepAnalysisAsleepCore` | Core / Light sleep (N1 + N2) | Core Sleep |
| `HKCategoryValueSleepAnalysisAsleepDeep` | Deep sleep (N3 / Slow-Wave) | Deep Sleep |
| `HKCategoryValueSleepAnalysisAsleepREM` | REM sleep | REM Sleep |

### Additional Records to Parse (if present)

Also extract these from the XML for enriched stats:

| Record Type | Use |
|---|---|
| `HKQuantityTypeIdentifierHeartRate` | Resting/sleeping heart rate overlay |
| `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | HRV during sleep |
| `HKQuantityTypeIdentifierRespiratoryRate` | Breathing rate during sleep |
| `HKQuantityTypeIdentifierOxygenSaturation` | SpO2 during sleep |
| `HKQuantityTypeIdentifierBodyTemperature` | Wrist temperature deviation |

For heart rate, HRV, respiratory rate, and SpO2: filter records that fall within sleep session time windows and associate them with the corresponding night.

### Grouping Into Sleep Sessions (Nights)

A single "night" of sleep can consist of **many overlapping or sequential records** from multiple sources (iPhone, Apple Watch, third-party apps).

**Algorithm for grouping:**
1. Collect all SleepAnalysis records
2. Sort by `startDate`
3. Group records into sessions where gaps between consecutive records are **< 3 hours** (to handle brief awakenings or bathroom breaks)
4. Assign each session a "night date" — use the **calendar date of the bedtime** if before 6 AM use the previous day's date (e.g., going to bed at 11:30 PM on Dec 1 → "Night of Dec 1"; going to bed at 1 AM on Dec 2 → still "Night of Dec 1")
5. **Source priority:** If multiple sources report sleep for the same window, prefer Apple Watch > iPhone > third-party apps. Deduplicate overlapping intervals.

---

## Part 2: Sleep Score Algorithm (0–100)

This is modeled after the scoring methodologies from **Pillow**, **Oura Ring**, and **AutoSleep**. These apps use a weighted composite of several sub-scores. Each sub-score is computed independently on a 0–100 scale, then combined with weights.

### Component Weights

| Component | Weight | What It Measures |
|---|---|---|
| **Total Sleep Duration** | 25% | Did you get enough sleep? |
| **Sleep Efficiency** | 20% | % of time in bed spent actually asleep |
| **Deep Sleep** | 20% | Adequate deep/slow-wave sleep |
| **REM Sleep** | 15% | Adequate REM sleep |
| **Sleep Latency** | 10% | How quickly you fell asleep |
| **Wake After Sleep Onset (WASO)** | 10% | How disrupted your sleep was |

### Sub-Score Calculations

#### 1. Total Sleep Duration Score (25%)

Based on adult sleep need of 7–9 hours (per AASM / Sleep Foundation guidelines):

```
if total_sleep_hours >= 7.0 and total_sleep_hours <= 9.0:
    score = 100
elif total_sleep_hours >= 6.0 and total_sleep_hours < 7.0:
    score = 60 + (total_sleep_hours - 6.0) * 40  # linear 60→100
elif total_sleep_hours >= 9.0 and total_sleep_hours <= 9.5:
    score = 100 - (total_sleep_hours - 9.0) * 40  # slight penalty for oversleep
elif total_sleep_hours >= 5.0 and total_sleep_hours < 6.0:
    score = 20 + (total_sleep_hours - 5.0) * 40  # linear 20→60
elif total_sleep_hours > 9.5:
    score = max(50, 80 - (total_sleep_hours - 9.5) * 30)
else:  # < 5 hours
    score = max(0, total_sleep_hours / 5.0 * 20)
```

#### 2. Sleep Efficiency Score (20%)

Sleep Efficiency = (Total Sleep Time / Total Time In Bed) × 100

```
if efficiency >= 90:
    score = 100
elif efficiency >= 85:
    score = 75 + (efficiency - 85) * 5  # 75→100
elif efficiency >= 75:
    score = 40 + (efficiency - 75) * 3.5  # 40→75
else:
    score = max(0, efficiency * 0.53)  # linear degradation
```

Normal: 85–90%+. Pillow flags anything below 85% as suboptimal.

#### 3. Deep Sleep Score (20%)

Target: 15–20% of total sleep time (adults). Decreases naturally with age.

```
deep_pct = deep_sleep_minutes / total_sleep_minutes * 100

if deep_pct >= 15 and deep_pct <= 25:
    score = 100
elif deep_pct >= 10 and deep_pct < 15:
    score = 60 + (deep_pct - 10) * 8  # 60→100
elif deep_pct > 25 and deep_pct <= 30:
    score = 100 - (deep_pct - 25) * 4  # slight penalty
elif deep_pct >= 5 and deep_pct < 10:
    score = 20 + (deep_pct - 5) * 8  # 20→60
else:
    score = max(0, deep_pct * 4)
```

#### 4. REM Sleep Score (15%)

Target: 20–25% of total sleep time.

```
rem_pct = rem_sleep_minutes / total_sleep_minutes * 100

if rem_pct >= 20 and rem_pct <= 30:
    score = 100
elif rem_pct >= 15 and rem_pct < 20:
    score = 60 + (rem_pct - 15) * 8
elif rem_pct > 30 and rem_pct <= 35:
    score = 100 - (rem_pct - 30) * 4
elif rem_pct >= 10 and rem_pct < 15:
    score = 20 + (rem_pct - 10) * 8
else:
    score = max(0, rem_pct * 2)
```

#### 5. Sleep Latency Score (10%)

Sleep Latency = time from "In Bed" to first "Asleep" stage.

```
if latency_minutes <= 15:
    score = 100
elif latency_minutes <= 20:
    score = 80 + (20 - latency_minutes) * 4  # 80→100
elif latency_minutes <= 30:
    score = 60 + (30 - latency_minutes) * 2  # 60→80
elif latency_minutes <= 45:
    score = 30 + (45 - latency_minutes) * 2  # 30→60
elif latency_minutes <= 60:
    score = max(0, 30 - (latency_minutes - 45) * 2)
else:
    score = 0
```

Normal: 10–20 minutes. <5 min may indicate sleep deprivation. >30 min may indicate insomnia.

#### 6. WASO Score (Wake After Sleep Onset) (10%)

WASO = total minutes awake between first falling asleep and final awakening.

```
if waso_minutes <= 10:
    score = 100
elif waso_minutes <= 20:
    score = 80 + (20 - waso_minutes) * 2
elif waso_minutes <= 30:
    score = 60 + (30 - waso_minutes) * 2
elif waso_minutes <= 45:
    score = 30 + (45 - waso_minutes) * 2
elif waso_minutes <= 60:
    score = max(0, 30 - (waso_minutes - 45) * 2)
else:
    score = 0
```

### Final Score

```
sleep_score = round(
    duration_score * 0.25 +
    efficiency_score * 0.20 +
    deep_score * 0.20 +
    rem_score * 0.15 +
    latency_score * 0.10 +
    waso_score * 0.10
)
```

### Score Interpretation Labels

| Range | Label | Color |
|---|---|---|
| 90–100 | Excellent | Green (#22c55e) |
| 75–89 | Good | Blue (#3b82f6) |
| 60–74 | Fair | Yellow (#eab308) |
| 40–59 | Poor | Orange (#f97316) |
| 0–39 | Very Poor | Red (#ef4444) |

### Fallback: No Stage Data

If only `AsleepUnspecified` or `InBed`/`Asleep` data is available (no stage breakdown), compute the score using only Duration (35%), Efficiency (30%), Latency (15%), and WASO (20%) — redistributing the Deep and REM weights.

---

## Part 3: Statistics to Compute & Display

### Per-Night Statistics

Compute and display all of the following for each night:

| Statistic | Definition |
|---|---|
| **Bedtime** | Start of first InBed record |
| **Wake Time** | End of last sleep record |
| **Time In Bed** | Total duration from bedtime to wake time |
| **Total Sleep Time (TST)** | Sum of all Asleep stages (Core + Deep + REM + Unspecified) |
| **Sleep Efficiency** | TST / Time In Bed × 100 |
| **Sleep Latency** | Bedtime to first Asleep record |
| **WASO** | Total awake time between first sleep onset and final wake |
| **Number of Awakenings** | Count of distinct Awake segments |
| **Core/Light Sleep** | Duration and % of TST |
| **Deep Sleep** | Duration and % of TST |
| **REM Sleep** | Duration and % of TST |
| **Awake Time** | Duration during sleep window |
| **Sleep Score** | Composite 0–100 score |
| **Sleep Midpoint** | Midpoint between sleep onset and wake time |
| **Avg Heart Rate** | Mean HR during sleep window (if available) |
| **Min Heart Rate** | Lowest HR during sleep (if available) |
| **HRV (SDNN)** | Average HRV during sleep (if available) |
| **Respiratory Rate** | Avg breaths/min during sleep (if available) |
| **SpO2** | Blood oxygen during sleep (if available) |

### Trend / Aggregate Statistics (shown on dashboard)

| Statistic | Definition |
|---|---|
| **7-day / 30-day Average Sleep Score** | Rolling mean |
| **Average Bedtime** | Mean bedtime over selected period |
| **Average Wake Time** | Mean wake time over selected period |
| **Average TST** | Mean total sleep time |
| **Average Sleep Efficiency** | Mean efficiency |
| **Sleep Regularity Index (SRI)** | Standard deviation of bedtime and wake time — lower is more consistent |
| **Best / Worst Night** | Highest and lowest scoring nights in period |
| **Deep Sleep Trend** | Is deep sleep % increasing or decreasing? |
| **REM Sleep Trend** | Is REM % increasing or decreasing? |
| **Sleep Debt** | Cumulative deficit vs 8hr target over trailing 7 days |
| **Stage Distribution** | Average % breakdown across Core/Deep/REM/Awake |

---

## Part 4: UI Design & Visualizations

### Design Language

Use a **dark theme** inspired by Pillow, Oura, and Apple Health's sleep UI:
- Background: deep navy/dark slate (`#0f172a` → `#1e293b`)
- Cards: slightly lighter (`#1e293b` with subtle border)
- Text: white/gray (`#f8fafc`, `#94a3b8`)
- Accent colors: Soft purple for sleep (`#a78bfa`), blue for Core (`#60a5fa`), indigo for Deep (`#6366f1`), teal/pink for REM (`#f472b6`), orange/yellow for Awake (`#fbbf24`)
- Smooth rounded corners, subtle shadows, glass-morphism cards
- Use Inter or system font stack
- Smooth transitions and animations

### Page Layout

**Single-page app with these sections:**

#### 1. Import Section (top)
- Drag-and-drop zone for `export.xml` or `export.zip`
- Parse progress indicator (Apple Health exports can be 500MB+)
- Use **streaming XML parsing** — do NOT load the entire file into memory. Use a SAX-style parser or `XMLReader` approach. Consider using the `fast-xml-parser` npm package or a Web Worker + streaming approach.
- Show record count as parsing progresses

#### 2. Dashboard / Overview (after import)
- **Large sleep score ring** (animated, like Oura) for last night with label
- **Score trend sparkline** for last 14 days
- **Quick stats cards**: Avg sleep time, avg efficiency, avg bedtime, sleep debt
- **Date range selector** (last 7 days, 30 days, 90 days, all time)

#### 3. Nightly Detail View (click any night)
- **Hypnogram**: horizontal timeline chart showing sleep stages over the night
  - Y-axis: Awake → REM → Core → Deep (top to bottom, following clinical convention)
  - X-axis: time of night
  - Color-coded bands for each stage
  - This is the signature visualization — make it look great
- **Stage pie/donut chart**: breakdown of Core, Deep, REM, Awake
- **Stats panel**: all per-night statistics in a clean grid
- **Heart rate overlay** on the hypnogram (if HR data available) — secondary y-axis showing HR as a line
- **Score breakdown**: show each sub-score component with its contribution to the total

#### 4. Trends View
- **Sleep score over time**: line chart with 7-day moving average
- **Sleep duration bar chart**: nightly TST with 8hr goal line
- **Bedtime/wake time scatter**: consistency visualization
- **Stage stacked area chart**: Core/Deep/REM proportions over time
- **Sleep efficiency trend line**
- **Heart rate trend** (if available): avg sleeping HR over time

#### 5. Sleep Stage Distribution
- **Weekly summary cards** showing avg stage breakdown
- **Comparison to recommended ranges** (visual indicators)

### Chart Library

Use **Recharts** (already available in the React artifact environment). For the hypnogram specifically, you may need a custom SVG component since it's a specialized step chart.

### Responsive Design

- Desktop: multi-column dashboard layout
- Tablet: 2-column
- Mobile: single column, swipeable cards

---

## Part 5: Technical Implementation

### Project Setup

```bash
npm create vite@latest sleep-viz -- --template react
cd sleep-viz
npm install recharts date-fns fast-xml-parser lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

### File Structure

```
src/
├── App.jsx                    # Main app with routing/state
├── index.css                  # Tailwind + custom dark theme
├── components/
│   ├── FileImport.jsx         # Drag-and-drop XML import
│   ├── Dashboard.jsx          # Overview with score ring + stats
│   ├── NightDetail.jsx        # Single night deep dive
│   ├── Hypnogram.jsx          # Custom SVG sleep stage timeline
│   ├── ScoreRing.jsx          # Animated circular score display
│   ├── TrendsView.jsx         # Multi-chart trend analysis
│   ├── StatsCard.jsx          # Reusable stat display card
│   ├── StagePieChart.jsx      # Donut chart for stage breakdown
│   └── DateRangeSelector.jsx  # Period filter
├── lib/
│   ├── parseHealthExport.js   # XML parsing with Web Worker
│   ├── sleepSessions.js       # Group records into nights
│   ├── sleepScore.js          # Score computation engine
│   ├── statistics.js          # All stats calculations
│   └── utils.js               # Date helpers, formatters
└── workers/
    └── xmlParserWorker.js     # Web Worker for parsing large XML
```

### Critical Implementation Notes

1. **XML Parsing Performance**: Apple Health exports are HUGE. Use `fast-xml-parser` with streaming, or implement SAX parsing in a Web Worker. Show progress to the user. Consider parsing only `HKCategoryTypeIdentifierSleepAnalysis` and the biometric types listed above — skip everything else for performance.

2. **Deduplication**: Multiple sources often report overlapping sleep data. Implement interval merging — prefer Apple Watch data, then merge/deduplicate overlapping segments.

3. **Timezone Handling**: Apple Health exports timestamps with timezone offsets. Parse and handle these correctly using `date-fns` or native Date parsing. All display times should be in the user's local timezone.

4. **Score Display**: The sleep score ring should animate from 0 to the final value on load (like Oura). Use CSS transitions or requestAnimationFrame.

5. **Empty/Partial Data**: Gracefully handle nights with no stage data (only InBed/Asleep), nights with missing HR data, etc. Show "Stage data not available" where appropriate and use the fallback scoring algorithm.

6. **Export/Share**: Add a button to export a night's summary or overall stats as a shareable image (optional but nice).

---

## Part 6: Sample Data for Development

Include a "Load Sample Data" button that generates 30 nights of realistic synthetic sleep data for testing and demo purposes. The synthetic data should:

- Vary bedtime between 10 PM – 12:30 AM
- Vary wake time between 5:30 AM – 8:00 AM
- Include realistic stage proportions (Core ~50%, Deep ~15-20%, REM ~20-25%, Awake ~5-10%)
- Include some "bad" nights (short sleep, high WASO, low deep sleep)
- Include realistic heart rate data (45–65 bpm range during sleep)
- Follow realistic sleep architecture (deep sleep concentrated in first half of night, REM in second half)

---

## Summary of Requirements

- [ ] Parse Apple Health XML export (streaming, performant)
- [ ] Extract all 6 sleep stage types + biometric data
- [ ] Group records into nightly sleep sessions
- [ ] Compute composite sleep score using the weighted algorithm above
- [ ] Show dashboard with score ring, sparklines, quick stats
- [ ] Hypnogram visualization for each night (the signature chart)
- [ ] Stage breakdown donut charts
- [ ] Trend charts (score, duration, stages, bedtime consistency)
- [ ] All per-night and aggregate statistics listed in Part 3
- [ ] Dark theme with sleep-app-quality design
- [ ] Sample data generator for testing
- [ ] Responsive layout
- [ ] Handle edge cases (no stage data, missing biometrics, overlapping sources)

Build this as a complete, polished, production-quality application. Every visualization should be clean, every number should be accurate, and the overall experience should rival commercial sleep tracking apps like Pillow and Oura.
