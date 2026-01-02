// Utility functions
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(inc|llc|ltd|corp|company|group|solutions|services|staffing|recruiting)$/g, '')
    .trim();
}

export function parseRelativeDate(dateString: string | null): Date | null {
  if (!dateString) return null;

  const normalized = dateString.toLowerCase().trim();
  const now = new Date();

  const patterns: [RegExp, (m: RegExpMatchArray) => Date][] = [
    [/just now|just posted/i, () => now],
    [/(\d+)\s*minutes?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 60000)],
    [/(\d+)\s*hours?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 3600000)],
    [/(\d+)\s*days?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 86400000)],
    [/(\d+)\s*weeks?\s*ago/i, (m) => new Date(now.getTime() - parseInt(m[1]) * 604800000)],
    [/(\d+)\s*months?\s*ago/i, (m) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - parseInt(m[1]));
      return d;
    }],
  ];

  for (const [pattern, calc] of patterns) {
    const match = normalized.match(pattern);
    if (match) return calc(match);
  }

  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const daysSince = (date: Date | null): number | null =>
  date ? Math.floor((Date.now() - date.getTime()) / 86400000) : null;

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
