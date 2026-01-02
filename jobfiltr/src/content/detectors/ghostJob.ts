// Ghost job detection
import type { JobData, DetectionResult, DetectionSignal } from '../../types';
import { createSignal, calculateConfidence } from './signals';

const GHOST_JOB_THRESHOLD = 0.6;

export function detectGhostJob(job: JobData, daysThreshold: number): DetectionResult {
  const signals: DetectionSignal[] = [];
  const evidence: string[] = [];

  // Check post age
  if (job.daysSincePosted !== null) {
    if (job.daysSincePosted > daysThreshold) {
      const ageScore = Math.min(job.daysSincePosted / daysThreshold, 2) / 2;
      signals.push(createSignal('age', 'Post Age', 3, ageScore, `Posted ${job.daysSincePosted} days ago`));
      evidence.push(`Job posted ${job.daysSincePosted} days ago (threshold: ${daysThreshold})`);
    }
  } else {
    signals.push(createSignal('no_date', 'No Post Date', 1, 0.5, 'No posting date available'));
    evidence.push('No posting date found');
  }

  // Check reposting patterns (keywords in title)
  const repostPatterns = /repost|reopen|re-open|hiring again|still hiring/i;
  if (repostPatterns.test(job.title) || repostPatterns.test(job.description)) {
    signals.push(createSignal('repost', 'Reposting Pattern', 2, 0.8, 'Contains reposting keywords'));
    evidence.push('Contains reposting keywords');
  }

  // Check for vague descriptions
  const vaguenessScore = checkDescriptionVagueness(job.description);
  if (vaguenessScore > 0.5) {
    signals.push(createSignal('vague', 'Vague Description', 1.5, vaguenessScore, 'Description lacks specificity'));
    evidence.push('Job description is unusually vague');
  }

  // Calculate confidence
  const confidence = calculateConfidence(signals);
  const detected = confidence >= GHOST_JOB_THRESHOLD;

  return {
    detected,
    confidence,
    category: 'ghost',
    message: detected
      ? `Potential ghost job (${Math.round(confidence * 100)}% confidence)`
      : 'No ghost job indicators detected',
    evidence: detected ? evidence : undefined,
    signals,
  };
}

function checkDescriptionVagueness(description: string): number {
  if (!description || description.length < 50) return 0.7;

  const specificityIndicators = [
    /\d+\+?\s*years?/i,
    /bachelor|master|phd|degree/i,
    /salary|compensation|\$\d+/i,
    /specific\s+skills?|required\s+skills?/i,
    /responsibilities|duties/i,
  ];

  const matches = specificityIndicators.filter(pattern => pattern.test(description));
  return 1 - (matches.length / specificityIndicators.length);
}
