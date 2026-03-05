# Oura-Like Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add readiness scoring (PWA), daily coaching tips, weekly/monthly reports, and sleep goal tracking to both the PWA and iOS apps.

**Architecture:** Pure client-side features. New scoring/analysis logic as pure functions (TS) and static methods (Swift). New Dexie tables (PWA) and SwiftData models (iOS) for goals and reports. No backend needed.

**Tech Stack:** React/TypeScript/Dexie/Recharts (PWA), SwiftUI/SwiftData/Swift Charts (iOS), Vitest (testing)

---

### Task 1: PWA Readiness Engine — Tests

**Files:**
- Create: `sleep-viz/src/test/readinessScore.test.ts`

**Step 1: Write failing tests for the readiness scoring functions**

```typescript
import { describe, it, expect } from 'vitest';
import { scoreHRV, scoreRestingHR, computeReadinessScore, computeBaseline } from '../lib/readinessScore';

describe('scoreHRV', () => {
  it('returns 100 when current is 15%+ above baseline', () => {
    expect(scoreHRV(46, 40)).toBe(100);
  });

  it('returns 40 when current is 15%+ below baseline', () => {
    expect(scoreHRV(34, 40)).toBe(40);
  });

  it('returns ~70 when current equals baseline', () => {
    expect(scoreHRV(40, 40)).toBe(70);
  });

  it('returns ~85 when current is 7.5% above baseline', () => {
    const score = scoreHRV(43, 40);
    expect(score).toBeGreaterThanOrEqual(83);
    expect(score).toBeLessThanOrEqual(87);
  });

  it('returns ~55 when current is 7.5% below baseline', () => {
    const score = scoreHRV(37, 40);
    expect(score).toBeGreaterThanOrEqual(53);
    expect(score).toBeLessThanOrEqual(57);
  });

  it('returns 70 when baseline is 0 (avoids division by zero)', () => {
    expect(scoreHRV(40, 0)).toBe(70);
  });
});

describe('scoreRestingHR', () => {
  it('returns 100 when current is 5+ bpm below baseline', () => {
    expect(scoreRestingHR(55, 65)).toBe(100);
  });

  it('returns 40 when current is 5+ bpm above baseline', () => {
    expect(scoreRestingHR(70, 65)).toBe(40);
  });

  it('returns 80 when current equals baseline', () => {
    expect(scoreRestingHR(65, 65)).toBe(80);
  });
});

describe('computeReadinessScore', () => {
  it('computes weighted composite (50% HRV, 30% RHR, 20% Sleep)', () => {
    // HRV=100, RHR=100, Sleep=100 → 100
    const score = computeReadinessScore(46, 40, 55, 65, 100);
    expect(score).toBe(100);
  });

  it('handles mixed scores', () => {
    // HRV=70, RHR=80, Sleep=75 → 0.5*70 + 0.3*80 + 0.2*75 = 35+24+15 = 74
    const score = computeReadinessScore(40, 40, 65, 65, 75);
    expect(score).toBe(74);
  });

  it('clamps to 0-100 range', () => {
    expect(computeReadinessScore(100, 40, 50, 65, 100)).toBeLessThanOrEqual(100);
    expect(computeReadinessScore(10, 40, 80, 65, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe('computeBaseline', () => {
  it('returns average of values', () => {
    expect(computeBaseline([40, 42, 38, 44, 36])).toBe(40);
  });

  it('uses only last 14 values', () => {
    const values = Array(20).fill(50);
    values.push(100); // most recent
    const baseline = computeBaseline(values);
    // Should use last 14 of the 21 values
    expect(baseline).toBeGreaterThan(50);
  });

  it('returns 0 for empty array', () => {
    expect(computeBaseline([])).toBe(0);
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `cd sleep-viz && npx vitest run src/test/readinessScore.test.ts`
Expected: FAIL — module `../lib/readinessScore` not found

**Step 3: Commit**

```bash
git add sleep-viz/src/test/readinessScore.test.ts
git commit -m "test: add readiness score tests (red)"
```

---

### Task 2: PWA Readiness Engine — Implementation

**Files:**
- Create: `sleep-viz/src/lib/readinessScore.ts`
- Modify: `sleep-viz/src/lib/constants.ts` (add readiness weights)

**Step 1: Add readiness constants**

In `sleep-viz/src/lib/constants.ts`, add:

```typescript
export const READINESS_WEIGHTS = {
  hrv: 0.50,
  restingHR: 0.30,
  sleepScore: 0.20,
};

export const READINESS_BASELINE_DAYS = 14;

export const READINESS_COLORS = {
  ring: '#f59e0b', // amber
};
```

**Step 2: Implement the readiness scoring engine**

Create `sleep-viz/src/lib/readinessScore.ts`:

```typescript
import { READINESS_WEIGHTS, READINESS_BASELINE_DAYS } from './constants';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute 14-day rolling baseline from an array of values (most recent last). */
export function computeBaseline(values: number[]): number {
  if (values.length === 0) return 0;
  const recent = values.slice(-READINESS_BASELINE_DAYS);
  return Math.round(recent.reduce((sum, v) => sum + v, 0) / recent.length);
}

/**
 * Score HRV: compare current to baseline.
 * ratio >= 1.15 → 100, ratio <= 0.85 → 40, 0.85–1.0 → 40–70, 1.0–1.15 → 70–100
 */
export function scoreHRV(current: number, baseline: number): number {
  if (baseline === 0) return 70;
  const ratio = current / baseline;
  if (ratio >= 1.15) return 100;
  if (ratio <= 0.85) return 40;
  if (ratio >= 1.0) {
    // 1.0 → 70, 1.15 → 100
    return Math.round(70 + ((ratio - 1.0) / 0.15) * 30);
  }
  // 0.85 → 40, 1.0 → 70
  return Math.round(40 + ((ratio - 0.85) / 0.15) * 30);
}

/**
 * Score Resting HR: compare current to baseline.
 * diff <= -5 (lower is better) → 100, diff >= 5 → 40, else → 80 - (diff * 8)
 */
export function scoreRestingHR(current: number, baseline: number): number {
  const diff = current - baseline;
  if (diff <= -5) return 100;
  if (diff >= 5) return 40;
  return Math.round(clamp(80 - diff * 8, 40, 100));
}

/**
 * Composite readiness: 50% HRV + 30% RHR + 20% Sleep Score.
 * Matches iOS ReadinessEngine weights.
 */
export function computeReadinessScore(
  hrvCurrent: number,
  hrvBaseline: number,
  restingHRCurrent: number,
  restingHRBaseline: number,
  sleepScore: number,
): number {
  const hrvScore = scoreHRV(hrvCurrent, hrvBaseline);
  const rhrScore = scoreRestingHR(restingHRCurrent, restingHRBaseline);
  const composite =
    READINESS_WEIGHTS.hrv * hrvScore +
    READINESS_WEIGHTS.restingHR * rhrScore +
    READINESS_WEIGHTS.sleepScore * sleepScore;
  return Math.round(clamp(composite, 0, 100));
}
```

**Step 3: Run tests to verify they pass**

Run: `cd sleep-viz && npx vitest run src/test/readinessScore.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add sleep-viz/src/lib/readinessScore.ts sleep-viz/src/lib/constants.ts
git commit -m "feat: add readiness scoring engine (PWA)"
```

---

### Task 3: PWA Readiness Data Hook & DB Schema

**Files:**
- Modify: `sleep-viz/src/db/schema.ts` (add readiness table)
- Create: `sleep-viz/src/hooks/useReadiness.ts`
- Modify: `sleep-viz/src/providers/types.ts` (add ReadinessRecord type)

**Step 1: Add ReadinessRecord type**

In `sleep-viz/src/providers/types.ts`, add:

```typescript
export interface ReadinessRecord {
  id: string;
  nightDate: string;
  score: number;
  hrvCurrent: number;
  hrvBaseline: number;
  restingHRCurrent: number;
  restingHRBaseline: number;
  sleepScoreContribution: number;
}
```

**Step 2: Add readiness table to Dexie schema**

In `sleep-viz/src/db/schema.ts`, bump the version and add:

```typescript
// Add to the class:
readinessRecords!: Table<ReadinessRecord, string>;

// In constructor, add new version:
this.version(2).stores({
  sleepSessions: 'id, nightDate, startDate',
  biometricRecords: '++id, sessionId, type, date, [sessionId+type]',
  readinessRecords: 'id, nightDate',
});
```

**Step 3: Create useReadiness hook**

Create `sleep-viz/src/hooks/useReadiness.ts`:

```typescript
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import type { SleepSession, ReadinessRecord } from '../providers/types';
import { computeBaseline, computeReadinessScore } from '../lib/readinessScore';

export function useReadiness(sessions: SleepSession[]): {
  latestReadiness: ReadinessRecord | null;
  readinessHistory: ReadinessRecord[];
} {
  const records = useMemo(() => {
    if (sessions.length === 0) return [];

    // Extract HRV and RHR values from sessions (oldest first)
    const sortedSessions = [...sessions].sort(
      (a, b) => a.nightDate.localeCompare(b.nightDate)
    );

    const hrvValues: number[] = [];
    const rhrValues: number[] = [];
    const results: ReadinessRecord[] = [];

    for (const session of sortedSessions) {
      if (session.avgHrv != null) hrvValues.push(session.avgHrv);
      if (session.minHeartRate != null) rhrValues.push(session.minHeartRate);

      if (hrvValues.length < 3 || rhrValues.length < 3) continue;

      const hrvBaseline = computeBaseline(hrvValues.slice(0, -1));
      const rhrBaseline = computeBaseline(rhrValues.slice(0, -1));
      const hrvCurrent = session.avgHrv ?? hrvBaseline;
      const rhrCurrent = session.minHeartRate ?? rhrBaseline;

      const score = computeReadinessScore(
        hrvCurrent,
        hrvBaseline,
        rhrCurrent,
        rhrBaseline,
        session.score.overall,
      );

      results.push({
        id: `readiness-${session.nightDate}`,
        nightDate: session.nightDate,
        score,
        hrvCurrent,
        hrvBaseline,
        restingHRCurrent: rhrCurrent,
        restingHRBaseline: rhrBaseline,
        sleepScoreContribution: session.score.overall,
      });
    }

    return results;
  }, [sessions]);

  return {
    latestReadiness: records.length > 0 ? records[records.length - 1] : null,
    readinessHistory: records,
  };
}
```

**Step 4: Run lint and type-check**

Run: `cd sleep-viz && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add sleep-viz/src/providers/types.ts sleep-viz/src/db/schema.ts sleep-viz/src/hooks/useReadiness.ts
git commit -m "feat: add readiness data hook and DB schema (PWA)"
```

---

### Task 4: PWA Readiness UI Components

**Files:**
- Create: `sleep-viz/src/components/readiness/ReadinessPanel.tsx`
- Create: `sleep-viz/src/components/readiness/ReadinessFactors.tsx`
- Modify: `sleep-viz/src/components/dashboard/Dashboard.tsx` (add readiness ring)
- Modify: `sleep-viz/src/App.tsx` (add readiness section)

**Step 1: Create ReadinessFactors component**

Create `sleep-viz/src/components/readiness/ReadinessFactors.tsx`:

```tsx
import { Card } from '../layout/Card';
import type { ReadinessRecord } from '../../providers/types';
import { getScoreColor } from '../../lib/constants';

interface Props {
  record: ReadinessRecord;
}

export function ReadinessFactors({ record }: Props) {
  const factors = [
    {
      label: 'HRV',
      current: `${Math.round(record.hrvCurrent)} ms`,
      baseline: `${Math.round(record.hrvBaseline)} ms`,
      direction: record.hrvCurrent >= record.hrvBaseline ? 'up' : 'down',
      weight: '50%',
    },
    {
      label: 'Resting HR',
      current: `${Math.round(record.restingHRCurrent)} bpm`,
      baseline: `${Math.round(record.restingHRBaseline)} bpm`,
      direction: record.restingHRCurrent <= record.restingHRBaseline ? 'up' : 'down',
      weight: '30%',
    },
    {
      label: 'Sleep Score',
      current: `${record.sleepScoreContribution}`,
      baseline: '',
      direction: record.sleepScoreContribution >= 75 ? 'up' : 'down',
      weight: '20%',
    },
  ];

  return (
    <Card>
      <h3 className="text-sm font-medium text-white/60 mb-3">Contributing Factors</h3>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center justify-between">
            <div>
              <span className="text-sm text-white">{f.label}</span>
              <span className="text-xs text-white/40 ml-2">({f.weight})</span>
            </div>
            <div className="text-sm">
              <span className={f.direction === 'up' ? 'text-green-400' : 'text-red-400'}>
                {f.current}
              </span>
              {f.baseline && (
                <span className="text-white/40 ml-1">/ {f.baseline}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

**Step 2: Create ReadinessPanel component**

Create `sleep-viz/src/components/readiness/ReadinessPanel.tsx`:

```tsx
import { ScoreRing } from '../dashboard/ScoreRing';
import { ReadinessFactors } from './ReadinessFactors';
import { Section } from '../layout/Section';
import type { ReadinessRecord } from '../../providers/types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { READINESS_COLORS } from '../../lib/constants';

interface Props {
  latest: ReadinessRecord | null;
  history: ReadinessRecord[];
}

export function ReadinessPanel({ latest, history }: Props) {
  if (!latest) {
    return (
      <Section title="Readiness">
        <p className="text-white/40 text-sm">
          Need at least 3 nights of biometric data to compute readiness.
        </p>
      </Section>
    );
  }

  const chartData = history.slice(-30).map((r) => ({
    date: r.nightDate,
    score: r.score,
    hrv: Math.round(r.hrvCurrent),
  }));

  return (
    <Section title="Readiness">
      <div className="flex flex-col items-center mb-6">
        <ScoreRing score={latest.score} size={180} label="Readiness" />
      </div>

      <ReadinessFactors record={latest} />

      {chartData.length > 3 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">30-Day Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={READINESS_COLORS.ring}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}
```

**Step 3: Add readiness ring to Dashboard**

In `sleep-viz/src/components/dashboard/Dashboard.tsx`, import and add the readiness score ring next to the sleep score ring. Add the `useReadiness` hook and render a second `ScoreRing` with `label="Readiness"` in a flex row alongside the existing sleep score ring.

**Step 4: Add readiness section to App**

In `sleep-viz/src/App.tsx`, add a 'readiness' section option and wire up `ReadinessPanel`.

**Step 5: Run the dev server and verify visually**

Run: `cd sleep-viz && npm run dev`
Expected: Dashboard shows two rings side-by-side, readiness section accessible

**Step 6: Commit**

```bash
git add sleep-viz/src/components/readiness/ sleep-viz/src/components/dashboard/Dashboard.tsx sleep-viz/src/App.tsx
git commit -m "feat: add readiness score UI to PWA dashboard"
```

---

### Task 5: PWA Coaching Tips Engine — Tests

**Files:**
- Create: `sleep-viz/src/test/coachingTips.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateTips, type CoachingTip } from '../lib/coachingTips';
import type { SleepSession } from '../providers/types';

function makeSession(overrides: Partial<SleepSession>): SleepSession {
  return {
    id: 'test',
    nightDate: '2026-03-01',
    startDate: new Date('2026-03-01T23:00:00'),
    endDate: new Date('2026-03-02T07:00:00'),
    stages: [],
    score: { overall: 75, duration: 80, efficiency: 85, deepSleep: 70, rem: 70, latency: 90, waso: 90, isFallback: false },
    sourceName: 'Apple Watch',
    sourceNames: ['Apple Watch'],
    timeInBed: 480,
    totalSleepTime: 420,
    sleepEfficiency: 87.5,
    sleepLatency: 10,
    waso: 15,
    deepMinutes: 60,
    remMinutes: 90,
    coreMinutes: 240,
    awakeMinutes: 30,
    deepPercent: 14.3,
    remPercent: 21.4,
    corePercent: 57.1,
    awakePercent: 7.1,
    avgHeartRate: 58,
    minHeartRate: 48,
    avgHrv: 42,
    avgSpo2: 96,
    avgRespiratoryRate: 14,
    ...overrides,
  } as SleepSession;
}

describe('generateTips', () => {
  it('returns low deep sleep tip when deep < 15% for 3+ nights', () => {
    const sessions = [
      makeSession({ nightDate: '2026-02-27', deepPercent: 10 }),
      makeSession({ nightDate: '2026-02-28', deepPercent: 12 }),
      makeSession({ nightDate: '2026-03-01', deepPercent: 11 }),
    ];
    const tips = generateTips(sessions);
    expect(tips.some((t) => t.id === 'low-deep-sleep')).toBe(true);
  });

  it('returns low efficiency tip when efficiency < 85%', () => {
    const sessions = [makeSession({ sleepEfficiency: 78 })];
    const tips = generateTips(sessions);
    expect(tips.some((t) => t.id === 'low-efficiency')).toBe(true);
  });

  it('returns high latency tip when latency > 30 min', () => {
    const sessions = [makeSession({ sleepLatency: 40 })];
    const tips = generateTips(sessions);
    expect(tips.some((t) => t.id === 'high-latency')).toBe(true);
  });

  it('returns inconsistent bedtime tip when variance > 1 hour', () => {
    const sessions = [
      makeSession({ nightDate: '2026-02-25', startDate: new Date('2026-02-25T22:00:00') }),
      makeSession({ nightDate: '2026-02-26', startDate: new Date('2026-02-27T00:30:00') }),
      makeSession({ nightDate: '2026-02-27', startDate: new Date('2026-02-27T21:00:00') }),
      makeSession({ nightDate: '2026-02-28', startDate: new Date('2026-03-01T01:00:00') }),
      makeSession({ nightDate: '2026-03-01', startDate: new Date('2026-03-01T23:30:00') }),
    ];
    const tips = generateTips(sessions);
    expect(tips.some((t) => t.id === 'inconsistent-bedtime')).toBe(true);
  });

  it('returns declining trend tip when scores drop over 7 days', () => {
    const sessions = Array.from({ length: 7 }, (_, i) =>
      makeSession({
        nightDate: `2026-02-${22 + i}`,
        score: { overall: 90 - i * 5, duration: 80, efficiency: 80, deepSleep: 70, rem: 70, latency: 80, waso: 80, isFallback: false },
      }),
    );
    const tips = generateTips(sessions);
    expect(tips.some((t) => t.id === 'declining-trend')).toBe(true);
  });

  it('returns positive tip when latest score >= 90', () => {
    const sessions = [
      makeSession({
        score: { overall: 92, duration: 95, efficiency: 90, deepSleep: 90, rem: 85, latency: 95, waso: 95, isFallback: false },
      }),
    ];
    const tips = generateTips(sessions);
    expect(tips.some((t) => t.id === 'excellent-sleep')).toBe(true);
  });

  it('returns empty array with no sessions', () => {
    expect(generateTips([])).toEqual([]);
  });

  it('returns at most 3 tips, ordered by priority', () => {
    const sessions = [
      makeSession({
        sleepEfficiency: 70,
        sleepLatency: 45,
        deepPercent: 8,
        score: { overall: 40, duration: 50, efficiency: 50, deepSleep: 30, rem: 40, latency: 30, waso: 40, isFallback: false },
      }),
    ];
    const tips = generateTips(sessions);
    expect(tips.length).toBeLessThanOrEqual(3);
  });
});
```

**Step 2: Run tests to verify failure**

Run: `cd sleep-viz && npx vitest run src/test/coachingTips.test.ts`
Expected: FAIL — module not found

**Step 3: Commit**

```bash
git add sleep-viz/src/test/coachingTips.test.ts
git commit -m "test: add coaching tips engine tests (red)"
```

---

### Task 6: PWA Coaching Tips Engine — Implementation

**Files:**
- Create: `sleep-viz/src/lib/coachingTips.ts`

**Step 1: Implement the coaching tips engine**

```typescript
import type { SleepSession } from '../providers/types';

export interface CoachingTip {
  id: string;
  title: string;
  message: string;
  priority: number; // lower = higher priority
  type: 'warning' | 'info' | 'positive';
}

export function generateTips(sessions: SleepSession[]): CoachingTip[] {
  if (sessions.length === 0) return [];

  const tips: CoachingTip[] = [];
  const latest = sessions[sessions.length - 1];
  const recent7 = sessions.slice(-7);
  const recent3 = sessions.slice(-3);

  // Low deep sleep for 3+ nights
  if (recent3.length >= 3 && recent3.every((s) => s.deepPercent < 15)) {
    tips.push({
      id: 'low-deep-sleep',
      title: 'Low Deep Sleep',
      message:
        'Your deep sleep has been below 15% for the past few nights. Try keeping your room cooler (65-68°F) and avoiding alcohol before bed.',
      priority: 1,
      type: 'warning',
    });
  }

  // Low efficiency
  if (latest.sleepEfficiency < 85) {
    tips.push({
      id: 'low-efficiency',
      title: 'Low Sleep Efficiency',
      message:
        "You're spending too much time awake in bed. Try going to bed only when you feel sleepy, and get up if you can't sleep after 20 minutes.",
      priority: 2,
      type: 'warning',
    });
  }

  // High latency
  if (latest.sleepLatency > 30) {
    tips.push({
      id: 'high-latency',
      title: 'Slow Sleep Onset',
      message:
        "You're taking over 30 minutes to fall asleep. Consider a wind-down routine: dim lights, no screens, and relaxation techniques 30 minutes before bed.",
      priority: 3,
      type: 'warning',
    });
  }

  // Inconsistent bedtime (std dev of bedtime > 60 min over last 5+ nights)
  if (recent7.length >= 5) {
    const bedtimeMinutes = recent7.map((s) => {
      const h = s.startDate.getHours();
      const m = s.startDate.getMinutes();
      return h < 12 ? h * 60 + m + 1440 : h * 60 + m; // normalize past midnight
    });
    const mean = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length;
    const variance = bedtimeMinutes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / bedtimeMinutes.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 60) {
      tips.push({
        id: 'inconsistent-bedtime',
        title: 'Inconsistent Bedtime',
        message:
          'Your bedtime varies by over an hour. A consistent sleep schedule helps regulate your circadian rhythm and improves sleep quality.',
        priority: 4,
        type: 'info',
      });
    }
  }

  // Declining trend over 7 days
  if (recent7.length >= 7) {
    const first3Avg = recent7.slice(0, 3).reduce((s, r) => s + r.score.overall, 0) / 3;
    const last3Avg = recent7.slice(-3).reduce((s, r) => s + r.score.overall, 0) / 3;
    if (last3Avg < first3Avg - 10) {
      tips.push({
        id: 'declining-trend',
        title: 'Sleep Quality Declining',
        message:
          'Your sleep score has been trending down this week. Check if anything changed recently — stress, caffeine timing, screen use, or exercise habits.',
        priority: 2,
        type: 'warning',
      });
    }
  }

  // Excellent sleep
  if (latest.score.overall >= 90) {
    tips.push({
      id: 'excellent-sleep',
      title: 'Excellent Sleep!',
      message: 'Great sleep last night! Whatever you did yesterday, keep it up.',
      priority: 10,
      type: 'positive',
    });
  }

  // Sort by priority, return top 3
  tips.sort((a, b) => a.priority - b.priority);
  return tips.slice(0, 3);
}
```

**Step 2: Run tests**

Run: `cd sleep-viz && npx vitest run src/test/coachingTips.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add sleep-viz/src/lib/coachingTips.ts
git commit -m "feat: add coaching tips engine (PWA)"
```

---

### Task 7: PWA Coaching Tips UI

**Files:**
- Create: `sleep-viz/src/components/dashboard/CoachingTips.tsx`
- Modify: `sleep-viz/src/components/dashboard/Dashboard.tsx`

**Step 1: Create CoachingTips component**

```tsx
import { Card } from '../layout/Card';
import type { CoachingTip } from '../../lib/coachingTips';
import { Lightbulb, AlertTriangle, Star } from 'lucide-react';

interface Props {
  tips: CoachingTip[];
}

const ICONS = {
  warning: AlertTriangle,
  info: Lightbulb,
  positive: Star,
};

const ICON_COLORS = {
  warning: 'text-orange-400',
  info: 'text-blue-400',
  positive: 'text-green-400',
};

export function CoachingTips({ tips }: Props) {
  if (tips.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-white/60">Today's Tips</h3>
      {tips.map((tip) => {
        const Icon = ICONS[tip.type];
        return (
          <Card key={tip.id}>
            <div className="flex gap-3">
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ICON_COLORS[tip.type]}`} />
              <div>
                <p className="text-sm font-medium text-white">{tip.title}</p>
                <p className="text-xs text-white/50 mt-1">{tip.message}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
```

**Step 2: Wire into Dashboard**

In `Dashboard.tsx`, import `generateTips` and `CoachingTips`. Call `generateTips(sessions)` and render `<CoachingTips tips={tips} />` below the score rings.

**Step 3: Verify visually**

Run: `cd sleep-viz && npm run dev`
Expected: Tips appear on dashboard when sample data is loaded

**Step 4: Commit**

```bash
git add sleep-viz/src/components/dashboard/CoachingTips.tsx sleep-viz/src/components/dashboard/Dashboard.tsx
git commit -m "feat: add coaching tips to PWA dashboard"
```

---

### Task 8: PWA Weekly/Monthly Reports — Tests

**Files:**
- Create: `sleep-viz/src/test/reports.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateWeeklyReport, generateMonthlyReport, type SleepReport } from '../lib/reports';
import type { SleepSession, SleepScore } from '../providers/types';

function makeSession(nightDate: string, overrides?: Partial<SleepSession>): SleepSession {
  const score: SleepScore = {
    overall: 75, duration: 80, efficiency: 85, deepSleep: 70,
    rem: 70, latency: 90, waso: 90, isFallback: false,
  };
  return {
    id: `session-${nightDate}`,
    nightDate,
    startDate: new Date(`${nightDate}T23:00:00`),
    endDate: new Date(`${nightDate}T07:00:00`),
    stages: [],
    score,
    sourceName: 'Apple Watch',
    sourceNames: ['Apple Watch'],
    timeInBed: 480,
    totalSleepTime: 420,
    sleepEfficiency: 87.5,
    sleepLatency: 10,
    waso: 15,
    deepMinutes: 60,
    remMinutes: 90,
    coreMinutes: 240,
    awakeMinutes: 30,
    deepPercent: 14.3,
    remPercent: 21.4,
    corePercent: 57.1,
    awakePercent: 7.1,
    avgHeartRate: 58,
    minHeartRate: 48,
    avgHrv: 42,
    avgSpo2: 96,
    avgRespiratoryRate: 14,
    ...overrides,
  } as SleepSession;
}

describe('generateWeeklyReport', () => {
  const sessions = [
    makeSession('2026-02-23', { score: { overall: 85, duration: 90, efficiency: 85, deepSleep: 80, rem: 80, latency: 90, waso: 90, isFallback: false }, totalSleepTime: 450 }),
    makeSession('2026-02-24', { score: { overall: 70, duration: 70, efficiency: 75, deepSleep: 65, rem: 70, latency: 80, waso: 75, isFallback: false }, totalSleepTime: 380 }),
    makeSession('2026-02-25', { score: { overall: 90, duration: 95, efficiency: 90, deepSleep: 85, rem: 85, latency: 95, waso: 95, isFallback: false }, totalSleepTime: 470 }),
    makeSession('2026-02-26', { score: { overall: 65, duration: 60, efficiency: 70, deepSleep: 60, rem: 65, latency: 75, waso: 70, isFallback: false }, totalSleepTime: 360 }),
    makeSession('2026-02-27', { score: { overall: 78, duration: 80, efficiency: 80, deepSleep: 75, rem: 75, latency: 85, waso: 80, isFallback: false }, totalSleepTime: 420 }),
  ];

  it('calculates average score', () => {
    const report = generateWeeklyReport(sessions);
    expect(report.avgScore).toBe(Math.round((85 + 70 + 90 + 65 + 78) / 5));
  });

  it('identifies best and worst nights', () => {
    const report = generateWeeklyReport(sessions);
    expect(report.bestNight.nightDate).toBe('2026-02-25');
    expect(report.worstNight.nightDate).toBe('2026-02-26');
  });

  it('calculates average duration in hours', () => {
    const report = generateWeeklyReport(sessions);
    const expectedAvgMin = (450 + 380 + 470 + 360 + 420) / 5;
    expect(report.avgDurationHours).toBeCloseTo(expectedAvgMin / 60, 1);
  });

  it('determines trend direction', () => {
    const report = generateWeeklyReport(sessions);
    expect(['improving', 'declining', 'stable']).toContain(report.trendDirection);
  });

  it('returns empty report for no sessions', () => {
    const report = generateWeeklyReport([]);
    expect(report.avgScore).toBe(0);
    expect(report.nights).toBe(0);
  });
});

describe('generateMonthlyReport', () => {
  it('generates weekly comparisons', () => {
    const sessions = Array.from({ length: 28 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return makeSession(`2026-02-${day}`);
    });
    const report = generateMonthlyReport(sessions);
    expect(report.weeklyBreakdown.length).toBeGreaterThanOrEqual(3);
  });
});
```

**Step 2: Run to verify failure**

Run: `cd sleep-viz && npx vitest run src/test/reports.test.ts`
Expected: FAIL

**Step 3: Commit**

```bash
git add sleep-viz/src/test/reports.test.ts
git commit -m "test: add weekly/monthly report tests (red)"
```

---

### Task 9: PWA Reports Engine — Implementation

**Files:**
- Create: `sleep-viz/src/lib/reports.ts`

**Step 1: Implement report generation**

```typescript
import type { SleepSession } from '../providers/types';

export interface SleepReport {
  type: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  nights: number;
  avgScore: number;
  avgDurationHours: number;
  avgEfficiency: number;
  avgDeepPercent: number;
  avgRemPercent: number;
  avgCorePercent: number;
  bestNight: { nightDate: string; score: number };
  worstNight: { nightDate: string; score: number };
  trendDirection: 'improving' | 'declining' | 'stable';
  insights: string[];
  recommendations: string[];
  weeklyBreakdown: WeekSummary[];
}

interface WeekSummary {
  weekStart: string;
  avgScore: number;
  nights: number;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function emptyReport(type: 'weekly' | 'monthly'): SleepReport {
  return {
    type,
    startDate: '',
    endDate: '',
    nights: 0,
    avgScore: 0,
    avgDurationHours: 0,
    avgEfficiency: 0,
    avgDeepPercent: 0,
    avgRemPercent: 0,
    avgCorePercent: 0,
    bestNight: { nightDate: '', score: 0 },
    worstNight: { nightDate: '', score: 0 },
    trendDirection: 'stable',
    insights: [],
    recommendations: [],
    weeklyBreakdown: [],
  };
}

function computeInsights(sessions: SleepSession[]): string[] {
  const insights: string[] = [];
  if (sessions.length < 3) return insights;

  // Weekend vs weekday comparison
  const weekdays = sessions.filter((s) => {
    const d = new Date(s.nightDate).getDay();
    return d >= 1 && d <= 4; // Mon-Thu nights
  });
  const weekends = sessions.filter((s) => {
    const d = new Date(s.nightDate).getDay();
    return d === 5 || d === 6 || d === 0; // Fri/Sat/Sun nights
  });
  if (weekdays.length > 0 && weekends.length > 0) {
    const wdAvg = avg(weekdays.map((s) => s.totalSleepTime));
    const weAvg = avg(weekends.map((s) => s.totalSleepTime));
    const diffMin = Math.round(Math.abs(weAvg - wdAvg));
    if (diffMin > 30) {
      const direction = weAvg > wdAvg ? 'longer' : 'shorter';
      insights.push(`You slept ${diffMin} minutes ${direction} on weekends vs weekdays.`);
    }
  }

  // Best bedtime correlation
  const sortedByScore = [...sessions].sort((a, b) => b.score.overall - a.score.overall);
  const top3 = sortedByScore.slice(0, 3);
  if (top3.length >= 3) {
    const avgBedtimeH = avg(top3.map((s) => {
      const h = s.startDate.getHours();
      return h < 12 ? h + 24 : h;
    }));
    const h = Math.floor(avgBedtimeH % 24);
    const m = Math.round((avgBedtimeH % 1) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    insights.push(`Your best sleep nights had bedtimes around ${displayH}:${String(m).padStart(2, '0')} ${period}.`);
  }

  return insights;
}

function computeRecommendations(sessions: SleepSession[]): string[] {
  const recs: string[] = [];
  if (sessions.length === 0) return recs;

  const avgDeep = avg(sessions.map((s) => s.deepPercent));
  const avgEff = avg(sessions.map((s) => s.sleepEfficiency));

  if (avgDeep < 15) {
    recs.push('Focus on increasing deep sleep: keep your room cool, exercise earlier in the day, and limit evening screen time.');
  }
  if (avgEff < 85) {
    recs.push('Improve sleep efficiency by going to bed only when sleepy and maintaining a consistent wake time.');
  }

  return recs.slice(0, 2);
}

function computeTrendDirection(sessions: SleepSession[]): 'improving' | 'declining' | 'stable' {
  if (sessions.length < 4) return 'stable';
  const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
  const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
  const firstAvg = avg(firstHalf.map((s) => s.score.overall));
  const secondAvg = avg(secondHalf.map((s) => s.score.overall));
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

export function generateWeeklyReport(sessions: SleepSession[]): SleepReport {
  if (sessions.length === 0) return emptyReport('weekly');

  const sorted = [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate));
  const scores = sorted.map((s) => s.score.overall);
  const best = sorted.reduce((a, b) => (b.score.overall > a.score.overall ? b : a));
  const worst = sorted.reduce((a, b) => (b.score.overall < a.score.overall ? b : a));

  return {
    type: 'weekly',
    startDate: sorted[0].nightDate,
    endDate: sorted[sorted.length - 1].nightDate,
    nights: sorted.length,
    avgScore: Math.round(avg(scores)),
    avgDurationHours: Math.round((avg(sorted.map((s) => s.totalSleepTime)) / 60) * 10) / 10,
    avgEfficiency: Math.round(avg(sorted.map((s) => s.sleepEfficiency))),
    avgDeepPercent: Math.round(avg(sorted.map((s) => s.deepPercent)) * 10) / 10,
    avgRemPercent: Math.round(avg(sorted.map((s) => s.remPercent)) * 10) / 10,
    avgCorePercent: Math.round(avg(sorted.map((s) => s.corePercent)) * 10) / 10,
    bestNight: { nightDate: best.nightDate, score: best.score.overall },
    worstNight: { nightDate: worst.nightDate, score: worst.score.overall },
    trendDirection: computeTrendDirection(sorted),
    insights: computeInsights(sorted),
    recommendations: computeRecommendations(sorted),
    weeklyBreakdown: [],
  };
}

export function generateMonthlyReport(sessions: SleepSession[]): SleepReport {
  if (sessions.length === 0) return emptyReport('monthly');

  const sorted = [...sessions].sort((a, b) => a.nightDate.localeCompare(b.nightDate));

  // Build weekly breakdown
  const weeks: SleepSession[][] = [];
  let currentWeek: SleepSession[] = [];
  for (const session of sorted) {
    if (currentWeek.length >= 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(session);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const weeklyBreakdown: WeekSummary[] = weeks.map((w) => ({
    weekStart: w[0].nightDate,
    avgScore: Math.round(avg(w.map((s) => s.score.overall))),
    nights: w.length,
  }));

  const base = generateWeeklyReport(sorted);
  return {
    ...base,
    type: 'monthly',
    weeklyBreakdown,
  };
}
```

**Step 2: Run tests**

Run: `cd sleep-viz && npx vitest run src/test/reports.test.ts`
Expected: All PASS

**Step 3: Commit**

```bash
git add sleep-viz/src/lib/reports.ts
git commit -m "feat: add weekly/monthly report engine (PWA)"
```

---

### Task 10: PWA Reports UI

**Files:**
- Create: `sleep-viz/src/components/reports/ReportsView.tsx`
- Create: `sleep-viz/src/components/reports/ReportCard.tsx`
- Modify: `sleep-viz/src/App.tsx` (add reports section)

**Step 1: Create ReportCard component**

```tsx
import { Card } from '../layout/Card';
import type { SleepReport } from '../../lib/reports';
import { getScoreColor } from '../../lib/constants';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  report: SleepReport;
}

const TREND_ICONS = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  improving: 'text-green-400',
  declining: 'text-red-400',
  stable: 'text-white/40',
};

export function ReportCard({ report }: Props) {
  if (report.nights === 0) return null;
  const TrendIcon = TREND_ICONS[report.trendDirection];

  return (
    <Card>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white capitalize">{report.type} Report</h3>
          <p className="text-xs text-white/40">{report.startDate} — {report.endDate}</p>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={`w-4 h-4 ${TREND_COLORS[report.trendDirection]}`} />
          <span className={`text-xs ${TREND_COLORS[report.trendDirection]}`}>
            {report.trendDirection}
          </span>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-white/40">Avg Score</p>
          <p className="text-xl font-bold" style={{ color: getScoreColor(report.avgScore) }}>
            {report.avgScore}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/40">Avg Duration</p>
          <p className="text-xl font-bold text-white">{report.avgDurationHours}h</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Avg Efficiency</p>
          <p className="text-xl font-bold text-white">{report.avgEfficiency}%</p>
        </div>
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-500/10 rounded-lg p-3">
          <p className="text-xs text-green-400">Best Night</p>
          <p className="text-sm text-white">{report.bestNight.nightDate}</p>
          <p className="text-lg font-bold text-green-400">{report.bestNight.score}</p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3">
          <p className="text-xs text-red-400">Worst Night</p>
          <p className="text-sm text-white">{report.worstNight.nightDate}</p>
          <p className="text-lg font-bold text-red-400">{report.worstNight.score}</p>
        </div>
      </div>

      {/* Stage Averages */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-white/40">Deep</p>
          <p className="text-sm font-medium text-blue-800">{report.avgDeepPercent}%</p>
        </div>
        <div>
          <p className="text-xs text-white/40">REM</p>
          <p className="text-sm font-medium text-purple-400">{report.avgRemPercent}%</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Core</p>
          <p className="text-sm font-medium text-blue-400">{report.avgCorePercent}%</p>
        </div>
      </div>

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2">Insights</p>
          {report.insights.map((insight, i) => (
            <p key={i} className="text-sm text-white/70 mb-1">• {insight}</p>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-2">Recommendations</p>
          {report.recommendations.map((rec, i) => (
            <p key={i} className="text-sm text-amber-300/70 mb-1">→ {rec}</p>
          ))}
        </div>
      )}

      {/* Weekly Breakdown (monthly only) */}
      {report.weeklyBreakdown.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-white/40 mb-2">Week-over-Week</p>
          <div className="space-y-2">
            {report.weeklyBreakdown.map((w, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white/60">Week of {w.weekStart}</span>
                <span className="text-white font-medium">{w.avgScore} avg ({w.nights} nights)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
```

**Step 2: Create ReportsView**

```tsx
import { useMemo, useState } from 'react';
import { Section } from '../layout/Section';
import { ReportCard } from './ReportCard';
import { generateWeeklyReport, generateMonthlyReport } from '../../lib/reports';
import type { SleepSession } from '../../providers/types';

interface Props {
  sessions: SleepSession[];
}

export function ReportsView({ sessions }: Props) {
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');

  const weeklyReport = useMemo(() => {
    const last7 = sessions.slice(-7);
    return generateWeeklyReport(last7);
  }, [sessions]);

  const monthlyReport = useMemo(() => {
    const last30 = sessions.slice(-30);
    return generateMonthlyReport(last30);
  }, [sessions]);

  return (
    <Section title="Reports">
      <div className="flex gap-2 mb-4">
        {(['weekly', 'monthly'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {v === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      <ReportCard report={view === 'weekly' ? weeklyReport : monthlyReport} />
    </Section>
  );
}
```

**Step 3: Add reports section to App.tsx**

In `App.tsx`, add 'reports' as a section and wire up `<ReportsView sessions={sessions} />`.

**Step 4: Verify visually**

Run: `cd sleep-viz && npm run dev`
Expected: Reports tab shows weekly/monthly reports with stats, insights, recommendations

**Step 5: Commit**

```bash
git add sleep-viz/src/components/reports/ sleep-viz/src/App.tsx
git commit -m "feat: add weekly/monthly reports UI (PWA)"
```

---

### Task 11: PWA Sleep Goals — Tests

**Files:**
- Create: `sleep-viz/src/test/goals.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  checkGoalMet,
  computeStreak,
  computeOptimalBedtime,
  type SleepGoal,
} from '../lib/goals';
import type { SleepSession } from '../providers/types';

function makeSession(nightDate: string, overrides?: Partial<SleepSession>): SleepSession {
  return {
    id: `s-${nightDate}`,
    nightDate,
    startDate: new Date(`${nightDate}T23:00:00`),
    endDate: new Date(`${nightDate}T07:00:00`),
    stages: [],
    score: { overall: 75, duration: 80, efficiency: 85, deepSleep: 70, rem: 70, latency: 90, waso: 90, isFallback: false },
    sourceName: 'Apple Watch',
    sourceNames: ['Apple Watch'],
    timeInBed: 480,
    totalSleepTime: 480,
    sleepEfficiency: 87.5,
    sleepLatency: 10,
    waso: 15,
    deepMinutes: 60,
    remMinutes: 90,
    coreMinutes: 240,
    awakeMinutes: 30,
    deepPercent: 14.3,
    remPercent: 21.4,
    corePercent: 57.1,
    awakePercent: 7.1,
    avgHeartRate: 58,
    minHeartRate: 48,
    avgHrv: 42,
    avgSpo2: 96,
    avgRespiratoryRate: 14,
    ...overrides,
  } as SleepSession;
}

describe('checkGoalMet', () => {
  it('duration goal: met when totalSleepTime >= target', () => {
    const goal: SleepGoal = { type: 'duration', target: 480 };
    const session = makeSession('2026-03-01', { totalSleepTime: 490 });
    expect(checkGoalMet(goal, session)).toBe(true);
  });

  it('duration goal: not met when below target', () => {
    const goal: SleepGoal = { type: 'duration', target: 480 };
    const session = makeSession('2026-03-01', { totalSleepTime: 400 });
    expect(checkGoalMet(goal, session)).toBe(false);
  });

  it('bedtime goal: met when bedtime within window', () => {
    const goal: SleepGoal = { type: 'bedtime', targetStart: 22 * 60 + 30, targetEnd: 23 * 60 }; // 10:30-11:00 PM
    const session = makeSession('2026-03-01', { startDate: new Date('2026-03-01T22:45:00') });
    expect(checkGoalMet(goal, session)).toBe(true);
  });

  it('score goal: met when score >= target', () => {
    const goal: SleepGoal = { type: 'score', target: 75 };
    const session = makeSession('2026-03-01', {
      score: { overall: 80, duration: 80, efficiency: 80, deepSleep: 80, rem: 80, latency: 80, waso: 80, isFallback: false },
    });
    expect(checkGoalMet(goal, session)).toBe(true);
  });
});

describe('computeStreak', () => {
  it('counts consecutive nights meeting goal from most recent', () => {
    const goal: SleepGoal = { type: 'score', target: 70 };
    const sessions = [
      makeSession('2026-02-27', { score: { overall: 60, duration: 60, efficiency: 60, deepSleep: 60, rem: 60, latency: 60, waso: 60, isFallback: false } }),
      makeSession('2026-02-28', { score: { overall: 75, duration: 80, efficiency: 80, deepSleep: 80, rem: 80, latency: 80, waso: 80, isFallback: false } }),
      makeSession('2026-03-01', { score: { overall: 80, duration: 80, efficiency: 80, deepSleep: 80, rem: 80, latency: 80, waso: 80, isFallback: false } }),
    ];
    expect(computeStreak(goal, sessions)).toBe(2);
  });

  it('returns 0 when latest night does not meet goal', () => {
    const goal: SleepGoal = { type: 'score', target: 90 };
    const sessions = [makeSession('2026-03-01', { score: { overall: 70, duration: 70, efficiency: 70, deepSleep: 70, rem: 70, latency: 70, waso: 70, isFallback: false } })];
    expect(computeStreak(goal, sessions)).toBe(0);
  });
});

describe('computeOptimalBedtime', () => {
  it('finds bedtime window of top-scoring nights', () => {
    const sessions = [
      makeSession('2026-02-25', { startDate: new Date('2026-02-25T22:30:00'), score: { overall: 92, duration: 95, efficiency: 90, deepSleep: 90, rem: 90, latency: 95, waso: 95, isFallback: false } }),
      makeSession('2026-02-26', { startDate: new Date('2026-02-26T22:45:00'), score: { overall: 88, duration: 90, efficiency: 85, deepSleep: 85, rem: 85, latency: 90, waso: 90, isFallback: false } }),
      makeSession('2026-02-27', { startDate: new Date('2026-02-28T01:00:00'), score: { overall: 55, duration: 50, efficiency: 60, deepSleep: 50, rem: 50, latency: 60, waso: 60, isFallback: false } }),
      makeSession('2026-02-28', { startDate: new Date('2026-02-28T22:15:00'), score: { overall: 90, duration: 92, efficiency: 88, deepSleep: 88, rem: 88, latency: 92, waso: 92, isFallback: false } }),
    ];
    const result = computeOptimalBedtime(sessions);
    expect(result).not.toBeNull();
    // Top 3 bedtimes: 22:15, 22:30, 22:45 → window around 10:15-10:45 PM
    expect(result!.startHour).toBeGreaterThanOrEqual(22);
    expect(result!.endHour).toBeLessThanOrEqual(23);
  });

  it('returns null with fewer than 7 sessions', () => {
    const sessions = [makeSession('2026-03-01')];
    expect(computeOptimalBedtime(sessions)).toBeNull();
  });
});
```

**Step 2: Run to verify failure**

Run: `cd sleep-viz && npx vitest run src/test/goals.test.ts`
Expected: FAIL

**Step 3: Commit**

```bash
git add sleep-viz/src/test/goals.test.ts
git commit -m "test: add sleep goals tests (red)"
```

---

### Task 12: PWA Sleep Goals — Implementation

**Files:**
- Create: `sleep-viz/src/lib/goals.ts`
- Modify: `sleep-viz/src/db/schema.ts` (add goals table)

**Step 1: Implement goals engine**

```typescript
import type { SleepSession } from '../providers/types';

export interface SleepGoal {
  type: 'duration' | 'bedtime' | 'score';
  target?: number;       // minutes for duration, score for score goal
  targetStart?: number;  // minutes from midnight for bedtime window start
  targetEnd?: number;    // minutes from midnight for bedtime window end
}

export interface GoalConfig {
  id: string;
  goals: SleepGoal[];
  createdAt: string;
}

export interface OptimalBedtime {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export function checkGoalMet(goal: SleepGoal, session: SleepSession): boolean {
  switch (goal.type) {
    case 'duration':
      return session.totalSleepTime >= (goal.target ?? 480);
    case 'score':
      return session.score.overall >= (goal.target ?? 75);
    case 'bedtime': {
      const h = session.startDate.getHours();
      const m = session.startDate.getMinutes();
      const bedtimeMin = h * 60 + m;
      const start = goal.targetStart ?? 22 * 60 + 30;
      const end = goal.targetEnd ?? 23 * 60;
      return bedtimeMin >= start && bedtimeMin <= end;
    }
    default:
      return false;
  }
}

export function computeStreak(goal: SleepGoal, sessions: SleepSession[]): number {
  const sorted = [...sessions].sort((a, b) => b.nightDate.localeCompare(a.nightDate));
  let streak = 0;
  for (const session of sorted) {
    if (checkGoalMet(goal, session)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function computeOptimalBedtime(sessions: SleepSession[]): OptimalBedtime | null {
  if (sessions.length < 7) return null;

  // Sort by score, take top third
  const sorted = [...sessions].sort((a, b) => b.score.overall - a.score.overall);
  const topCount = Math.max(3, Math.floor(sessions.length / 3));
  const topSessions = sorted.slice(0, topCount);

  // Get bedtimes in minutes (handling midnight crossing)
  const bedtimeMinutes = topSessions.map((s) => {
    const h = s.startDate.getHours();
    const m = s.startDate.getMinutes();
    return h < 12 ? h * 60 + m + 1440 : h * 60 + m;
  });

  bedtimeMinutes.sort((a, b) => a - b);
  const earliest = bedtimeMinutes[0] % 1440;
  const latest = bedtimeMinutes[bedtimeMinutes.length - 1] % 1440;

  return {
    startHour: Math.floor(earliest / 60),
    startMinute: earliest % 60,
    endHour: Math.floor(latest / 60),
    endMinute: latest % 60,
  };
}
```

**Step 2: Add goals table to DB**

In `sleep-viz/src/db/schema.ts`, bump version to 3 and add:

```typescript
goalConfigs!: Table<GoalConfig, string>;

// In version 3 stores:
goalConfigs: 'id',
```

**Step 3: Run tests**

Run: `cd sleep-viz && npx vitest run src/test/goals.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add sleep-viz/src/lib/goals.ts sleep-viz/src/db/schema.ts
git commit -m "feat: add sleep goals engine (PWA)"
```

---

### Task 13: PWA Goals UI

**Files:**
- Create: `sleep-viz/src/components/goals/GoalsView.tsx`
- Create: `sleep-viz/src/components/goals/StreakCalendar.tsx`
- Create: `sleep-viz/src/components/goals/GoalSettings.tsx`
- Modify: `sleep-viz/src/App.tsx` (add goals section)

**Step 1: Create StreakCalendar component**

A visual grid showing the last 30 nights as green (met) / red (missed) dots.

```tsx
import type { SleepSession } from '../../providers/types';
import type { SleepGoal } from '../../lib/goals';
import { checkGoalMet } from '../../lib/goals';

interface Props {
  sessions: SleepSession[];
  goal: SleepGoal;
}

export function StreakCalendar({ sessions, goal }: Props) {
  const last30 = sessions.slice(-30);
  const sessionMap = new Map(last30.map((s) => [s.nightDate, s]));

  // Generate last 30 dates
  const dates: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="grid grid-cols-10 gap-1.5">
      {dates.map((date) => {
        const session = sessionMap.get(date);
        const met = session ? checkGoalMet(goal, session) : null;
        return (
          <div
            key={date}
            className={`w-5 h-5 rounded-sm ${
              met === null
                ? 'bg-white/5'
                : met
                  ? 'bg-green-500/60'
                  : 'bg-red-500/40'
            }`}
            title={`${date}: ${met === null ? 'No data' : met ? 'Met' : 'Missed'}`}
          />
        );
      })}
    </div>
  );
}
```

**Step 2: Create GoalSettings component**

A simple form for setting duration target (hours), bedtime window (start/end), and score target.

```tsx
import { useState } from 'react';
import { Card } from '../layout/Card';
import type { SleepGoal } from '../../lib/goals';

interface Props {
  goals: SleepGoal[];
  onSave: (goals: SleepGoal[]) => void;
}

export function GoalSettings({ goals, onSave }: Props) {
  const durationGoal = goals.find((g) => g.type === 'duration');
  const bedtimeGoal = goals.find((g) => g.type === 'bedtime');
  const scoreGoal = goals.find((g) => g.type === 'score');

  const [durationHours, setDurationHours] = useState(
    durationGoal ? (durationGoal.target ?? 480) / 60 : 8
  );
  const [scoreTarget, setScoreTarget] = useState(scoreGoal?.target ?? 75);
  const [bedtimeStart, setBedtimeStart] = useState(
    bedtimeGoal?.targetStart ?? 22 * 60 + 30
  );
  const [bedtimeEnd, setBedtimeEnd] = useState(
    bedtimeGoal?.targetEnd ?? 23 * 60
  );

  function handleSave() {
    onSave([
      { type: 'duration', target: durationHours * 60 },
      { type: 'score', target: scoreTarget },
      { type: 'bedtime', targetStart: bedtimeStart, targetEnd: bedtimeEnd },
    ]);
  }

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-white/60 mb-4">Goal Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40">Sleep Duration Target</label>
          <input
            type="range"
            min={6}
            max={10}
            step={0.5}
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-sm text-white">{durationHours}h</span>
        </div>
        <div>
          <label className="text-xs text-white/40">Score Target</label>
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={scoreTarget}
            onChange={(e) => setScoreTarget(Number(e.target.value))}
            className="w-full mt-1"
          />
          <span className="text-sm text-white">{scoreTarget}+</span>
        </div>
        <div>
          <label className="text-xs text-white/40">Bedtime Window</label>
          <p className="text-sm text-white">{formatTime(bedtimeStart)} — {formatTime(bedtimeEnd)}</p>
        </div>
        <button
          onClick={handleSave}
          className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          Save Goals
        </button>
      </div>
    </Card>
  );
}
```

**Step 3: Create GoalsView**

```tsx
import { useState, useMemo } from 'react';
import { Section } from '../layout/Section';
import { Card } from '../layout/Card';
import { StreakCalendar } from './StreakCalendar';
import { GoalSettings } from './GoalSettings';
import { computeStreak, computeOptimalBedtime, type SleepGoal } from '../../lib/goals';
import type { SleepSession } from '../../providers/types';

interface Props {
  sessions: SleepSession[];
}

const DEFAULT_GOALS: SleepGoal[] = [
  { type: 'duration', target: 480 },
  { type: 'score', target: 75 },
  { type: 'bedtime', targetStart: 22 * 60 + 30, targetEnd: 23 * 60 },
];

export function GoalsView({ sessions }: Props) {
  const [goals, setGoals] = useState<SleepGoal[]>(DEFAULT_GOALS);

  const streaks = useMemo(
    () => goals.map((g) => ({ goal: g, streak: computeStreak(g, sessions) })),
    [goals, sessions]
  );

  const optimalBedtime = useMemo(
    () => computeOptimalBedtime(sessions),
    [sessions]
  );

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const goalLabels: Record<string, string> = {
    duration: 'Duration',
    score: 'Score',
    bedtime: 'Bedtime',
  };

  return (
    <Section title="Goals">
      {/* Streak Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {streaks.map(({ goal, streak }) => (
          <Card key={goal.type}>
            <p className="text-xs text-white/40">{goalLabels[goal.type]}</p>
            <p className="text-2xl font-bold text-white">{streak}</p>
            <p className="text-xs text-white/40">night streak</p>
          </Card>
        ))}
      </div>

      {/* Streak Calendar (primary goal) */}
      {goals[0] && (
        <Card>
          <h3 className="text-sm font-medium text-white/60 mb-3">
            {goalLabels[goals[0].type]} — Last 30 Nights
          </h3>
          <StreakCalendar sessions={sessions} goal={goals[0]} />
        </Card>
      )}

      {/* Optimal Bedtime */}
      {optimalBedtime && (
        <Card>
          <h3 className="text-sm font-medium text-white/60 mb-2">Optimal Bedtime</h3>
          <p className="text-lg font-bold text-amber-400">
            {formatTime(optimalBedtime.startHour, optimalBedtime.startMinute)} —{' '}
            {formatTime(optimalBedtime.endHour, optimalBedtime.endMinute)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            Based on your top-scoring nights from the last 30 days
          </p>
        </Card>
      )}

      {/* Goal Settings */}
      <div className="mt-6">
        <GoalSettings goals={goals} onSave={setGoals} />
      </div>
    </Section>
  );
}
```

**Step 4: Wire into App.tsx**

Add 'goals' section to App routing and render `<GoalsView sessions={sessions} />`.

**Step 5: Verify visually**

Run: `cd sleep-viz && npm run dev`
Expected: Goals tab shows streaks, calendar, optimal bedtime, and settings

**Step 6: Commit**

```bash
git add sleep-viz/src/components/goals/ sleep-viz/src/App.tsx
git commit -m "feat: add sleep goals and tracking UI (PWA)"
```

---

### Task 14: iOS — Coaching Tips Engine

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Services/CoachingEngine.swift`

**Step 1: Implement coaching engine in Swift**

```swift
import Foundation

struct CoachingTip: Identifiable {
    let id: String
    let title: String
    let message: String
    let priority: Int
    let type: TipType

    enum TipType {
        case warning, info, positive
    }
}

enum CoachingEngine {
    static func generateTips(sessions: [SleepSession]) -> [CoachingTip] {
        guard let latest = sessions.last else { return [] }
        var tips: [CoachingTip] = []

        let recent3 = Array(sessions.suffix(3))
        let recent7 = Array(sessions.suffix(7))

        // Low deep sleep
        if recent3.count >= 3, recent3.allSatisfy({ $0.stats.deepPercent < 15 }) {
            tips.append(CoachingTip(
                id: "low-deep-sleep",
                title: "Low Deep Sleep",
                message: "Your deep sleep has been below 15% for the past few nights. Try keeping your room cooler (65-68°F) and avoiding alcohol before bed.",
                priority: 1,
                type: .warning
            ))
        }

        // Low efficiency
        if latest.stats.sleepEfficiency < 85 {
            tips.append(CoachingTip(
                id: "low-efficiency",
                title: "Low Sleep Efficiency",
                message: "You're spending too much time awake in bed. Try going to bed only when you feel sleepy.",
                priority: 2,
                type: .warning
            ))
        }

        // High latency
        if latest.stats.sleepLatency > 30 {
            tips.append(CoachingTip(
                id: "high-latency",
                title: "Slow Sleep Onset",
                message: "You're taking over 30 minutes to fall asleep. Consider a wind-down routine 30 minutes before bed.",
                priority: 3,
                type: .warning
            ))
        }

        // Inconsistent bedtime
        if recent7.count >= 5 {
            let bedtimes = recent7.map { s -> Double in
                let h = Calendar.current.component(.hour, from: s.startDate)
                let m = Calendar.current.component(.minute, from: s.startDate)
                return Double(h < 12 ? h * 60 + m + 1440 : h * 60 + m)
            }
            let mean = bedtimes.reduce(0, +) / Double(bedtimes.count)
            let variance = bedtimes.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(bedtimes.count)
            if sqrt(variance) > 60 {
                tips.append(CoachingTip(
                    id: "inconsistent-bedtime",
                    title: "Inconsistent Bedtime",
                    message: "Your bedtime varies by over an hour. A consistent schedule helps your circadian rhythm.",
                    priority: 4,
                    type: .info
                ))
            }
        }

        // Declining trend
        if recent7.count >= 7 {
            let first3Avg = Double(recent7.prefix(3).reduce(0) { $0 + $1.score.overall }) / 3
            let last3Avg = Double(recent7.suffix(3).reduce(0) { $0 + $1.score.overall }) / 3
            if last3Avg < first3Avg - 10 {
                tips.append(CoachingTip(
                    id: "declining-trend",
                    title: "Sleep Quality Declining",
                    message: "Your sleep score has been trending down. Check if anything changed recently.",
                    priority: 2,
                    type: .warning
                ))
            }
        }

        // Excellent sleep
        if latest.score.overall >= 90 {
            tips.append(CoachingTip(
                id: "excellent-sleep",
                title: "Excellent Sleep!",
                message: "Great sleep last night! Whatever you did yesterday, keep it up.",
                priority: 10,
                type: .positive
            ))
        }

        return Array(tips.sorted { $0.priority < $1.priority }.prefix(3))
    }
}
```

**Step 2: Verify it compiles**

Run: Open Xcode, build the project (Cmd+B)
Expected: Build succeeds

**Step 3: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/CoachingEngine.swift
git commit -m "feat: add coaching tips engine (iOS)"
```

---

### Task 15: iOS — Coaching Tips UI

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Today/CoachingTipsCard.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/Today/TodayView.swift`

**Step 1: Create CoachingTipsCard view**

```swift
import SwiftUI

struct CoachingTipsCard: View {
    let tips: [CoachingTip]

    var body: some View {
        if !tips.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today's Tips")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))

                ForEach(tips) { tip in
                    HStack(alignment: .top, spacing: 12) {
                        tipIcon(tip.type)
                            .font(.system(size: 16))
                            .frame(width: 20)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(tip.title)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white)
                            Text(tip.message)
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.5))
                        }
                    }
                    .padding(12)
                    .background(AppTheme.cardBackground)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(AppTheme.cardBorder, lineWidth: 1)
                    )
                }
            }
        }
    }

    @ViewBuilder
    private func tipIcon(_ type: CoachingTip.TipType) -> some View {
        switch type {
        case .warning:
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
        case .info:
            Image(systemName: "lightbulb.fill")
                .foregroundColor(.blue)
        case .positive:
            Image(systemName: "star.fill")
                .foregroundColor(.green)
        }
    }
}
```

**Step 2: Add to TodayView**

In `TodayView.swift`, query recent sessions from SwiftData, call `CoachingEngine.generateTips(sessions:)`, and render `CoachingTipsCard(tips:)` below the existing content.

**Step 3: Build and verify**

Run: Xcode build (Cmd+B)
Expected: Build succeeds

**Step 4: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Views/Today/CoachingTipsCard.swift Amir-SleepApp/Amir-SleepApp/Views/Today/TodayView.swift
git commit -m "feat: add coaching tips UI to iOS TodayView"
```

---

### Task 16: iOS — Weekly/Monthly Reports

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Services/ReportEngine.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Reports/ReportsView.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Reports/ReportCard.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift` (add Reports tab)

**Step 1: Implement ReportEngine** — Port `generateWeeklyReport` and `generateMonthlyReport` from TypeScript to Swift, using the same algorithm. Include `SleepReport` struct with identical fields.

**Step 2: Create ReportCard view** — SwiftUI card showing avg score, duration, efficiency, best/worst nights, insights, and recommendations. Same layout as PWA ReportCard.

**Step 3: Create ReportsView** — SwiftUI view with a picker toggling between weekly/monthly, querying sessions from SwiftData.

**Step 4: Add Reports tab to MainTabView** — Add a new tab item with `Image(systemName: "chart.bar.doc.horizontal")` and label "Reports".

**Step 5: Build and verify**

Run: Xcode build (Cmd+B)
Expected: Build succeeds, Reports tab appears

**Step 6: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/ReportEngine.swift Amir-SleepApp/Amir-SleepApp/Views/Reports/ Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift
git commit -m "feat: add weekly/monthly reports (iOS)"
```

---

### Task 17: iOS — Sleep Goals & Tracking

**Files:**
- Create: `Amir-SleepApp/Amir-SleepApp/Services/GoalsEngine.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Models/GoalConfig.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Goals/GoalsView.swift`
- Create: `Amir-SleepApp/Amir-SleepApp/Views/Goals/StreakCalendar.swift`
- Modify: `Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift` (add Goals tab)

**Step 1: Create GoalConfig model** — SwiftData `@Model` with goal type, targets, and streak tracking.

**Step 2: Implement GoalsEngine** — Port `checkGoalMet`, `computeStreak`, and `computeOptimalBedtime` from TypeScript.

**Step 3: Create StreakCalendar** — SwiftUI view with a grid of colored circles for the last 30 nights.

**Step 4: Create GoalsView** — SwiftUI view showing streak cards, calendar, optimal bedtime, and goal settings form.

**Step 5: Add Goals tab** — In `MainTabView`, add tab with `Image(systemName: "target")`.

**Step 6: Build and verify**

Run: Xcode build (Cmd+B)
Expected: Build succeeds, Goals tab appears with streak calendar

**Step 7: Commit**

```bash
git add Amir-SleepApp/Amir-SleepApp/Services/GoalsEngine.swift Amir-SleepApp/Amir-SleepApp/Models/GoalConfig.swift Amir-SleepApp/Amir-SleepApp/Views/Goals/ Amir-SleepApp/Amir-SleepApp/Views/MainTabView.swift
git commit -m "feat: add sleep goals and tracking (iOS)"
```

---

### Task 18: PWA — Run All Tests and Final Verification

**Files:** None (verification only)

**Step 1: Run all PWA tests**

Run: `cd sleep-viz && npx vitest run`
Expected: All tests pass (sleepScore, statistics, sleepSessions, deduplication, readinessScore, coachingTips, reports, goals)

**Step 2: Run type check**

Run: `cd sleep-viz && npx tsc --noEmit`
Expected: No type errors

**Step 3: Run lint**

Run: `cd sleep-viz && npm run lint`
Expected: Clean

**Step 4: Build for production**

Run: `cd sleep-viz && npm run build`
Expected: Successful build with no errors

**Step 5: Commit any fixes if needed**

---

### Task 19: Final Integration Commit

**Step 1: Verify all changes**

Run: `git status`

**Step 2: Create final commit if there are loose changes**

```bash
git add -A
git commit -m "chore: final polish and integration fixes"
```
