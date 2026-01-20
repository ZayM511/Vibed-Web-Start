import type { JobData, DetectionResult } from '@/types';

// Days thresholds for ghost job detection
const GHOST_THRESHOLDS = {
  HIGH_RISK: 60,
  MEDIUM_RISK: 30,
  LOW_RISK: 14
};

// Tiered vague description patterns (based on 2025 ghost job research)
// High-weight indicators are strong ghost signals
// Low-weight indicators are common in legitimate posts too
const VAGUE_PATTERNS = {
  // High-weight indicators (strong ghost signals)
  high: [
    { pattern: /always looking for talented/i, weight: 0.5, desc: 'Generic evergreen language' },
    { pattern: /perfect candidate/i, weight: 0.45, desc: 'Impossible standards' },
    { pattern: /endless possibilities/i, weight: 0.4, desc: 'Vague growth promises' },
    { pattern: /unlimited earning potential/i, weight: 0.5, desc: 'Often scam-adjacent' },
    { pattern: /immediate need/i, weight: 0.35, desc: 'Urgency without specifics' },
    { pattern: /work hard[,\s]+play hard/i, weight: 0.4, desc: 'Culture buzzword masking issues' },
  ],
  // Medium-weight indicators (moderate ghost signals)
  medium: [
    { pattern: /rock\s?star|ninja|guru|wizard|unicorn/i, weight: 0.35, desc: 'Tech buzzword title' },
    { pattern: /growing team/i, weight: 0.25, desc: 'Often masks turnover' },
    { pattern: /wear many hats/i, weight: 0.3, desc: 'Role not defined' },
    { pattern: /other duties as assigned/i, weight: 0.25, desc: 'Catch-all responsibilities' },
    { pattern: /competitive (salary|compensation|pay)/i, weight: 0.3, desc: 'Vague salary' },
    { pattern: /salary (commensurate|depending|based|negotiable)/i, weight: 0.3, desc: 'Undisclosed salary' },
    { pattern: /various (responsibilities|duties|tasks)/i, weight: 0.3, desc: 'Vague duties' },
    { pattern: /make an impact/i, weight: 0.2, desc: 'Vague contribution' },
    { pattern: /hit the ground running/i, weight: 0.25, desc: 'No training/support' },
  ],
  // Low-weight indicators (weak signals, common in legitimate posts)
  low: [
    { pattern: /fast[- ]paced environment/i, weight: 0.1, desc: 'Generic filler phrase' },
    { pattern: /self[- ]starter/i, weight: 0.1, desc: 'Standard HR language' },
    { pattern: /team player/i, weight: 0.08, desc: 'Very common' },
    { pattern: /dynamic (environment|team|company)/i, weight: 0.1, desc: 'Overused' },
    { pattern: /motivated individual/i, weight: 0.1, desc: 'Generic' },
    { pattern: /passionate about/i, weight: 0.08, desc: 'Overused' },
    { pattern: /results[- ]driven/i, weight: 0.1, desc: 'Business speak' },
  ],
};

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

// NOTE: Applicant count thresholds removed - numeric extraction was unreliable
// Early applicant detection is now handled separately via isEarlyApplicant()

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

    // 2. Check for vague patterns (tiered by weight)
    const desc = job.description.toLowerCase();
    const titleLower = job.title.toLowerCase();

    // Check high-weight vague indicators first
    for (const { pattern, weight, desc: description } of VAGUE_PATTERNS.high) {
      if (pattern.test(desc) || pattern.test(titleLower)) {
        signals.push({ type: 'vague_high', weight, desc: description });
      }
    }

    // Check medium-weight vague indicators
    for (const { pattern, weight, desc: description } of VAGUE_PATTERNS.medium) {
      if (pattern.test(desc) || pattern.test(titleLower)) {
        signals.push({ type: 'vague_medium', weight, desc: description });
      }
    }

    // Check low-weight vague indicators
    for (const { pattern, weight, desc: description } of VAGUE_PATTERNS.low) {
      if (pattern.test(desc) || pattern.test(titleLower)) {
        signals.push({ type: 'vague_low', weight, desc: description });
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

    // 5. Applicant count detection removed - numeric extraction was unreliable
    // Early applicant detection is now handled separately in the extension

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
