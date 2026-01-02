// Exclude keywords filter
import type { JobData, FilterResult } from '../../types';

export function filterExcludeKeywords(
  job: JobData,
  keywords: string[]
): FilterResult {
  if (keywords.length === 0) {
    return { passed: true, reason: null };
  }

  const searchText = `${job.title} ${job.description}`.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (normalizedKeyword && searchText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
    }
  }

  const passed = matchedKeywords.length === 0;

  return {
    passed,
    reason: passed
      ? null
      : `Contains excluded keywords: ${matchedKeywords.join(', ')}`,
    matchedKeywords,
  };
}
