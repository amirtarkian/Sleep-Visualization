/**
 * Goals engine — checks whether sessions meet configured goals
 * and computes streaks and optimal bedtime.
 */

import type { SleepSession } from '../providers/types';

export interface SleepGoalsConfig {
  durationTargetMin: number; // default 480
  scoreTarget: number; // default 75
  bedtimeStartMin: number; // default 1350 (22:30)
  bedtimeEndMin: number; // default 1380 (23:00)
}

export const DEFAULT_GOALS: SleepGoalsConfig = {
  durationTargetMin: 480,
  scoreTarget: 75,
  bedtimeStartMin: 1350,
  bedtimeEndMin: 1380,
};

/**
 * Check whether a session meets the duration goal.
 */
export function checkDurationGoalMet(session: SleepSession, target: number): boolean {
  return session.totalSleepTime >= target;
}

/**
 * Check whether a session meets the score goal.
 */
export function checkScoreGoalMet(session: SleepSession, target: number): boolean {
  return session.score.overall >= target;
}

/**
 * Check whether a session's bedtime falls within the target window.
 * startMin/endMin are minutes from midnight (0-1439 for same day, can exceed 1440 for next day).
 */
export function checkBedtimeGoalMet(
  session: SleepSession,
  startMin: number,
  endMin: number
): boolean {
  const start = session.startDate;
  const hours = start.getHours();
  const minutes = start.getMinutes();
  // Convert to minutes from midnight — but normalize to evening range
  // If start hour is before noon, it means early morning next day
  let bedtimeMin = hours * 60 + minutes;
  if (hours < 12) {
    bedtimeMin += 1440; // next day
  }
  return bedtimeMin >= startMin && bedtimeMin <= endMin;
}

/**
 * Compute the current streak of consecutive nights passing the check function.
 * Sessions must be sorted chronologically (oldest first).
 */
export function computeStreak(
  sessions: SleepSession[],
  check: (s: SleepSession) => boolean
): number {
  let streak = 0;
  // Work backwards from most recent
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (check(sessions[i])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Compute the optimal bedtime window based on the best-scoring sessions.
 * Returns the average bedtime range of the top-scoring nights, or null if insufficient data.
 */
export function computeOptimalBedtime(
  sessions: SleepSession[]
): { startHour: number; startMin: number; endHour: number; endMin: number } | null {
  if (sessions.length < 3) return null;

  // Sort by score descending, take top 30%
  const sorted = [...sessions].sort((a, b) => b.score.overall - a.score.overall);
  const topCount = Math.max(3, Math.ceil(sessions.length * 0.3));
  const topSessions = sorted.slice(0, topCount);

  // Get bedtime minutes for each (normalized to evening range)
  const bedtimeMinutes = topSessions.map(s => {
    const hours = s.startDate.getHours();
    const mins = s.startDate.getMinutes();
    // Normalize: before noon = next day
    return hours < 12 ? (hours + 24) * 60 + mins : hours * 60 + mins;
  });

  const avgBedtime = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length;

  // Window: -15 to +15 minutes around the average
  const startTotalMin = Math.round(avgBedtime - 15);
  const endTotalMin = Math.round(avgBedtime + 15);

  return {
    startHour: Math.floor(startTotalMin / 60) % 24,
    startMin: startTotalMin % 60,
    endHour: Math.floor(endTotalMin / 60) % 24,
    endMin: endTotalMin % 60,
  };
}

/**
 * Format minutes-from-midnight to a human-readable time string (12-hour format).
 */
export function formatTimeFromMinutes(totalMinutes: number): string {
  const normalizedMin = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMin / 60);
  const mins = normalizedMin % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`;
}
