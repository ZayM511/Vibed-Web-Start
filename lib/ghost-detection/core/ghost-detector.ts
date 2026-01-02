/**
 * Ghost Detector - Core Detection Engine
 * Analyzes job listings and calculates ghost job probability scores
 */

import type {
  JobListing,
  GhostJobScore,
  DetectionSignal,
  SignalCategory,
} from './types';
import {
  SIGNAL_WEIGHTS,
  SCORE_THRESHOLDS,
  HIGH_RISK_INDUSTRIES,
} from './constants';
import { storageManager } from '../data/storage-manager';
import {
  calculateVaguenessScore,
  calculateBuzzwordDensity,
  extractSalaryInfo,
  normalizeCompanyName,
  isLikelyStaffingAgency,
  checkDescriptionLength,
} from '../utils/text-analysis';
import {
  daysSincePosted,
  calculateTemporalRisk,
  isGhostPeakPeriod,
} from '../utils/date-utils';

export class GhostDetector {
  /**
   * Analyze a job listing and return ghost job score
   */
  async analyze(job: JobListing): Promise<GhostJobScore> {
    // Check cache first
    const cached = await storageManager.getCachedScore(job.id);
    if (cached) {
      return cached;
    }

    // Collect signals from all categories
    const signals: DetectionSignal[] = [
      ...this.analyzeTemporalSignals(job),
      ...this.analyzeContentSignals(job),
      ...(await this.analyzeCompanySignals(job)),
      ...this.analyzeBehavioralSignals(job),
      ...(await this.analyzeCommunitySignals(job)),
    ];

    // Calculate breakdown by category
    const breakdown = this.calculateBreakdown(signals);

    // Calculate overall score
    const overall = this.calculateOverall(breakdown);

    // Calculate confidence
    const confidence =
      signals.length > 0
        ? signals.reduce((sum, sig) => sum + sig.confidence, 0) / signals.length
        : 0.5;

    // Determine category
    const category = this.getCategory(overall);

    const score: GhostJobScore = {
      overall,
      confidence,
      category,
      signals,
      breakdown,
      timestamp: Date.now(),
    };

    // Cache the result
    await storageManager.cacheScore(job.id, score);

    return score;
  }

  /**
   * Analyze temporal signals (posting age, seasonality, etc.)
   */
  private analyzeTemporalSignals(job: JobListing): DetectionSignal[] {
    const signals: DetectionSignal[] = [];
    const weights = SIGNAL_WEIGHTS.temporal.signals;

    // Posting age signal
    const days = daysSincePosted(job.postedDate);
    const ageRisk = calculateTemporalRisk(days);

    signals.push({
      id: 'posting_age',
      category: 'temporal',
      name: 'Posting Age',
      weight: weights.postingAge,
      value: days ?? -1,
      normalizedValue: ageRisk,
      confidence: days !== null ? 0.9 : 0.5,
      description:
        days !== null ? `Posted ${days} days ago` : 'Unknown posting date',
      evidence:
        days && days > 60
          ? 'Job posted over 60 days ago - high ghost probability'
          : undefined,
    });

    // Seasonal pattern signal
    const isPeak = isGhostPeakPeriod();
    signals.push({
      id: 'seasonal',
      category: 'temporal',
      name: 'Seasonal Risk',
      weight: weights.seasonalPattern,
      value: isPeak ? 1 : 0,
      normalizedValue: isPeak ? 0.3 : 0,
      confidence: 0.6,
      description: isPeak ? 'Peak ghost job period (Q1/Q4)' : 'Normal period',
    });

    return signals;
  }

  /**
   * Analyze content signals (description quality, salary, etc.)
   */
  private analyzeContentSignals(job: JobListing): DetectionSignal[] {
    const signals: DetectionSignal[] = [];
    const weights = SIGNAL_WEIGHTS.content.signals;

    // Description vagueness
    const vagueness = calculateVaguenessScore(job.description);
    signals.push({
      id: 'vagueness',
      category: 'content',
      name: 'Description Quality',
      weight: weights.descriptionVagueness,
      value: vagueness,
      normalizedValue: vagueness,
      confidence: 0.8,
      description:
        vagueness > 0.6
          ? 'Vague and generic description'
          : vagueness > 0.3
            ? 'Some vague elements'
            : 'Specific and detailed',
    });

    // Salary transparency
    const salary = extractSalaryInfo(job.description);
    const salaryRisk =
      !salary.hasSalary && !job.salary ? 0.6 : salary.isVague ? 0.4 : 0;
    signals.push({
      id: 'salary',
      category: 'content',
      name: 'Salary Transparency',
      weight: weights.salaryTransparency,
      value: salaryRisk,
      normalizedValue: salaryRisk,
      confidence: 0.7,
      description:
        salaryRisk > 0.5
          ? 'No salary information'
          : salaryRisk > 0
            ? 'Vague salary info'
            : 'Salary range provided',
    });

    // Buzzword density
    const buzzwords = calculateBuzzwordDensity(job.description);
    signals.push({
      id: 'buzzwords',
      category: 'content',
      name: 'Buzzword Usage',
      weight: weights.buzzwordDensity,
      value: buzzwords,
      normalizedValue: buzzwords,
      confidence: 0.6,
      description:
        buzzwords > 0.5
          ? 'Excessive buzzwords and jargon'
          : 'Normal language usage',
    });

    // Description length
    const lengthRisk = checkDescriptionLength(job.description);
    signals.push({
      id: 'description_length',
      category: 'content',
      name: 'Description Length',
      weight: weights.descriptionLength,
      value: job.description.length,
      normalizedValue: lengthRisk,
      confidence: 0.7,
      description:
        lengthRisk > 0.5
          ? 'Very short description'
          : lengthRisk > 0.2
            ? 'Brief description'
            : 'Adequate detail',
    });

    return signals;
  }

  /**
   * Analyze company signals (blacklist, staffing agency, industry)
   */
  private async analyzeCompanySignals(
    job: JobListing
  ): Promise<DetectionSignal[]> {
    const signals: DetectionSignal[] = [];
    const weights = SIGNAL_WEIGHTS.company.signals;

    // Blacklist check
    const normalized = normalizeCompanyName(job.company);
    const blacklistEntry = storageManager.lookupCompany(normalized);

    signals.push({
      id: 'blacklist',
      category: 'company',
      name: 'Blacklist Check',
      weight: weights.blacklistMatch,
      value: blacklistEntry?.reportCount || 0,
      normalizedValue: blacklistEntry
        ? Math.min(1, blacklistEntry.confidence)
        : 0,
      confidence: blacklistEntry ? blacklistEntry.confidence : 0.9,
      description: blacklistEntry
        ? `Found on ${blacklistEntry.source} blacklist`
        : 'Not on known blacklists',
      evidence: blacklistEntry
        ? `${blacklistEntry.reportCount} reports: ${blacklistEntry.reasons.slice(0, 2).join(', ')}`
        : undefined,
    });

    // Staffing agency detection
    const staffing = isLikelyStaffingAgency(job.company);
    signals.push({
      id: 'staffing',
      category: 'company',
      name: 'Staffing Agency',
      weight: weights.companySize,
      value: staffing.confidence,
      normalizedValue: staffing.isLikely ? staffing.confidence : 0,
      confidence: staffing.isLikely ? 0.85 : 0.7,
      description: staffing.isLikely
        ? 'Appears to be a staffing agency'
        : 'Not identified as staffing agency',
      evidence: staffing.matchedIndicators.length
        ? staffing.matchedIndicators.join(', ')
        : undefined,
    });

    // Industry risk
    const industry = (job.companyIndustry || '').toLowerCase();
    const highRisk = HIGH_RISK_INDUSTRIES.some((i) => industry.includes(i));
    signals.push({
      id: 'industry',
      category: 'company',
      name: 'Industry Risk',
      weight: weights.industryRisk,
      value: highRisk ? 1 : 0,
      normalizedValue: highRisk ? 0.4 : 0,
      confidence: job.companyIndustry ? 0.8 : 0.4,
      description: highRisk
        ? 'High-risk industry for ghost jobs'
        : 'Normal industry risk level',
    });

    return signals;
  }

  /**
   * Analyze behavioral signals (application method, sponsorship, etc.)
   */
  private analyzeBehavioralSignals(job: JobListing): DetectionSignal[] {
    const signals: DetectionSignal[] = [];
    const weights = SIGNAL_WEIGHTS.behavioral.signals;

    // Application method
    signals.push({
      id: 'apply_method',
      category: 'behavioral',
      name: 'Application Method',
      weight: weights.applicationMethod,
      value: job.isEasyApply ? 0 : 1,
      normalizedValue: job.isEasyApply ? 0 : 0.2,
      confidence: 0.6,
      description: job.isEasyApply
        ? 'Easy Apply available'
        : 'External application required',
    });

    // Sponsored post
    if (job.isSponsored !== undefined) {
      signals.push({
        id: 'sponsored',
        category: 'behavioral',
        name: 'Sponsored Post',
        weight: weights.sponsoredPost,
        value: job.isSponsored ? 1 : 0,
        normalizedValue: job.isSponsored ? 0.2 : 0,
        confidence: 0.9,
        description: job.isSponsored
          ? 'Sponsored/promoted listing'
          : 'Organic job posting',
      });
    }

    // Applicant count
    if (job.applicantCount !== undefined) {
      const risk =
        job.applicantCount > 500
          ? 0.5
          : job.applicantCount > 200
            ? 0.3
            : job.applicantCount > 100
              ? 0.1
              : 0;

      signals.push({
        id: 'applicants',
        category: 'behavioral',
        name: 'Applicant Volume',
        weight: weights.applicantCount,
        value: job.applicantCount,
        normalizedValue: risk,
        confidence: 0.7,
        description: `${job.applicantCount} applicants`,
        evidence:
          job.applicantCount > 500
            ? 'Very high count may indicate unfilled position'
            : undefined,
      });
    }

    return signals;
  }

  /**
   * Analyze community signals (user reports)
   */
  private async analyzeCommunitySignals(
    job: JobListing
  ): Promise<DetectionSignal[]> {
    const signals: DetectionSignal[] = [];
    const weights = SIGNAL_WEIGHTS.community.signals;

    // User reports
    const reports = await storageManager.getReportsForCompany(job.company);
    const ghostReports = reports.filter((r) => r.reportType === 'ghost');

    signals.push({
      id: 'user_reports',
      category: 'community',
      name: 'User Reports',
      weight: weights.userReports,
      value: ghostReports.length,
      normalizedValue: Math.min(1, ghostReports.length * 0.2),
      confidence: Math.min(0.9, 0.5 + ghostReports.length * 0.1),
      description: ghostReports.length
        ? `${ghostReports.length} ghost job report(s) from users`
        : 'No user reports',
    });

    return signals;
  }

  /**
   * Calculate score breakdown by category
   */
  private calculateBreakdown(
    signals: DetectionSignal[]
  ): GhostJobScore['breakdown'] {
    const categories: SignalCategory[] = [
      'temporal',
      'content',
      'company',
      'behavioral',
      'community',
      'structural',
    ];

    const breakdown: Record<string, number> = {};

    for (const cat of categories) {
      const catSignals = signals.filter((s) => s.category === cat);

      if (!catSignals.length) {
        breakdown[cat] = 0;
        continue;
      }

      let sum = 0;
      let totalWeight = 0;

      for (const s of catSignals) {
        sum += s.normalizedValue * s.weight * s.confidence;
        totalWeight += s.weight;
      }

      breakdown[cat] = totalWeight > 0 ? (sum / totalWeight) * 100 : 0;
    }

    return breakdown as GhostJobScore['breakdown'];
  }

  /**
   * Calculate overall score from breakdown
   */
  private calculateOverall(breakdown: GhostJobScore['breakdown']): number {
    const w = SIGNAL_WEIGHTS;

    const score =
      breakdown.temporal * (w.temporal.categoryWeight / 100) +
      breakdown.content * (w.content.categoryWeight / 100) +
      breakdown.company * (w.company.categoryWeight / 100) +
      breakdown.behavioral * (w.behavioral.categoryWeight / 100) +
      breakdown.community * (w.community.categoryWeight / 100) +
      breakdown.structural * (w.structural.categoryWeight / 100);

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Get score category from overall score
   */
  private getCategory(score: number): GhostJobScore['category'] {
    if (score <= SCORE_THRESHOLDS.safe.max) return 'safe';
    if (score <= SCORE_THRESHOLDS.low_risk.max) return 'low_risk';
    if (score <= SCORE_THRESHOLDS.medium_risk.max) return 'medium_risk';
    if (score <= SCORE_THRESHOLDS.high_risk.max) return 'high_risk';
    return 'likely_ghost';
  }
}

// Export singleton instance
export const ghostDetector = new GhostDetector();
