// Exclude companies filter
import type { JobData, FilterResult } from '../../types';
import { normalizeCompanyName } from '../../lib/utils';

export function filterExcludeCompanies(
  job: JobData,
  companies: string[]
): FilterResult {
  if (companies.length === 0) {
    return { passed: true, reason: null };
  }

  const normalizedJobCompany = job.companyNormalized;
  const normalizedBlocklist = companies.map(c => normalizeCompanyName(c));

  const matchedCompany = normalizedBlocklist.find(blocked =>
    normalizedJobCompany.includes(blocked) || blocked.includes(normalizedJobCompany)
  );

  const passed = !matchedCompany;

  return {
    passed,
    reason: passed
      ? null
      : `Company "${job.company}" is in blocklist`,
  };
}
