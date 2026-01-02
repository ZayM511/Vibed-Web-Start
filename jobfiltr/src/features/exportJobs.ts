// Export jobs feature (Pro)
import type { JobData } from '../types';
import type { JobAnalysis } from './jobAnalysis';

export type ExportFormat = 'csv' | 'json' | 'markdown';

export function exportJobs(jobs: JobData[], format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return exportToCsv(jobs);
    case 'json':
      return exportToJson(jobs);
    case 'markdown':
      return exportToMarkdown(jobs);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

export function exportAnalysis(analyses: JobAnalysis[], format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return exportAnalysisToCsv(analyses);
    case 'json':
      return JSON.stringify(analyses, null, 2);
    case 'markdown':
      return exportAnalysisToMarkdown(analyses);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

function exportToCsv(jobs: JobData[]): string {
  const headers = ['Title', 'Company', 'Location', 'Posted', 'Remote', 'Salary', 'URL'];
  const rows = jobs.map((job) => [
    escapeCsv(job.title),
    escapeCsv(job.company),
    escapeCsv(job.location),
    job.postDate || 'Unknown',
    job.isRemote ? 'Yes' : 'No',
    job.salary || 'Not listed',
    job.url,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function exportToJson(jobs: JobData[]): string {
  const exportData = jobs.map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location,
    postDate: job.postDate,
    isRemote: job.isRemote,
    remoteType: job.remoteType,
    salary: job.salary,
    url: job.url,
    platform: job.platform,
  }));

  return JSON.stringify(exportData, null, 2);
}

function exportToMarkdown(jobs: JobData[]): string {
  const lines = ['# Exported Jobs\n'];

  for (const job of jobs) {
    lines.push(`## ${job.title}`);
    lines.push(`**Company:** ${job.company}`);
    lines.push(`**Location:** ${job.location}`);
    lines.push(`**Posted:** ${job.postDate || 'Unknown'}`);
    if (job.salary) lines.push(`**Salary:** ${job.salary}`);
    lines.push(`**Remote:** ${job.isRemote ? 'Yes' : 'No'}`);
    lines.push(`[View Job](${job.url})\n`);
  }

  return lines.join('\n');
}

function exportAnalysisToCsv(analyses: JobAnalysis[]): string {
  const headers = ['Title', 'Company', 'Score', 'Ghost Risk', 'Staffing Firm', 'Remote Type', 'Warnings'];
  const rows = analyses.map((a) => [
    escapeCsv(a.job.title),
    escapeCsv(a.job.company),
    a.overallScore.toString(),
    a.ghostDetection.detected ? 'Yes' : 'No',
    a.staffingDetection.detected ? 'Yes' : 'No',
    a.remoteVerification.remoteType,
    escapeCsv(a.warnings.join('; ')),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function exportAnalysisToMarkdown(analyses: JobAnalysis[]): string {
  const lines = ['# Job Analysis Report\n'];

  for (const a of analyses) {
    lines.push(`## ${a.job.title} at ${a.job.company}`);
    lines.push(`**Score:** ${a.overallScore}/100`);
    lines.push(`**Ghost Job Risk:** ${a.ghostDetection.detected ? 'Yes' : 'No'}`);
    lines.push(`**Staffing Firm:** ${a.staffingDetection.detected ? 'Yes' : 'No'}`);
    lines.push(`**Remote Type:** ${a.remoteVerification.remoteType}`);

    if (a.warnings.length > 0) {
      lines.push('\n### Warnings');
      a.warnings.forEach((w) => lines.push(`- ${w}`));
    }

    if (a.recommendations.length > 0) {
      lines.push('\n### Recommendations');
      a.recommendations.forEach((r) => lines.push(`- ${r}`));
    }

    lines.push('');
  }

  return lines.join('\n');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadExport(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
