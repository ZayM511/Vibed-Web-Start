// Include keywords filter
import type { JobData, FilterResult } from '../../types';

export function filterIncludeKeywords(
  job: JobData,
  keywords: string[],
  matchMode: 'any' | 'all'
): FilterResult {
  if (keywords.length === 0) {
    return { passed: true, reason: null };
  }

  const searchText = `${job.title} ${job.description}`.toLowerCase();
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (normalizedKeyword && searchText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
    } else if (normalizedKeyword) {
      missingKeywords.push(keyword);
    }
  }

  const passed = matchMode === 'any'
    ? matchedKeywords.length > 0
    : missingKeywords.length === 0;

  return {
    passed,
    reason: passed
      ? null
      : matchMode === 'any'
        ? `Missing all keywords: ${keywords.join(', ')}`
        : `Missing required keywords: ${missingKeywords.join(', ')}`,
    matchedKeywords,
    missingKeywords,
  };
}
