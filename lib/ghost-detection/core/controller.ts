/**
 * Ghost Detection Controller
 * Main orchestrator for the ghost job detection system
 */

import type { JobListing, GhostJobScore, DetectionConfig } from './types';
import { storageManager } from '../data/storage-manager';
import { blacklistSyncService } from '../data/blacklist-sync';
import { ghostDetector } from './ghost-detector';

export class GhostDetectionController {
  private config: DetectionConfig | null = null;
  private initialized = false;
  private currentJob: JobListing | null = null;
  private currentScore: GhostJobScore | null = null;

  /**
   * Initialize the detection system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[GhostDetection] Initializing...');

    // Initialize storage
    await storageManager.initialize();

    // Load config
    this.config = await storageManager.getConfig();

    // Sync blacklist in background
    blacklistSyncService.sync().catch((error) => {
      console.warn('[GhostDetection] Blacklist sync failed:', error);
    });

    this.initialized = true;
    console.log('[GhostDetection] Initialized successfully');
  }

  /**
   * Analyze a job listing
   */
  async analyzeJob(job: JobListing): Promise<GhostJobScore> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.currentJob = job;
    const score = await ghostDetector.analyze(job);
    this.currentScore = score;

    console.log(
      `[GhostDetection] Analyzed job: ${job.title} @ ${job.company} - Score: ${score.overall} (${score.category})`
    );

    return score;
  }

  /**
   * Get the current job being analyzed
   */
  getCurrentJob(): JobListing | null {
    return this.currentJob;
  }

  /**
   * Get the current score
   */
  getCurrentScore(): GhostJobScore | null {
    return this.currentScore;
  }

  /**
   * Force sync the blacklist
   */
  async syncBlacklist(): Promise<{ success: boolean; count: number }> {
    return blacklistSyncService.sync(true);
  }

  /**
   * Get detection configuration
   */
  getConfig(): DetectionConfig | null {
    return this.config;
  }

  /**
   * Update detection configuration
   */
  async updateConfig(updates: Partial<DetectionConfig>): Promise<void> {
    await storageManager.updateConfig(updates);
    this.config = await storageManager.getConfig();
  }

  /**
   * Check if detection is enabled
   */
  isEnabled(): boolean {
    return this.config?.enabled ?? true;
  }

  /**
   * Check if auto-hide is enabled and should trigger
   */
  shouldAutoHide(score: GhostJobScore): boolean {
    if (!this.config?.autoHide) return false;
    return score.overall >= this.config.autoHideThreshold;
  }

  /**
   * Get score details for display
   */
  getScoreDetails(): {
    job: JobListing | null;
    score: GhostJobScore | null;
    breakdown: GhostJobScore['breakdown'] | null;
    signals: GhostJobScore['signals'] | null;
  } {
    return {
      job: this.currentJob,
      score: this.currentScore,
      breakdown: this.currentScore?.breakdown ?? null,
      signals: this.currentScore?.signals ?? null,
    };
  }

  /**
   * Clear current analysis
   */
  clearCurrent(): void {
    this.currentJob = null;
    this.currentScore = null;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const ghostDetectionController = new GhostDetectionController();
