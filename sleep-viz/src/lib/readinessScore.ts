/**
 * Display helpers for readiness scores.
 * Scoring is done on iOS; the PWA only displays.
 */

export type ReadinessLabel = 'Excellent' | 'Good' | 'Fair' | 'Low';

export function getReadinessLabel(score: number): ReadinessLabel {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Low';
}

export function getReadinessColor(score: number): string {
  if (score >= 85) return '#22c55e'; // green-500
  if (score >= 70) return '#eab308'; // yellow-500
  if (score >= 55) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}
