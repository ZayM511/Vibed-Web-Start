import type { DetectionResult, FilterSettings, PlatformAdapter } from '@/types';
import { hybridStorage } from '@/storage/hybridStorage';
import { ghostJobDetector } from './detectors/ghostJob';
import { staffingFirmDetector } from './detectors/staffingFirm';
import { remoteVerifier } from './detectors/remoteVerifier';
import { includeKeywordsFilter } from './filters/includeKeywords';
import { excludeKeywordsFilter } from './filters/excludeKeywords';
import { excludeCompaniesFilter } from './filters/excludeCompanies';

interface FilterStats {
  totalScanned: number;
  totalFiltered: number;
  ghostJobsFiltered: number;
  staffingFiltered: number;
  remoteIssuesFiltered: number;
  includeKeywordMisses: number;
  excludeKeywordMatches: number;
  companiesBlocked: number;
}

export class FilterEngine {
  private adapter: PlatformAdapter;
  private settings: FilterSettings | null = null;
  private stats: FilterStats = {
    totalScanned: 0,
    totalFiltered: 0,
    ghostJobsFiltered: 0,
    staffingFiltered: 0,
    remoteIssuesFiltered: 0,
    includeKeywordMisses: 0,
    excludeKeywordMatches: 0,
    companiesBlocked: 0
  };

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  async init(): Promise<void> {
    console.log('[JobFiltr] Initializing FilterEngine...');

    // Load settings
    this.settings = await hybridStorage.getSettings();

    // Initialize all detectors and filters in parallel
    await Promise.all([
      staffingFirmDetector.init(),
      includeKeywordsFilter.init(),
      excludeKeywordsFilter.init(),
      excludeCompaniesFilter.init()
    ]);

    console.log('[JobFiltr] FilterEngine ready');
  }

  async processJobs(): Promise<void> {
    const cards = this.adapter.getJobCards();
    console.log(`[JobFiltr] Processing ${cards.length} job cards`);

    for (const card of cards) {
      await this.processCard(card);
    }

    this.updateBadge();
    (window as unknown as Record<string, unknown>).__jobfiltr_stats = this.stats;
  }

  async processNewCards(cards: Element[]): Promise<void> {
    for (const card of cards) {
      await this.processCard(card);
    }

    this.updateBadge();
    (window as unknown as Record<string, unknown>).__jobfiltr_stats = this.stats;
  }

  private async processCard(card: Element): Promise<void> {
    // Skip already processed cards
    if (card.hasAttribute('data-jobfiltr-processed')) return;

    const job = this.adapter.extractJobData(card);
    if (!job) return;

    this.stats.totalScanned++;

    const results: DetectionResult[] = [];
    let shouldHide = false;

    // ═══════════════════════════════════════════════════════════════════════════
    // PROCESSING ORDER (CRITICAL)
    // ═══════════════════════════════════════════════════════════════════════════

    // 1. Include Keywords (Pro Feature) - if fails, HIDE
    const includeResult = includeKeywordsFilter.analyze(job);
    if (!includeResult.passed) {
      shouldHide = true;
      this.stats.includeKeywordMisses++;
      results.push({
        detected: true,
        confidence: 1,
        category: 'include_keyword',
        message: includeResult.reason || 'Missing keywords',
        evidence: includeResult.missingKeywords || []
      });
    }

    // 2. Exclude Keywords - if matches, HIDE
    if (!shouldHide) {
      const excludeKwResult = excludeKeywordsFilter.analyze(job);
      if (!excludeKwResult.passed) {
        shouldHide = true;
        this.stats.excludeKeywordMatches++;
        results.push({
          detected: true,
          confidence: 1,
          category: 'exclude_keyword',
          message: excludeKwResult.reason || 'Contains blocked keyword',
          evidence: excludeKwResult.matchedKeywords || []
        });
      }
    }

    // 3. Exclude Companies - if matches, HIDE
    if (!shouldHide) {
      const excludeCoResult = excludeCompaniesFilter.analyze(job);
      if (!excludeCoResult.passed) {
        shouldHide = true;
        this.stats.companiesBlocked++;
        results.push({
          detected: true,
          confidence: 1,
          category: 'company',
          message: excludeCoResult.reason || 'Blocked company',
          evidence: excludeCoResult.blockedCompany ? [excludeCoResult.blockedCompany] : []
        });
      }
    }

    // 4. Ghost Job Detection - FLAG but respect settings
    if (this.settings?.hideGhostJobs) {
      const ghostResult = ghostJobDetector.analyze(job);
      if (ghostResult.detected) {
        results.push(ghostResult);
        if (ghostResult.confidence > 0.7) {
          shouldHide = true;
          this.stats.ghostJobsFiltered++;
        }
      }
    }

    // 5. Staffing Firm Detection - FLAG but respect settings
    if (this.settings?.hideStaffingFirms) {
      const staffingResult = staffingFirmDetector.analyze(job);
      if (staffingResult.detected) {
        results.push(staffingResult);
        if (staffingResult.confidence > 0.7) {
          shouldHide = true;
          this.stats.staffingFiltered++;
        }
      }
    }

    // 6. Remote Verification - FLAG but don't auto-hide
    if (this.settings?.verifyTrueRemote) {
      const remoteResult = remoteVerifier.analyze(job);
      if (remoteResult.detected) {
        results.push(remoteResult);
        this.stats.remoteIssuesFiltered++;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // APPLY RESULTS
    // ═══════════════════════════════════════════════════════════════════════════

    if (shouldHide) {
      this.stats.totalFiltered++;
      this.adapter.hideJob(job);
    } else if (results.length > 0) {
      this.adapter.applyVisualIndicator(job, results);
    }

    // Mark card as processed
    card.setAttribute('data-jobfiltr-processed', 'true');
  }

  private updateBadge(): void {
    try {
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        payload: { count: this.stats.totalFiltered }
      }).catch(() => {
        // Extension context may be invalidated
      });
    } catch {
      // Ignore errors if chrome runtime is unavailable
    }
  }

  getStats(): FilterStats {
    return { ...this.stats };
  }

  async refresh(): Promise<void> {
    // Reload settings
    this.settings = await hybridStorage.getSettings();

    // Refresh all filters
    await Promise.all([
      staffingFirmDetector.refresh(),
      includeKeywordsFilter.refresh(),
      excludeKeywordsFilter.refresh(),
      excludeCompaniesFilter.refresh()
    ]);

    // Reset stats
    this.stats = {
      totalScanned: 0,
      totalFiltered: 0,
      ghostJobsFiltered: 0,
      staffingFiltered: 0,
      remoteIssuesFiltered: 0,
      includeKeywordMisses: 0,
      excludeKeywordMatches: 0,
      companiesBlocked: 0
    };
  }
}
