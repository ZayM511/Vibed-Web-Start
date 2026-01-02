import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/gi, '')
    .trim();
}

/**
 * Parse relative date strings from job postings
 * @param dateString - e.g., "2 days ago", "3 weeks ago", "Just now"
 * @returns Date object or null if unparseable
 */
export function parseRelativeDate(dateString: string | null): Date | null {
  if (!dateString) return null;

  const normalized = dateString.toLowerCase().trim();
  const now = new Date();

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => Date]> = [
    [/just now|moments? ago|posted today/i, () => now],
    [/(\d+)\s*minutes?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 60 * 1000)],
    [/(\d+)\s*hours?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 3600 * 1000)],
    [/(\d+)\s*days?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 86400 * 1000)],
    [/(\d+)\s*weeks?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 7 * 86400 * 1000)],
    [/(\d+)\s*months?\s*ago/i, (m) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - parseInt(m[1]));
      return d;
    }],
    [/today/i, () => now],
    [/yesterday/i, () => new Date(now.getTime() - 86400 * 1000)],
  ];

  for (const [pattern, calc] of patterns) {
    const match = normalized.match(pattern);
    if (match) return calc(match);
  }

  // Try parsing as a standard date
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculate days since a given date
 * @param date - Date object or null
 * @returns Number of days since the date, or null if date is invalid
 */
export function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

/**
 * Generate a unique ID for local storage items
 * @returns A unique ID string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
