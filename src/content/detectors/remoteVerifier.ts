import type { JobData, DetectionResult } from '@/types';

type RemoteType = 'true_remote' | 'hybrid' | 'onsite' | 'unclear';

const HYBRID_INDICATORS = [
  { pattern: /hybrid/i, weight: 1.0, desc: 'Mentions hybrid' },
  { pattern: /\d+\s*days?\s*(in|at)\s*(the\s+)?office/i, weight: 0.95, desc: 'Office days required' },
  { pattern: /office\s*(attendance|presence)\s*required/i, weight: 0.9, desc: 'Office attendance required' },
  { pattern: /occasional(ly)?\s*(office|on.?site)/i, weight: 0.8, desc: 'Occasional office' },
  { pattern: /primarily\s*remote/i, weight: 0.5, desc: 'Primarily remote (not fully)' }
];

const ONSITE_INDICATORS = [
  { pattern: /on.?site\s*(only|required)/i, weight: 1.0, desc: 'Onsite required' },
  { pattern: /in.?office\s*(only|required)/i, weight: 1.0, desc: 'In-office required' },
  { pattern: /must\s+(be\s+)?located\s+(in|near)/i, weight: 0.9, desc: 'Location requirement' },
  { pattern: /relocation\s+(required|expected)/i, weight: 0.85, desc: 'Relocation mentioned' }
];

const TRUE_REMOTE_INDICATORS = [
  { pattern: /100%\s*remote/i, weight: 1.0, desc: '100% remote confirmed' },
  { pattern: /fully\s*remote/i, weight: 0.95, desc: 'Fully remote' },
  { pattern: /work\s*from\s*anywhere/i, weight: 0.95, desc: 'Work from anywhere' },
  { pattern: /remote.?first/i, weight: 0.9, desc: 'Remote-first company' },
  { pattern: /no\s*(office|commute)\s*required/i, weight: 0.9, desc: 'No office required' }
];

const LOCATION_CONTRADICTIONS = [
  { pattern: /remote.*but.*(?:must|need|required).*(?:located|live)/i, weight: 0.9 },
  { pattern: /within\s*\d+\s*(miles?|km)/i, weight: 0.85 },
  { pattern: /local\s*candidates?\s*(only|preferred)/i, weight: 0.8 }
];

export class RemoteVerifier {
  analyze(job: JobData): DetectionResult {
    const claimsRemote = job.isRemote || /\bremote\b/i.test(job.title) || /\bremote\b/i.test(job.location);

    if (!claimsRemote) {
      return {
        detected: false,
        confidence: 0.9,
        category: 'remote',
        message: 'Not advertised as remote',
        evidence: []
      };
    }

    const text = `${job.title} ${job.description} ${job.location}`.toLowerCase();
    const signals: { type: 'positive' | 'negative'; match: string; weight: number; desc: string }[] = [];

    // Check all indicators
    for (const ind of TRUE_REMOTE_INDICATORS) {
      if (ind.pattern.test(text)) {
        signals.push({
          type: 'positive',
          match: text.match(ind.pattern)?.[0] || '',
          weight: ind.weight,
          desc: ind.desc
        });
      }
    }

    for (const ind of HYBRID_INDICATORS) {
      if (ind.pattern.test(text)) {
        signals.push({
          type: 'negative',
          match: text.match(ind.pattern)?.[0] || '',
          weight: ind.weight,
          desc: ind.desc
        });
      }
    }

    for (const ind of ONSITE_INDICATORS) {
      if (ind.pattern.test(text)) {
        signals.push({
          type: 'negative',
          match: text.match(ind.pattern)?.[0] || '',
          weight: ind.weight,
          desc: ind.desc
        });
      }
    }

    for (const { pattern, weight } of LOCATION_CONTRADICTIONS) {
      if (pattern.test(text)) {
        signals.push({
          type: 'negative',
          match: text.match(pattern)?.[0] || '',
          weight,
          desc: 'Location contradiction'
        });
      }
    }

    // Check location field for contradictions
    if (/remote.*[,\/].*[a-z]{2,}/i.test(job.location) || /[a-z]{2,}.*[,\/].*remote/i.test(job.location)) {
      signals.push({
        type: 'negative',
        match: job.location,
        weight: 0.7,
        desc: 'Remote + specific location'
      });
    }

    // Evaluate
    const positiveScore = signals
      .filter(s => s.type === 'positive')
      .reduce((sum, s) => sum + s.weight, 0);

    const negativeScore = signals
      .filter(s => s.type === 'negative')
      .reduce((sum, s) => sum + s.weight, 0);

    let remoteType: RemoteType = 'unclear';
    let isMisleading = false;

    if (negativeScore >= 1.0) {
      remoteType = signals.some(s => s.desc.includes('Onsite')) ? 'onsite' : 'hybrid';
      isMisleading = true;
    } else if (negativeScore >= 0.5) {
      remoteType = 'hybrid';
      isMisleading = negativeScore > positiveScore;
    } else if (positiveScore >= 0.8) {
      remoteType = 'true_remote';
    }

    job.remoteType = remoteType;

    const confidence = Math.min(
      0.95,
      0.5 + Math.abs(positiveScore - negativeScore) / Math.max(positiveScore + negativeScore, 1) * 0.45
    );

    const topNeg = signals
      .filter(s => s.type === 'negative')
      .sort((a, b) => b.weight - a.weight)[0];

    return {
      detected: isMisleading,
      confidence,
      category: 'remote',
      message: !isMisleading
        ? (remoteType === 'true_remote' ? '✓ Verified true remote' : 'Remote status unclear')
        : `⚠ Misleading: ${remoteType === 'onsite' ? 'Actually onsite' : 'Hybrid role'} (${topNeg?.desc || 'office required'})`,
      evidence: signals
        .filter(s => s.type === 'negative')
        .map(s => s.desc)
        .slice(0, 5)
    };
  }
}

export const remoteVerifier = new RemoteVerifier();
