/**
 * Report generation engine.
 * Generates weekly and monthly sleep reports from session data.
 */

import type { SleepSession } from '../providers/types';

export interface WeeklyBreakdownEntry {
  weekLabel: string;
  avgScore: number;
  avgDuration: number;
  nightCount: number;
}

export interface SleepReport {
  avgScore: number;
  avgDuration: number;
  bestNight: SleepSession | null;
  worstNight: SleepSession | null;
  trendDirection: 'improving' | 'declining' | 'stable';
  insights: string[];
  recommendations: string[];
  weeklyBreakdown: WeeklyBreakdownEntry[];
}

function computeTrendDirection(sessions: SleepSession[]): 'improving' | 'declining' | 'stable' {
  if (sessions.length < 4) return 'stable';
  const half = Math.floor(sessions.length / 2);
  const firstHalf = sessions.slice(0, half);
  const secondHalf = sessions.slice(half);

  const firstAvg = firstHalf.reduce((s, n) => s + n.score.overall, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, n) => s + n.score.overall, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

function generateInsights(sessions: SleepSession[]): string[] {
  if (sessions.length === 0) return [];
  const insights: string[] = [];

  const avgScore = sessions.reduce((s, n) => s + n.score.overall, 0) / sessions.length;
  const avgDuration = sessions.reduce((s, n) => s + n.totalSleepTime, 0) / sessions.length;
  const avgEfficiency = sessions.reduce((s, n) => s + n.sleepEfficiency, 0) / sessions.length;
  const avgDeep = sessions.reduce((s, n) => s + n.deepPercent, 0) / sessions.length;

  if (avgScore >= 85) {
    insights.push('Your average sleep score is excellent, indicating consistently high-quality sleep.');
  } else if (avgScore >= 70) {
    insights.push('Your average sleep score is good — there is room for improvement in specific areas.');
  } else {
    insights.push('Your average sleep score suggests significant room for improvement.');
  }

  if (avgDuration < 420) {
    insights.push(`You averaged ${formatDuration(avgDuration)} of sleep, which is below the recommended 7-9 hours.`);
  } else if (avgDuration >= 420 && avgDuration <= 540) {
    insights.push(`You averaged ${formatDuration(avgDuration)} of sleep, within the recommended range.`);
  }

  if (avgEfficiency < 85) {
    insights.push(`Sleep efficiency averaged ${Math.round(avgEfficiency)}%, below the 85% target.`);
  }

  if (avgDeep < 13) {
    insights.push('Deep sleep percentage is below the typical 13-23% range.');
  } else if (avgDeep > 23) {
    insights.push('Deep sleep percentage is above average, which is a positive sign for physical recovery.');
  }

  return insights;
}

function generateRecommendations(sessions: SleepSession[]): string[] {
  if (sessions.length === 0) return [];
  const recs: string[] = [];

  const avgDuration = sessions.reduce((s, n) => s + n.totalSleepTime, 0) / sessions.length;
  const avgEfficiency = sessions.reduce((s, n) => s + n.sleepEfficiency, 0) / sessions.length;
  const avgLatency = sessions.reduce((s, n) => s + n.sleepLatency, 0) / sessions.length;
  const avgDeep = sessions.reduce((s, n) => s + n.deepPercent, 0) / sessions.length;

  if (avgDuration < 420) {
    recs.push('Try going to bed 30 minutes earlier to increase total sleep time.');
  }

  if (avgEfficiency < 85) {
    recs.push('Limit activities in bed to sleep only. If you cannot sleep within 20 minutes, get up briefly.');
  }

  if (avgLatency > 20) {
    recs.push('Establish a consistent wind-down routine 30-60 minutes before bed.');
  }

  if (avgDeep < 13) {
    recs.push('Exercise regularly (but not within 3 hours of bedtime) to promote deeper sleep.');
  }

  if (recs.length === 0) {
    recs.push('Maintain your current sleep habits — your metrics are looking healthy.');
  }

  return recs;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function getWeeklyBreakdown(sessions: SleepSession[]): WeeklyBreakdownEntry[] {
  if (sessions.length === 0) return [];

  // Group sessions by ISO week
  const weekMap = new Map<string, SleepSession[]>();

  for (const session of sessions) {
    const date = new Date(session.nightDate + 'T00:00:00');
    const weekStart = new Date(date);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday-based week
    weekStart.setDate(date.getDate() + diff);
    const key = weekStart.toISOString().slice(0, 10);

    if (!weekMap.has(key)) {
      weekMap.set(key, []);
    }
    weekMap.get(key)!.push(session);
  }

  const entries: WeeklyBreakdownEntry[] = [];
  const sortedKeys = Array.from(weekMap.keys()).sort();

  for (const key of sortedKeys) {
    const weekSessions = weekMap.get(key)!;
    const avgScore = weekSessions.reduce((s, n) => s + n.score.overall, 0) / weekSessions.length;
    const avgDuration = weekSessions.reduce((s, n) => s + n.totalSleepTime, 0) / weekSessions.length;

    // Format week label as "Mon DD - Mon DD"
    const start = new Date(key + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekLabel = `${fmt(start)} - ${fmt(end)}`;

    entries.push({
      weekLabel,
      avgScore: Math.round(avgScore),
      avgDuration: Math.round(avgDuration),
      nightCount: weekSessions.length,
    });
  }

  return entries;
}

export function generateWeeklyReport(sessions: SleepSession[]): SleepReport {
  // Use last 7 days of sessions
  const recent = sessions.slice(-7);
  return buildReport(recent);
}

export function generateMonthlyReport(sessions: SleepSession[]): SleepReport {
  // Use last 30 days of sessions
  const recent = sessions.slice(-30);
  return buildReport(recent);
}

function buildReport(sessions: SleepSession[]): SleepReport {
  if (sessions.length === 0) {
    return {
      avgScore: 0,
      avgDuration: 0,
      bestNight: null,
      worstNight: null,
      trendDirection: 'stable',
      insights: [],
      recommendations: [],
      weeklyBreakdown: [],
    };
  }

  const avgScore = Math.round(
    sessions.reduce((s, n) => s + n.score.overall, 0) / sessions.length
  );
  const avgDuration = Math.round(
    sessions.reduce((s, n) => s + n.totalSleepTime, 0) / sessions.length
  );

  const sorted = [...sessions].sort((a, b) => a.score.overall - b.score.overall);
  const worstNight = sorted[0];
  const bestNight = sorted[sorted.length - 1];

  return {
    avgScore,
    avgDuration,
    bestNight,
    worstNight,
    trendDirection: computeTrendDirection(sessions),
    insights: generateInsights(sessions),
    recommendations: generateRecommendations(sessions),
    weeklyBreakdown: getWeeklyBreakdown(sessions),
  };
}
