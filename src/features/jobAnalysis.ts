import type { JobData } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { hybridStorage } from '@/src/storage/hybridStorage';

// ATS-friendly keywords by category
const ATS_KEYWORDS = {
  technical: ['javascript', 'typescript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'ci/cd', 'api', 'rest', 'graphql'],
  soft: ['leadership', 'communication', 'teamwork', 'problem-solving', 'analytical', 'collaboration', 'initiative', 'adaptable'],
  action: ['developed', 'implemented', 'managed', 'led', 'created', 'designed', 'optimized', 'delivered', 'achieved', 'increased', 'reduced'],
  metrics: ['%', 'percent', 'revenue', 'growth', 'efficiency', 'performance', 'kpi', 'roi', 'budget']
};

// Red flag patterns
const RED_FLAG_PATTERNS = [
  { pattern: /urgently hiring|immediate start|asap/i, flag: 'Urgently hiring (often indicates high turnover)' },
  { pattern: /unlimited earning|uncapped commission|six.?figure potential/i, flag: 'Unrealistic earning claims' },
  { pattern: /no experience (needed|required|necessary)/i, flag: 'No experience needed (may be MLM/scam)' },
  { pattern: /work from home.*\$\d+.*hour|\$\d+.*hour.*work from home/i, flag: 'WFH + hourly rate combo (common scam pattern)' },
  { pattern: /be your own boss|financial freedom|passive income/i, flag: 'MLM/pyramid scheme language' },
  { pattern: /training provided.*no experience/i, flag: 'Training + no experience (potential churn role)' },
  { pattern: /must have (own )?reliable (vehicle|transportation)/i, flag: 'Own vehicle required (delivery/sales role)' },
  { pattern: /interview (today|tomorrow|this week)/i, flag: 'Rush hiring (potential red flag)' },
  { pattern: /background check.*drug (test|screen)/i, flag: 'Heavy screening mentioned upfront' },
  { pattern: /commission only|100% commission/i, flag: 'Commission-only compensation' }
];

// Positive indicators
const POSITIVE_PATTERNS = [
  { pattern: /salary range|\$[\d,]+\s*[-–]\s*\$[\d,]+/i, indicator: 'Salary range provided' },
  { pattern: /401\(?k\)?|retirement plan/i, indicator: '401k/retirement benefits' },
  { pattern: /health (insurance|benefits)|medical|dental|vision/i, indicator: 'Health benefits mentioned' },
  { pattern: /paid time off|pto|vacation days/i, indicator: 'PTO mentioned' },
  { pattern: /remote|work from home|hybrid/i, indicator: 'Flexible work arrangement' },
  { pattern: /equity|stock options|rsu/i, indicator: 'Equity compensation' },
  { pattern: /professional development|learning budget/i, indicator: 'Professional development support' },
  { pattern: /team of \d+|reports to|direct reports/i, indicator: 'Clear team structure' },
  { pattern: /interview process|\d+ (rounds?|stages?)/i, indicator: 'Defined interview process' },
  { pattern: /start date|onboarding/i, indicator: 'Clear start expectations' }
];

export interface AnalysisResult {
  atsScore: number;           // 0-100
  legitimacyScore: number;    // 0-100
  overallScore: number;       // 0-100
  redFlags: string[];
  positiveIndicators: string[];
  keywordMatches: { category: string; matches: string[]; count: number }[];
  recommendation: 'apply' | 'caution' | 'skip';
  usageRemaining: number | 'unlimited';
  details: {
    atsBreakdown: { keywords: number; formatting: number; structure: number };
    legitimacyBreakdown: { freshness: number; transparency: number; redFlagPenalty: number };
  };
}

// Extended JobData with optional daysSincePosted for analysis
interface AnalyzableJob extends JobData {
  daysSincePosted?: number | null;
}

export class JobAnalyzer {
  private FREE_MONTHLY_LIMIT = 30;

  /**
   * Analyze a job for ATS compatibility and legitimacy
   */
  async analyzeJob(job: AnalyzableJob, userId?: string): Promise<AnalysisResult> {
    // Check usage limits
    const usageRemaining = await this.checkUsage(userId);
    if (typeof usageRemaining === 'number' && usageRemaining <= 0) {
      throw new Error('Monthly analysis limit reached. Upgrade to Pro for unlimited analyses.');
    }

    // Perform analysis
    const atsResult = this.analyzeATS(job);
    const legitimacyResult = this.analyzeLegitimacy(job);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(atsResult.score * 0.4 + legitimacyResult.score * 0.6);

    // Determine recommendation
    let recommendation: 'apply' | 'caution' | 'skip';
    if (overallScore >= 70 && legitimacyResult.redFlags.length === 0) {
      recommendation = 'apply';
    } else if (overallScore >= 50 || legitimacyResult.redFlags.length <= 2) {
      recommendation = 'caution';
    } else {
      recommendation = 'skip';
    }

    // Increment usage counter
    await this.incrementUsage(userId);
    const newUsageRemaining = await this.checkUsage(userId);

    return {
      atsScore: atsResult.score,
      legitimacyScore: legitimacyResult.score,
      overallScore,
      redFlags: legitimacyResult.redFlags,
      positiveIndicators: legitimacyResult.positiveIndicators,
      keywordMatches: atsResult.keywordMatches,
      recommendation,
      usageRemaining: newUsageRemaining,
      details: {
        atsBreakdown: atsResult.breakdown,
        legitimacyBreakdown: legitimacyResult.breakdown
      }
    };
  }

  /**
   * Analyze ATS compatibility
   */
  private analyzeATS(job: AnalyzableJob): {
    score: number;
    keywordMatches: { category: string; matches: string[]; count: number }[];
    breakdown: { keywords: number; formatting: number; structure: number };
  } {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const keywordMatches: { category: string; matches: string[]; count: number }[] = [];
    let totalKeywordScore = 0;

    // Check each keyword category
    for (const [category, keywords] of Object.entries(ATS_KEYWORDS)) {
      const matches = keywords.filter(kw => text.includes(kw.toLowerCase()));
      const score = Math.min(100, (matches.length / keywords.length) * 100);
      keywordMatches.push({ category, matches, count: matches.length });
      totalKeywordScore += score;
    }

    const keywordsScore = Math.round(totalKeywordScore / Object.keys(ATS_KEYWORDS).length);

    // Formatting score (job description quality)
    let formattingScore = 50; // Base score
    const wordCount = job.description.split(/\s+/).length;
    if (wordCount >= 200 && wordCount <= 1500) formattingScore += 25;
    if (job.description.includes('\n') || job.description.includes('<br')) formattingScore += 15;
    if (/requirements?:|qualifications?:|responsibilities?:/i.test(job.description)) formattingScore += 10;
    formattingScore = Math.min(100, formattingScore);

    // Structure score
    let structureScore = 50;
    if (job.title.length >= 10 && job.title.length <= 60) structureScore += 15;
    if (job.location && job.location.length > 0) structureScore += 10;
    if (job.salary) structureScore += 15;
    if (job.company && job.company.length > 0) structureScore += 10;
    structureScore = Math.min(100, structureScore);

    // Combined ATS score
    const score = Math.round(keywordsScore * 0.5 + formattingScore * 0.25 + structureScore * 0.25);

    return {
      score,
      keywordMatches,
      breakdown: { keywords: keywordsScore, formatting: formattingScore, structure: structureScore }
    };
  }

  /**
   * Analyze job legitimacy
   */
  private analyzeLegitimacy(job: AnalyzableJob): {
    score: number;
    redFlags: string[];
    positiveIndicators: string[];
    breakdown: { freshness: number; transparency: number; redFlagPenalty: number };
  } {
    const text = `${job.title} ${job.description}`.toLowerCase();
    const redFlags: string[] = [];
    const positiveIndicators: string[] = [];

    // Check red flags
    for (const { pattern, flag } of RED_FLAG_PATTERNS) {
      if (pattern.test(text)) redFlags.push(flag);
    }

    // Check positive indicators
    for (const { pattern, indicator } of POSITIVE_PATTERNS) {
      if (pattern.test(text)) positiveIndicators.push(indicator);
    }

    // Freshness score (based on posting age)
    let freshnessScore = 100;
    if (job.daysSincePosted !== undefined && job.daysSincePosted !== null) {
      if (job.daysSincePosted <= 7) freshnessScore = 100;
      else if (job.daysSincePosted <= 14) freshnessScore = 85;
      else if (job.daysSincePosted <= 30) freshnessScore = 70;
      else if (job.daysSincePosted <= 60) freshnessScore = 50;
      else freshnessScore = 25;
    } else {
      freshnessScore = 60; // Unknown age
    }

    // Transparency score
    let transparencyScore = 30; // Base
    if (job.salary) transparencyScore += 25;
    if (positiveIndicators.some(i => i.includes('benefits'))) transparencyScore += 15;
    if (positiveIndicators.some(i => i.includes('team structure'))) transparencyScore += 15;
    if (positiveIndicators.some(i => i.includes('interview'))) transparencyScore += 15;
    transparencyScore = Math.min(100, transparencyScore);

    // Red flag penalty
    const redFlagPenalty = Math.min(60, redFlags.length * 15);

    // Combined legitimacy score
    const baseScore = Math.round(freshnessScore * 0.3 + transparencyScore * 0.7);
    const score = Math.max(0, baseScore - redFlagPenalty);

    return {
      score,
      redFlags,
      positiveIndicators,
      breakdown: { freshness: freshnessScore, transparency: transparencyScore, redFlagPenalty }
    };
  }

  /**
   * Check remaining usage for user
   */
  private async checkUsage(userId?: string): Promise<number | 'unlimited'> {
    // Check if Pro user
    const { isPro } = await hybridStorage.getProStatus();
    if (isPro) return 'unlimited';

    // Check local storage for anonymous users
    if (!userId || !isSupabaseConfigured || !supabase) {
      const local = await chrome.storage.local.get('analysisCount');
      const currentMonth = new Date().toISOString().slice(0, 7);
      const stored = local.analysisCount || { month: '', count: 0 };
      if (stored.month !== currentMonth) return this.FREE_MONTHLY_LIMIT;
      return Math.max(0, this.FREE_MONTHLY_LIMIT - stored.count);
    }

    // Check Supabase for logged-in users
    try {
      const { data, error } = await supabase.rpc('get_analysis_count', { p_user_id: userId });
      if (error) throw error;
      return Math.max(0, this.FREE_MONTHLY_LIMIT - (data || 0));
    } catch {
      return this.FREE_MONTHLY_LIMIT;
    }
  }

  /**
   * Increment usage counter
   */
  private async incrementUsage(userId?: string): Promise<void> {
    // Check if Pro user (no tracking needed)
    const { isPro } = await hybridStorage.getProStatus();
    if (isPro) return;

    // Local storage for anonymous users
    if (!userId || !isSupabaseConfigured || !supabase) {
      const local = await chrome.storage.local.get('analysisCount');
      const currentMonth = new Date().toISOString().slice(0, 7);
      const stored = local.analysisCount || { month: '', count: 0 };
      const newCount = stored.month === currentMonth ? stored.count + 1 : 1;
      await chrome.storage.local.set({ analysisCount: { month: currentMonth, count: newCount } });
      return;
    }

    // Supabase for logged-in users
    try {
      await supabase.rpc('increment_analysis_count', { p_user_id: userId });
    } catch (error) {
      console.error('[JobFiltr] Failed to increment analysis count:', error);
    }
  }

  /**
   * Get remaining analyses for display
   */
  async getRemainingAnalyses(userId?: string): Promise<number | 'unlimited'> {
    return this.checkUsage(userId);
  }
}

export const jobAnalyzer = new JobAnalyzer();
