/**
 * Date Utilities
 * Functions for parsing and analyzing job posting dates
 */

import { TEMPORAL_THRESHOLDS } from '../core/constants';

/**
 * Parse various date string formats from job postings
 */
export function parsePostingDate(dateString: string | null): Date | null {
  if (!dateString) return null;

  const normalized = dateString.toLowerCase().trim();
  const now = new Date();

  // Define patterns and their calculations
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => Date]> = [
    [/just now|moments? ago/i, () => now],
    [
      /(\d+)\s*minutes?\s*ago/i,
      (m) => new Date(now.getTime() - parseInt(m[1]) * 60 * 1000),
    ],
    [
      /(\d+)\s*hours?\s*ago/i,
      (m) => new Date(now.getTime() - parseInt(m[1]) * 3600 * 1000),
    ],
    [
      /(\d+)\s*days?\s*ago/i,
      (m) => new Date(now.getTime() - parseInt(m[1]) * 86400 * 1000),
    ],
    [
      /(\d+)\s*weeks?\s*ago/i,
      (m) => new Date(now.getTime() - parseInt(m[1]) * 7 * 86400 * 1000),
    ],
    [
      /(\d+)\s*months?\s*ago/i,
      (m) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - parseInt(m[1]));
        return d;
      },
    ],
    [/today/i, () => now],
    [
      /yesterday/i,
      () => new Date(now.getTime() - 86400 * 1000),
    ],
  ];

  // Try each pattern
  for (const [pattern, calc] of patterns) {
    const match = normalized.match(pattern);
    if (match) return calc(match);
  }

  // Try parsing as a standard date
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculate days since job was posted
 */
export function daysSincePosted(
  postedDate: Date | string | null
): number | null {
  if (!postedDate) return null;

  const date =
    typeof postedDate === 'string' ? parsePostingDate(postedDate) : postedDate;

  if (!date) return null;

  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

/**
 * Calculate temporal risk score based on posting age
 * @returns 0-1 score where higher = more risk
 */
export function calculateTemporalRisk(days: number | null): number {
  if (days === null) return 0.5; // Unknown date = medium risk

  const { freshPost, normalPost, stalePost, veryStalePost } =
    TEMPORAL_THRESHOLDS;

  if (days <= freshPost) return 0;
  if (days <= normalPost) return 0.2;
  if (days <= stalePost) return 0.5;
  if (days <= veryStalePost) return 0.75;
  return 1;
}

/**
 * Check if currently in ghost job peak period (Q1/Q4)
 */
export function isGhostPeakPeriod(): boolean {
  const currentMonth = new Date().getMonth() + 1;
  return (TEMPORAL_THRESHOLDS.ghostPeakMonths as readonly number[]).includes(
    currentMonth
  );
}

/**
 * Get human-readable posting age string
 */
export function getPostingAgeString(days: number | null): string {
  if (days === null) return 'Unknown';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Check if job posting has been reposted frequently
 */
export function detectReposting(
  postingHistory: Date[]
): { isReposted: boolean; repostCount: number; avgInterval: number } {
  if (postingHistory.length < 2) {
    return { isReposted: false, repostCount: 0, avgInterval: 0 };
  }

  const sorted = [...postingHistory].sort((a, b) => a.getTime() - b.getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const daysBetween = Math.floor(
      (sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000
    );
    intervals.push(daysBetween);
  }

  const avgInterval =
    intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  const repostCount = intervals.filter(
    (i) => i < TEMPORAL_THRESHOLDS.minRepostInterval
  ).length;

  return {
    isReposted: repostCount >= TEMPORAL_THRESHOLDS.maxRepostsBeforeFlag,
    repostCount: postingHistory.length - 1,
    avgInterval,
  };
}

/**
 * Get the quarter of the year for a date
 */
export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Check if date is within business hours (basic check)
 */
export function isBusinessHours(date: Date): boolean {
  const hours = date.getHours();
  const day = date.getDay();
  return day >= 1 && day <= 5 && hours >= 8 && hours <= 18;
}
