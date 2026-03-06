/**
 * Coaching tips engine — mirrors the iOS CoachingEngine logic.
 * Analyzes recent sleep sessions and generates actionable tips.
 */

import type { SleepSession } from '../providers/types';

export interface CoachingTip {
  id: string;
  title: string;
  message: string;
  priority: number;
  type: 'warning' | 'info' | 'positive';
}

/**
 * Generate coaching tips from recent sleep sessions.
 * Returns at most 3 tips sorted by priority (lower number = higher priority).
 */
export function generateTips(sessions: SleepSession[]): CoachingTip[] {
  if (sessions.length === 0) return [];

  const tips: CoachingTip[] = [];

  // Use most recent sessions for analysis
  const recent = sessions.slice(-7);

  // 1. Deep sleep < 10% for 3+ nights → warning
  const lowDeepNights = recent.filter(s => s.deepPercent < 10);
  if (lowDeepNights.length >= 3) {
    tips.push({
      id: 'low-deep-sleep',
      title: 'Low Deep Sleep',
      message:
        'Your deep sleep has been under 10% for the last few nights. Try avoiding alcohol and keeping your bedroom cool (65-68F) to improve deep sleep.',
      priority: 1,
      type: 'warning',
    });
  }

  // 2. Efficiency < 85% → warning
  const latestEfficiency = recent[recent.length - 1].sleepEfficiency;
  if (latestEfficiency < 85) {
    tips.push({
      id: 'low-efficiency',
      title: 'Sleep Efficiency Below Target',
      message:
        `Your last sleep efficiency was ${Math.round(latestEfficiency)}%. Try limiting time in bed to when you're actually sleepy, and avoid screens 30 minutes before bed.`,
      priority: 2,
      type: 'warning',
    });
  }

  // 3. Latency > 30 min → warning
  const latestLatency = recent[recent.length - 1].sleepLatency;
  if (latestLatency > 30) {
    tips.push({
      id: 'high-latency',
      title: 'Taking Too Long to Fall Asleep',
      message:
        `It took you ${Math.round(latestLatency)} minutes to fall asleep. Consider a wind-down routine, limit caffeine after 2 PM, and try relaxation techniques.`,
      priority: 2,
      type: 'warning',
    });
  }

  // 4. Latency < 5 min → sleep debt warning
  if (latestLatency < 5) {
    tips.push({
      id: 'sleep-debt',
      title: 'Possible Sleep Debt',
      message:
        'Falling asleep in under 5 minutes can indicate accumulated sleep debt. Try to get an extra 30-60 minutes of sleep over the next few nights.',
      priority: 3,
      type: 'warning',
    });
  }

  // 5. Inconsistent bedtime (stddev > 60 min over 5+ nights) → info
  if (recent.length >= 5) {
    const bedtimeMinutes = recent.map(s => {
      const start = s.startDate;
      // Minutes from midnight (can be negative for before midnight)
      const hours = start.getHours();
      const minutes = start.getMinutes();
      // Normalize: hours after noon are "today evening", before noon are "next morning"
      return hours >= 12 ? (hours - 24) * 60 + minutes : hours * 60 + minutes;
    });
    const mean = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length;
    const variance =
      bedtimeMinutes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / bedtimeMinutes.length;
    const stddev = Math.sqrt(variance);

    if (stddev > 60) {
      tips.push({
        id: 'inconsistent-bedtime',
        title: 'Inconsistent Bedtime',
        message:
          'Your bedtime varies by more than an hour. A consistent sleep schedule helps regulate your circadian rhythm and improves sleep quality.',
        priority: 4,
        type: 'info',
      });
    }
  }

  // 6. Declining trend (7-day, first 3 vs last 3, drop > 10) → warning
  if (recent.length >= 6) {
    const first3Avg =
      recent.slice(0, 3).reduce((sum, s) => sum + s.score.overall, 0) / 3;
    const last3Avg =
      recent.slice(-3).reduce((sum, s) => sum + s.score.overall, 0) / 3;

    if (first3Avg - last3Avg > 10) {
      tips.push({
        id: 'declining-trend',
        title: 'Sleep Quality Declining',
        message:
          'Your sleep scores have dropped over the past week. Review recent changes to your routine — stress, diet, exercise timing, or screen time could be factors.',
        priority: 1,
        type: 'warning',
      });
    }
  }

  // 7. Score >= 85 → positive
  const latestScore = recent[recent.length - 1].score.overall;
  if (latestScore >= 85) {
    tips.push({
      id: 'great-score',
      title: 'Excellent Sleep!',
      message:
        `Your sleep score of ${latestScore} is outstanding. Keep up your current routine — it's clearly working well for you.`,
      priority: 10,
      type: 'positive',
    });
  }

  // Sort by priority (ascending) and return max 3
  tips.sort((a, b) => a.priority - b.priority);
  return tips.slice(0, 3);
}
