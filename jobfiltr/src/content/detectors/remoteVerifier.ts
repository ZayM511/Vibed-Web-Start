// Remote work verification
import type { JobData, DetectionResult, DetectionSignal } from '../../types';
import { createSignal, calculateConfidence } from './signals';

type RemoteType = 'true_remote' | 'hybrid' | 'onsite' | 'unclear';

const TRUE_REMOTE_PATTERNS = [
  /100%\s*remote/i,
  /fully\s*remote/i,
  /completely\s*remote/i,
  /work\s*from\s*anywhere/i,
  /remote[\s-]*first/i,
  /no\s*office\s*required/i,
];

const HYBRID_PATTERNS = [
  /hybrid/i,
  /\d+\s*days?\s*(in[\s-]?office|on[\s-]?site)/i,
  /flexible\s*(work|location)/i,
  /remote\s*with\s*(occasional|some)/i,
  /partial\s*remote/i,
];

const ONSITE_PATTERNS = [
  /on[\s-]?site\s*only/i,
  /in[\s-]?office\s*required/i,
  /must\s*be\s*local/i,
  /no\s*remote/i,
  /not\s*remote/i,
  /office\s*based/i,
];

const LOCATION_REQUIREMENTS = [
  /must\s*(be\s*)?(located|live|reside)\s*(in|near)/i,
  /within\s*\d+\s*miles/i,
  /commutable\s*distance/i,
  /relocat(e|ion)/i,
];

export function verifyRemote(job: JobData): DetectionResult & { remoteType: RemoteType } {
  const signals: DetectionSignal[] = [];
  const evidence: string[] = [];
  const content = `${job.title} ${job.location} ${job.description}`.toLowerCase();

  // Check for true remote indicators
  const trueRemoteMatches = TRUE_REMOTE_PATTERNS.filter(p => p.test(content));
  if (trueRemoteMatches.length > 0) {
    signals.push(createSignal('true_remote', 'True Remote Indicators', 3, 0.9, 'Contains true remote keywords'));
    evidence.push('Contains strong true-remote indicators');
  }

  // Check for hybrid indicators
  const hybridMatches = HYBRID_PATTERNS.filter(p => p.test(content));
  if (hybridMatches.length > 0) {
    signals.push(createSignal('hybrid', 'Hybrid Indicators', 2, 0.7, 'Contains hybrid keywords'));
    evidence.push('Contains hybrid work indicators');
  }

  // Check for onsite requirements
  const onsiteMatches = ONSITE_PATTERNS.filter(p => p.test(content));
  if (onsiteMatches.length > 0) {
    signals.push(createSignal('onsite', 'Onsite Requirements', 2, 0.8, 'Contains onsite requirements'));
    evidence.push('Contains onsite work requirements');
  }

  // Check for location requirements (red flag for "remote" jobs)
  const locationMatches = LOCATION_REQUIREMENTS.filter(p => p.test(content));
  if (locationMatches.length > 0 && job.isRemote) {
    signals.push(createSignal('location_req', 'Location Requirements', 2.5, 0.85, 'Has location requirements despite remote label'));
    evidence.push('Has location requirements despite being labeled as remote');
  }

  // Determine remote type
  let remoteType: RemoteType = 'unclear';

  if (trueRemoteMatches.length > 0 && onsiteMatches.length === 0 && locationMatches.length === 0) {
    remoteType = 'true_remote';
  } else if (onsiteMatches.length > 0) {
    remoteType = 'onsite';
  } else if (hybridMatches.length > 0 || (job.isRemote && locationMatches.length > 0)) {
    remoteType = 'hybrid';
  } else if (!job.isRemote) {
    remoteType = 'onsite';
  }

  const confidence = calculateConfidence(signals);
  const isTrueRemote = remoteType === 'true_remote';

  return {
    detected: isTrueRemote,
    confidence,
    category: 'remote',
    message: getRemoteMessage(remoteType, job.isRemote),
    evidence: evidence.length > 0 ? evidence : undefined,
    signals,
    remoteType,
  };
}

function getRemoteMessage(type: RemoteType, claimsRemote: boolean): string {
  switch (type) {
    case 'true_remote':
      return 'Verified true remote position';
    case 'hybrid':
      return claimsRemote ? 'Labeled remote but appears to be hybrid' : 'Hybrid position';
    case 'onsite':
      return claimsRemote ? 'Labeled remote but requires onsite work' : 'Onsite position';
    default:
      return 'Remote status unclear';
  }
}
