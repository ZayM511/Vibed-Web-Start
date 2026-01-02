// Staffing firm detection
import type { JobData, DetectionResult, DetectionSignal } from '../../types';
import { createSignal, calculateConfidence } from './signals';

const STAFFING_FIRMS = [
  'robert half', 'randstad', 'manpower', 'adecco', 'kelly services',
  'insight global', 'tek systems', 'teksystems', 'apex systems', 'modis',
  'hays', 'kforce', 'staffing', 'recruiting', 'recruiters', 'talent',
  'cybercoders', 'beacon hill', 'aerotek', 'jobot', 'motion recruitment',
];

const STAFFING_PATTERNS = [
  /staffing\s*(agency|firm|company)/i,
  /recruiting\s*(agency|firm|company)/i,
  /talent\s*(acquisition|solutions)/i,
  /contract\s*to\s*(hire|perm)/i,
  /our\s*client\s*(is\s*(looking|seeking|hiring))?/i,
  /on\s*behalf\s*of/i,
  /confidential\s*client/i,
  /direct\s*client/i,
];

const STAFFING_THRESHOLD = 0.5;

export function detectStaffingFirm(job: JobData): DetectionResult {
  const signals: DetectionSignal[] = [];
  const evidence: string[] = [];

  // Check company name against known staffing firms
  const normalizedCompany = job.companyNormalized;
  const matchedFirm = STAFFING_FIRMS.find(firm => normalizedCompany.includes(firm));

  if (matchedFirm) {
    signals.push(createSignal('known_firm', 'Known Staffing Firm', 3, 1, `Matches known staffing firm: ${matchedFirm}`));
    evidence.push(`Company "${job.company}" is a known staffing firm`);
  }

  // Check for staffing patterns in company name
  for (const pattern of STAFFING_PATTERNS) {
    if (pattern.test(job.company)) {
      signals.push(createSignal('company_pattern', 'Staffing Pattern in Name', 2, 0.9, 'Company name contains staffing keywords'));
      evidence.push('Company name contains staffing-related keywords');
      break;
    }
  }

  // Check for staffing patterns in description
  for (const pattern of STAFFING_PATTERNS) {
    if (pattern.test(job.description)) {
      signals.push(createSignal('desc_pattern', 'Staffing Pattern in Description', 1.5, 0.7, 'Description contains staffing keywords'));
      evidence.push('Job description mentions client or agency relationship');
      break;
    }
  }

  // Check for "contract" or "C2C" mentions
  if (/\b(c2c|corp\s*to\s*corp|1099|w2\s*only)\b/i.test(job.description)) {
    signals.push(createSignal('contract_type', 'Contract Type Indicator', 1, 0.6, 'Mentions specific contract types'));
    evidence.push('Mentions contract types typical of staffing firms');
  }

  const confidence = calculateConfidence(signals);
  const detected = confidence >= STAFFING_THRESHOLD;

  return {
    detected,
    confidence,
    category: 'staffing',
    message: detected
      ? `Staffing firm detected (${Math.round(confidence * 100)}% confidence)`
      : 'Direct employer',
    evidence: detected ? evidence : undefined,
    signals,
  };
}
