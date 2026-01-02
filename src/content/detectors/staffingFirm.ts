import type { BlocklistEntry } from '@/types';
import { normalizeCompanyName } from '@/lib/utils';
import { hybridStorage } from '@/storage/hybridStorage';

// Job data structure for detection
export interface JobData {
  company: string;
  description: string;
  title?: string;
  url?: string;
}

// Detection result structure
export interface DetectionResult {
  detected: boolean;
  confidence: number;
  category: 'staffing' | 'ghost_poster' | 'scam' | 'other';
  message: string;
  evidence: string[];
}

// Company name patterns
const STAFFING_NAME_PATTERNS = [
  /staffing/i, /recruiting/i, /talent (solutions|group|partners)/i, /solutions (group|inc)/i,
  /consulting (group|partners)/i, /workforce/i, /personnel/i, /technical (resources|services)/i,
  /placement/i, /contractors?$/i, /recruiters?$/i
];

// Job description patterns (high confidence)
const STAFFING_LANGUAGE = [
  /\b(our|a) client (is )?(seeking|looking|hiring)/i, /on behalf of (our|a) client/i,
  /contract.to.(hire|perm)/i, /w2 (contract|position)/i, /c2c (available|accepted)/i,
  /client (company|name|identity) (is )?(confidential|disclosed)/i, /confidential client/i,
  /submit(ted)? (your )?(resume|profile)/i, /right to represent/i, /bill rate/i
];

const HIGH_CONFIDENCE_SIGNALS = [
  'our client',
  'contract to hire',
  'c2c',
  'corp to corp',
  'w2 contract',
  'bill rate',
  'right to represent'
];

export class StaffingFirmDetector {
  private blocklistMap: Map<string, BlocklistEntry> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    const community = await hybridStorage.getCommunityBlocklist();
    community.forEach(e => this.blocklistMap.set(e.companyNameNormalized, e));
    this.initialized = true;
    console.log(`[JobFiltr] Staffing detector: ${this.blocklistMap.size} companies loaded`);
  }

  async refresh(): Promise<void> {
    this.initialized = false;
    await this.init();
  }

  analyze(job: JobData): DetectionResult {
    const signals: { type: string; match: string; confidence: number }[] = [];

    // Check blocklist (highest confidence)
    const normalized = normalizeCompanyName(job.company);
    const blocklistMatch = this.blocklistMap.get(normalized);
    if (blocklistMatch) {
      signals.push({
        type: 'blocklist',
        match: blocklistMatch.companyName,
        confidence: blocklistMatch.verified ? 1.0 : 0.9
      });
    }

    // Check company name patterns
    for (const pattern of STAFFING_NAME_PATTERNS) {
      if (pattern.test(job.company)) {
        signals.push({
          type: 'name_pattern',
          match: job.company.match(pattern)?.[0] || '',
          confidence: 0.75
        });
        break;
      }
    }

    // Check description language
    const desc = job.description.toLowerCase();
    for (const pattern of STAFFING_LANGUAGE) {
      const match = desc.match(pattern);
      if (match) {
        signals.push({ type: 'language', match: match[0], confidence: 0.7 });
      }
    }

    // Check high-confidence signals
    for (const phrase of HIGH_CONFIDENCE_SIGNALS) {
      if (desc.includes(phrase)) {
        signals.push({ type: 'signal', match: phrase, confidence: 0.9 });
      }
    }

    // Calculate confidence
    const hasBlocklist = signals.some(s => s.type === 'blocklist');
    const confidence = hasBlocklist
      ? 0.95
      : signals.length === 0
        ? 0
        : Math.min(
            0.95,
            Math.max(...signals.map(s => s.confidence)) +
              Math.min(signals.length * 0.1, 0.3)
          );

    return {
      detected: confidence >= 0.7,
      confidence,
      category: 'staffing',
      message: hasBlocklist
        ? `Known staffing: ${signals[0].match}`
        : confidence >= 0.8
          ? 'Strong staffing indicators'
          : confidence >= 0.6
            ? 'Likely staffing agency'
            : 'No staffing indicators',
      evidence: signals.map(s => s.match).slice(0, 5)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async reportCompany(companyName: string, _sourceUrl: string): Promise<void> {
    // Add to local blocklist and sync
    await hybridStorage.addExcludeCompany(companyName);
  }

  getStats() {
    return { total: this.blocklistMap.size };
  }
}

export const staffingFirmDetector = new StaffingFirmDetector();
