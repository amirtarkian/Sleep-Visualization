# SleepViz — Sleep Visualization & Scoring PWA

A client-side sleep analytics tool that imports Apple Health data, computes composite sleep scores (0–100), and displays rich visualizations. Runs entirely in your browser with IndexedDB persistence — no server, no accounts, your data stays on your device.

## Features

- **Sleep Score (0–100)** — Weighted composite of 6 sub-scores: duration, efficiency, deep sleep, REM, latency, and WASO
- **Hypnogram** — Interactive SVG stage timeline with heart rate overlay
- **Trend Charts** — Score trends, duration bars, bedtime consistency, stage composition, efficiency, and heart rate over time
- **Biometrics** — Heart rate, HRV, SpO2, and respiratory rate per night
- **PWA** — Installable, works offline after first load
- **Privacy-first** — All processing happens in your browser. Data never leaves your device.

## Quick Start

```bash
# Clone and install
git clone https://github.com/amirtarkian/Sleep-Visualization.git
cd Sleep-Visualization/sleep-viz
npm install

# Run locally
npm run dev
```

Open `http://localhost:5173` and click **Import > Load Sample Data** to see 30 nights of demo data.

## Getting Your Apple Watch Sleep Data

### Step 1: Export from Apple Health

1. Open the **Health** app on your iPhone
2. Tap your **profile picture** (top-right corner)
3. Scroll down and tap **Export All Health Data**
4. Tap **Export** — this creates a zip file (can take a few minutes)
5. Save or AirDrop the `export.zip` file to your computer

> The export includes all your Apple Watch sleep tracking data: sleep stages (Deep, Core, REM, Awake), heart rate, HRV, blood oxygen, and respiratory rate recorded during sleep.

### Step 2: Import into SleepViz

1. Open SleepViz in your browser (`npm run dev` or the deployed URL)
2. Click **Import** in the navigation
3. **Drag and drop** your `export.zip` (or `export.xml`) onto the upload zone
4. Wait for parsing to complete — progress is shown in real-time
5. Click **View Dashboard** to see your sleep data

### What Gets Imported

| Data Type | Source | Used For |
|---|---|---|
| Sleep stages (Deep, Core, REM, Awake) | Apple Watch | Hypnogram, stage distribution, scoring |
| Heart rate during sleep | Apple Watch | Nightly HR trends, HR overlay on hypnogram |
| Heart rate variability (HRV) | Apple Watch | Biometrics panel |
| Blood oxygen (SpO2) | Apple Watch | Biometrics panel |
| Respiratory rate | Apple Watch | Biometrics panel |

### Tips for Better Data

- **Wear your Apple Watch to bed** — sleep tracking requires wearing the watch during sleep
- **Enable Sleep Focus** — go to Settings > Focus > Sleep on your iPhone to enable automatic sleep detection
- **Enable Blood Oxygen** — go to Watch app > Blood Oxygen > turn on "During Sleep" measurements
- **Charge strategically** — charge your watch for 30 min before bed and 30 min after waking; this gives enough battery for overnight tracking
- **Use the Sleep schedule** — set a bedtime and wake alarm in the Health app > Sleep section for more consistent tracking

### Re-importing Updated Data

SleepViz replaces existing data on each import. To update with new nights:

1. Export from Health again (it always exports everything)
2. Import the new export — it will replace the old data with the full updated set

## How Sleep Scoring Works

Each night gets a composite score from 0–100 based on six sub-scores:

| Sub-Score | Weight | Ideal Range |
|---|---|---|
| **Duration** | 25% | 7–9 hours |
| **Efficiency** | 20% | >= 90% (time asleep / time in bed) |
| **Deep Sleep** | 20% | 15–25% of total sleep |
| **REM Sleep** | 15% | 20–30% of total sleep |
| **Sleep Latency** | 10% | <= 15 minutes to fall asleep |
| **WASO** | 10% | <= 10 minutes awake after falling asleep |

**Score labels:** Excellent (90+), Good (75–89), Fair (60–74), Poor (40–59), Very Poor (0–39)

If stage data isn't available (e.g., tracking without Apple Watch), a fallback scoring mode uses Duration (35%), Efficiency (30%), Latency (15%), and WASO (20%).

## Tech Stack

- **Vite + React + TypeScript** — fast dev, strict types
- **Tailwind CSS v4** — dark theme, glass-morphism design
- **Recharts** — line, bar, area, scatter, and pie charts
- **Dexie (IndexedDB)** — reactive persistence with `useLiveQuery`
- **fflate** — zip decompression for Apple Health exports
- **vite-plugin-pwa** — service worker, offline support, installable

## Project Structure

```
src/
├── providers/       # Data provider interface, context, sample data generator
├── db/              # Dexie IndexedDB schema and helpers
├── lib/             # Scoring, statistics, trends, parsing, utilities
├── hooks/           # React hooks for data access and state
├── components/
│   ├── layout/      # AppShell, Section, Card
│   ├── import/      # File upload, progress, sample data
│   ├── dashboard/   # Score ring, sparkline, quick stats
│   ├── detail/      # Hypnogram, biometrics, score breakdown
│   ├── trends/      # All trend charts
│   ├── stages/      # Stage distribution, recommended ranges
│   └── shared/      # Reusable UI primitives
└── test/            # Unit tests (vitest)
```

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build locally
npm test           # Run unit tests
npm run test:watch # Run tests in watch mode
```

## Deploying to Vercel

The project includes a `vercel.json` with SPA rewrites configured. To deploy:

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set the root directory to `sleep-viz`
4. Deploy — Vercel auto-detects Vite and configures the build

Or use the CLI:

```bash
cd sleep-viz
npx vercel
```

## License

MIT
