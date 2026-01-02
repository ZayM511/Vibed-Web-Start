import type { ExportJob } from '@/types';
import { hybridStorage } from '@/storage/hybridStorage';

class ExportService {
  /**
   * Export filtered jobs to CSV format
   */
  async exportToCSV(jobs: ExportJob[]): Promise<string> {
    const { isPro } = await hybridStorage.getProStatus();
    if (!isPro) throw new Error('Pro subscription required to export jobs');

    const headers = ['Title', 'Company', 'Location', 'Posted', 'URL', 'Filter Reason'];

    const rows = jobs.map(j => [
      `"${this.escapeCSV(j.title)}"`,
      `"${this.escapeCSV(j.company)}"`,
      `"${this.escapeCSV(j.location)}"`,
      `"${this.escapeCSV(j.postDate)}"`,
      `"${this.escapeCSV(j.url)}"`,
      `"${this.escapeCSV(j.filteredReason || '')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Export filtered jobs to JSON format
   */
  async exportToJSON(jobs: ExportJob[]): Promise<string> {
    const { isPro } = await hybridStorage.getProStatus();
    if (!isPro) throw new Error('Pro subscription required to export jobs');

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalJobs: jobs.length,
      jobs: jobs.map(j => ({
        title: j.title,
        company: j.company,
        location: j.location,
        postDate: j.postDate,
        url: j.url,
        filteredReason: j.filteredReason || null
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Trigger file download in the browser
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Export jobs as CSV and download
   */
  async downloadCSV(jobs: ExportJob[], filename?: string): Promise<void> {
    const csv = await this.exportToCSV(jobs);
    const defaultFilename = `jobfiltr-export-${this.formatDate(new Date())}.csv`;
    this.downloadFile(csv, filename || defaultFilename, 'text/csv;charset=utf-8');
  }

  /**
   * Export jobs as JSON and download
   */
  async downloadJSON(jobs: ExportJob[], filename?: string): Promise<void> {
    const json = await this.exportToJSON(jobs);
    const defaultFilename = `jobfiltr-export-${this.formatDate(new Date())}.json`;
    this.downloadFile(json, filename || defaultFilename, 'application/json');
  }

  /**
   * Escape special characters for CSV
   */
  private escapeCSV(str: string): string {
    return str.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
  }

  /**
   * Format date for filename
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get export statistics
   */
  getExportStats(jobs: ExportJob[]): {
    total: number;
    byReason: Record<string, number>;
    byCompany: Record<string, number>;
  } {
    const byReason: Record<string, number> = {};
    const byCompany: Record<string, number> = {};

    for (const job of jobs) {
      // Count by filter reason
      const reason = job.filteredReason || 'Unfiltered';
      byReason[reason] = (byReason[reason] || 0) + 1;

      // Count by company
      byCompany[job.company] = (byCompany[job.company] || 0) + 1;
    }

    return {
      total: jobs.length,
      byReason,
      byCompany
    };
  }
}

export const exportService = new ExportService();
