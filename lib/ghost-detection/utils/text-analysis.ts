/**
 * Text Analysis Utilities
 * Functions for analyzing job posting content
 */

import {
  CONTENT_THRESHOLDS,
  KNOWN_STAFFING_AGENCIES,
} from '../core/constants';
import type { SalaryInfo, StaffingAgencyResult } from '../core/types';

/**
 * Calculate vagueness score for job description text
 * @returns 0-1 score where higher = more vague
 */
export function calculateVaguenessScore(text: string): number {
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/);

  if (words.length === 0) return 1;

  // Count vague indicators
  let vagueCount = 0;
  for (const indicator of CONTENT_THRESHOLDS.vaguenessIndicators) {
    const regex = new RegExp(indicator.toLowerCase(), 'gi');
    const matches = normalized.match(regex);
    if (matches) vagueCount += matches.length;
  }

  // Count legitimacy indicators (reduce vagueness score)
  let legitCount = 0;
  for (const indicator of CONTENT_THRESHOLDS.legitimacyIndicators) {
    if (normalized.includes(indicator.toLowerCase())) legitCount++;
  }

  // Calculate ratio (normalize by word count)
  const vagueRatio = vagueCount / Math.max(words.length / 100, 1);
  const legitBonus = Math.min(legitCount * 0.1, 0.5);

  return Math.max(0, Math.min(1, vagueRatio - legitBonus));
}

/**
 * Calculate buzzword density in text
 * @returns 0-1 score where higher = more buzzwords
 */
export function calculateBuzzwordDensity(text: string): number {
  const buzzwords = [
    'synergy',
    'leverage',
    'paradigm',
    'disrupt',
    'innovative',
    'cutting-edge',
    'best-in-class',
    'world-class',
    'game-changing',
    'revolutionary',
    'scalable',
    'holistic',
    'ecosystem',
    'bandwidth',
    'pivot',
    'ideate',
    'optimize',
    'streamline',
  ];

  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).length;

  let buzzCount = 0;
  for (const buzz of buzzwords) {
    const matches = normalized.match(new RegExp(`\\b${buzz}\\b`, 'gi'));
    if (matches) buzzCount += matches.length;
  }

  return Math.min(
    1,
    (buzzCount / words) * 100 / CONTENT_THRESHOLDS.maxBuzzwordPercentage
  );
}

/**
 * Extract salary information from job text
 */
export function extractSalaryInfo(text: string): SalaryInfo {
  const result: SalaryInfo = {
    hasSalary: false,
    isVague: false,
    salaryRange: undefined,
  };

  // Check for vague salary patterns
  if (
    /competitive (salary|compensation|pay)/i.test(text) ||
    /salary:?\s*(doe|dbo|commensurate|negotiable)/i.test(text)
  ) {
    result.isVague = true;
  }

  // Extract salary range patterns
  const rangeMatch = text.match(/\$([\d,]+)\s*[-–to]+\s*\$?([\d,]+)/i);
  const kMatch = text.match(/([\d]+)k\s*[-–to]+\s*([\d]+)k/i);
  const perHourMatch = text.match(/\$([\d.]+)\s*[-–to]+\s*\$?([\d.]+)\s*(per\s*hour|\/hr|hourly)/i);

  if (rangeMatch) {
    result.hasSalary = true;
    result.salaryRange = {
      min: parseInt(rangeMatch[1].replace(/,/g, '')),
      max: parseInt(rangeMatch[2].replace(/,/g, '')),
    };
  } else if (kMatch) {
    result.hasSalary = true;
    result.salaryRange = {
      min: parseInt(kMatch[1]) * 1000,
      max: parseInt(kMatch[2]) * 1000,
    };
  } else if (perHourMatch) {
    result.hasSalary = true;
    // Convert hourly to annual (assuming 40hr/week, 52 weeks)
    result.salaryRange = {
      min: Math.round(parseFloat(perHourMatch[1]) * 40 * 52),
      max: Math.round(parseFloat(perHourMatch[2]) * 40 * 52),
    };
  }

  return result;
}

/**
 * Normalize company name for comparison
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(
      /(inc|llc|ltd|corp|corporation|company|co|group|solutions|services)$/g,
      ''
    )
    .trim();
}

/**
 * Check if company is likely a staffing agency
 */
export function isLikelyStaffingAgency(
  companyName: string
): StaffingAgencyResult {
  const normalized = normalizeCompanyName(companyName);
  const indicators: string[] = [];
  let score = 0;

  // Check against known staffing agencies
  for (const agency of KNOWN_STAFFING_AGENCIES) {
    if (normalized.includes(normalizeCompanyName(agency))) {
      return {
        isLikely: true,
        confidence: 0.95,
        matchedIndicators: [`Known agency: ${agency}`],
      };
    }
  }

  // Check for staffing-related keywords
  const staffingIndicators = [
    'staffing',
    'recruiting',
    'talent',
    'solutions',
    'consulting',
    'partners',
    'workforce',
    'placement',
    'personnel',
  ];

  for (const ind of staffingIndicators) {
    if (normalized.includes(ind)) {
      indicators.push(ind);
      score += 0.2;
    }
  }

  return {
    isLikely: score >= 0.3,
    confidence: Math.min(0.9, score),
    matchedIndicators: indicators,
  };
}

/**
 * Check description length adequacy
 * @returns 0-1 score where higher = inadequate length
 */
export function checkDescriptionLength(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const minWords = CONTENT_THRESHOLDS.minDescriptionLength / 5; // Approximate words

  if (wordCount >= minWords * 2) return 0;
  if (wordCount >= minWords) return 0.2;
  if (wordCount >= minWords / 2) return 0.5;
  return 0.8;
}

/**
 * Extract requirements from job description
 */
export function extractRequirements(text: string): {
  yearsExperience: number | null;
  hasUnrealisticRequirements: boolean;
  requirementCount: number;
} {
  // Extract years of experience
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
  const yearsExperience = yearsMatch ? parseInt(yearsMatch[1]) : null;

  // Check for unrealistic combinations
  const hasUnrealistic =
    (yearsExperience !== null && yearsExperience > 10) ||
    /entry.level.+10\+?\s*years/i.test(text) ||
    /junior.+senior/i.test(text);

  // Count bullet points / requirements
  const bulletMatches = text.match(/[•\-\*]\s*\w/g);
  const requirementCount = bulletMatches?.length || 0;

  return {
    yearsExperience,
    hasUnrealisticRequirements: hasUnrealistic,
    requirementCount,
  };
}
