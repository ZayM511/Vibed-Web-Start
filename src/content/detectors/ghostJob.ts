import type { JobData, DetectionResult } from '@/types';

// Days thresholds for ghost job detection
const GHOST_THRESHOLDS = {
  HIGH_RISK: 60,
  MEDIUM_RISK: 30,
  LOW_RISK: 14
};

// Vague description patterns (high confidence signals)
const VAGUE_PATTERNS = [
  { pattern: /competitive (salary|compensation|pay)/i, weight: 0.3, desc: 'Vague salary' },
  { pattern: /salary (commensurate|depending|based|negotiable)/i, weight: 0.3, desc: 'Undisclosed salary' },
  { pattern: /various (responsibilities|duties|tasks)/i, weight: 0.4, desc: 'Vague duties' },
  { pattern: /flexible (requirements|qualifications)/i, weight: 0.35, desc: 'Flexible requirements' },
  { pattern: /fast[- ]paced environment/i, weight: 0.2, desc: 'Generic filler phrase' },
  { pattern: /rockstar|ninja|guru/i, weight: 0.4, desc: 'Buzzword title' }
];

// Reposting patterns (indicates cycling ghost job)
const REPOST_PATTERNS = [
  { pattern: /re-?post(ed|ing)?/i, weight: 0.7, desc: 'Explicit repost' },
  { pattern: /still (looking|searching|hiring)/i, weight: 0.5, desc: 'Still searching' },
  { pattern: /position (remains|still) open/i, weight: 0.6, desc: 'Position remains open' }
];

// Excessive requirements (unrealistic expectations)
const EXCESSIVE_REQUIREMENT_PATTERNS = [
  { pattern: /\b(15|20)\+?\s*years?\s*(of\s+)?experience/i, weight: 0.6, desc: 'Excessive experience requirement' },
  { pattern: /must\s+have\s+[a-z,\s]+and\s+[a-z,\s]+and\s+[a-z,\s]+and/i, weight: 0.4, desc: 'Excessive requirements' },
  { pattern: /entry[- ]level.{0,30}(5|6|7|8|9|10)\+?\s*years?/i, weight: 0.8, desc: 'Entry-level with senior requirements' }
];

// Low applicant count relative to posting age (indicates fake posting)
const APPLICANT_THRESHOLDS = {
  OLD_POST_LOW_APPLICANTS: { days: 30, maxApplicants: 10, weight: 0.7 },
  VERY_OLD_LOW_APPLICANTS: { days: 60, maxApplicants: 25, weight: 0.8 }
};

function parsePostedDate(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;

  const text = dateStr.toLowerCase().trim();

  // Handle "X days/weeks/months ago" format
  const agoMatch = text.match(/(\d+)\s*(day|week|month|hour|minute)s?\s*ago/i);
  if (agoMatch) {
    const num = parseInt(agoMatch[1]);
    const unit = agoMatch[2].toLowerCase();
    switch (unit) {
      case 'minute': return 0;
      case 'hour': return 0;
      case 'day': return num;
      case 'week': return num * 7;
      case 'month': return num * 30;
    }
  }

  // Handle "Posted X days ago"
  if (text.includes('today') || text.includes('just now')) return 0;
  if (text.includes('yesterday')) return 1;

  // Handle "30+ days ago"
  const plusMatch = text.match(/(\d+)\+/);
  if (plusMatch) return parseInt(plusMatch[1]);

  return null;
}

export class GhostJobDetector {
  analyze(job: JobData): DetectionResult {
    const signals: { type: string; weight: number; desc: string }[] = [];

    // 1. Check posting age
    const daysPosted = parsePostedDate(job.postedDate);
    if (daysPosted !== null) {
      if (daysPosted >= GHOST_THRESHOLDS.HIGH_RISK) {
        signals.push({ type: 'age', weight: 0.8, desc: `Posted ${daysPosted}+ days ago` });
      } else if (daysPosted >= GHOST_THRESHOLDS.MEDIUM_RISK) {
        signals.push({ type: 'age', weight: 0.5, desc: `Posted ${daysPosted} days ago` });
      } else if (daysPosted >= GHOST_THRESHOLDS.LOW_RISK) {
        signals.push({ type: 'age', weight: 0.25, desc: `Posted ${daysPosted} days ago` });
      }
    }

    // 2. Check for vague patterns
    const desc = job.description.toLowerCase();
    for (const { pattern, weight, desc: description } of VAGUE_PATTERNS) {
      if (pattern.test(desc) || pattern.test(job.title)) {
        signals.push({ type: 'vague', weight, desc: description });
      }
    }

    // 3. Check for repost patterns
    for (const { pattern, weight, desc: description } of REPOST_PATTERNS) {
      if (pattern.test(desc)) {
        signals.push({ type: 'repost', weight, desc: description });
      }
    }

    // 4. Check for excessive requirements
    for (const { pattern, weight, desc: description } of EXCESSIVE_REQUIREMENT_PATTERNS) {
      if (pattern.test(desc)) {
        signals.push({ type: 'excessive', weight, desc: description });
      }
    }

    // 5. Check applicant count vs age (if available)
    if (job.applicantCount !== undefined && daysPosted !== null) {
      for (const [, threshold] of Object.entries(APPLICANT_THRESHOLDS)) {
        if (daysPosted >= threshold.days && job.applicantCount <= threshold.maxApplicants) {
          signals.push({
            type: 'low_applicants',
            weight: threshold.weight,
            desc: `Only ${job.applicantCount} applicants after ${daysPosted}+ days`
          });
          break;
        }
      }
    }

    // 6. Check for missing key info
    if (!job.salary && !desc.includes('$') && !desc.match(/\d+k/i)) {
      signals.push({ type: 'missing', weight: 0.2, desc: 'No salary information' });
    }

    // Calculate total confidence score
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const confidence = Math.min(0.95, totalWeight / 2); // Normalize to 0-0.95 range

    // Determine if ghost job detected
    const detected = confidence >= 0.5;

    // Build message
    let message: string;
    if (confidence >= 0.8) {
      message = 'Likely ghost job - multiple red flags detected';
    } else if (confidence >= 0.6) {
      message = 'High risk - several warning signs present';
    } else if (confidence >= 0.4) {
      message = 'Medium risk - some concerns identified';
    } else if (confidence >= 0.2) {
      message = 'Low risk - minor concerns only';
    } else {
      message = 'Appears legitimate';
    }

    return {
      detected,
      confidence,
      category: 'ghost_job',
      message,
      evidence: signals.map(s => s.desc).slice(0, 5)
    };
  }

  getScoreCategory(confidence: number): string {
    if (confidence >= 0.8) return 'likely_ghost';
    if (confidence >= 0.6) return 'high_risk';
    if (confidence >= 0.4) return 'medium_risk';
    if (confidence >= 0.2) return 'low_risk';
    return 'safe';
  }
}

export const ghostJobDetector = new GhostJobDetector();
