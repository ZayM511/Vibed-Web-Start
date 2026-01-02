// Job analysis features (Pro)
import type { JobData, DetectionResult } from '../types';
import { detectGhostJob, detectStaffingFirm, verifyRemote } from '../content/detectors';

export interface JobAnalysis {
  job: JobData;
  ghostDetection: DetectionResult;
  staffingDetection: DetectionResult;
  remoteVerification: DetectionResult & { remoteType: string };
  overallScore: number;
  warnings: string[];
  recommendations: string[];
}

export function analyzeJob(job: JobData, daysThreshold: number = 30): JobAnalysis {
  const ghostDetection = detectGhostJob(job, daysThreshold);
  const staffingDetection = detectStaffingFirm(job);
  const remoteVerification = verifyRemote(job);

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Collect warnings
  if (ghostDetection.detected) {
    warnings.push(ghostDetection.message);
    recommendations.push('Consider looking for more recently posted positions');
  }

  if (staffingDetection.detected) {
    warnings.push(staffingDetection.message);
    recommendations.push('Consider applying directly to the hiring company');
  }

  if (job.isRemote && remoteVerification.remoteType !== 'true_remote') {
    warnings.push(remoteVerification.message);
    recommendations.push('Verify remote work policy during the interview');
  }

  // Calculate overall score (0-100)
  let score = 100;
  if (ghostDetection.detected) score -= ghostDetection.confidence * 30;
  if (staffingDetection.detected) score -= staffingDetection.confidence * 20;
  if (remoteVerification.remoteType === 'unclear') score -= 10;

  return {
    job,
    ghostDetection,
    staffingDetection,
    remoteVerification,
    overallScore: Math.max(0, Math.round(score)),
    warnings,
    recommendations,
  };
}
