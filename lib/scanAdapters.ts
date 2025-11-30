/**
 * Data adapters for normalizing scan data from different tables
 * Handles the mismatch between `scans` and `jobScans` schemas
 */

import { Id } from "@/convex/_generated/dataModel";

/**
 * Unified scan interface that both scan types conform to
 * This is what components expect to receive
 */
export interface UnifiedScan {
  _id: string; // Generic ID string (can be from either table)
  _creationTime: number;
  type: "manual" | "ghost";
  timestamp: number;
  userId: string;
  jobInput: string;
  context?: string;
  report: {
    jobTitle: string;
    company: string;
    location?: string;
    summary: string;
    keyQualifications: string[];
    responsibilities: string[];
    confidenceScore: number;
    aiAnalysis: string;
    // Optional fields with defaults
    isScam: boolean;
    isGhostJob: boolean;
    redFlags: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
    }>;
    webResearch?: {
      companyWebsiteFound: boolean;
      careersPageFound: boolean;
      duplicatePostingsCount: number;
      verifiedOnOfficialSite: boolean;
      reputationSources: string[];
    };
  };
}

/**
 * Manual scan type from `scans` table
 */
interface ManualScan {
  _id: Id<"scans">;
  _creationTime: number;
  userId: string;
  jobInput: string;
  context?: string;
  timestamp: number;
  report: {
    jobTitle: string;
    company: string;
    location?: string;
    summary: string;
    keyQualifications: string[];
    responsibilities: string[];
    confidenceScore: number;
    aiAnalysis: string;
  };
}

/**
 * Ghost job scan type from `jobScans` table
 */
interface GhostJobScan {
  _id: Id<"jobScans">;
  _creationTime: number;
  userId: string;
  jobInput: string;
  jobUrl?: string;
  context?: string;
  timestamp: number;
  report: {
    jobTitle: string;
    company: string;
    location?: string;
    summary: string;
    keyQualifications: string[];
    responsibilities: string[];
    confidenceScore: number;
    aiAnalysis: string;
    isScam: boolean;
    isGhostJob: boolean;
    redFlags: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
    }>;
    webResearch?: {
      companyWebsiteFound: boolean;
      careersPageFound: boolean;
      duplicatePostingsCount: number;
      verifiedOnOfficialSite: boolean;
      reputationSources: string[];
    };
  };
}

/**
 * Adapts a manual scan from `scans` table to unified format
 * Adds default values for missing fields
 */
export function adaptManualScan(scan: ManualScan): UnifiedScan {
  return {
    _id: scan._id,
    _creationTime: scan._creationTime,
    type: "manual",
    timestamp: scan.timestamp,
    userId: scan.userId,
    jobInput: scan.jobInput,
    context: scan.context,
    report: {
      ...scan.report,
      // Add default values for fields that don't exist in scans table
      isScam: false,
      isGhostJob: false,
      redFlags: [],
      webResearch: undefined,
    },
  };
}

/**
 * Adapts a ghost job scan from `jobScans` table to unified format
 * No transformation needed, just type casting
 */
export function adaptGhostJobScan(scan: GhostJobScan): UnifiedScan {
  return {
    _id: scan._id,
    _creationTime: scan._creationTime,
    type: "ghost",
    timestamp: scan.timestamp,
    userId: scan.userId,
    jobInput: scan.jobInput,
    context: scan.context,
    report: scan.report,
  };
}

/**
 * Combines and sorts manual and ghost job scans into a unified list
 * Most recent scans first
 */
export function combineAndSortScans(
  manualScans: ManualScan[] | undefined,
  ghostJobScans: GhostJobScan[] | undefined
): UnifiedScan[] {
  const adapted = [
    ...(manualScans || []).map(adaptManualScan),
    ...(ghostJobScans || []).map(adaptGhostJobScan),
  ];

  return adapted.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Gets status data based on scan report
 * Used for UI styling and status indicators
 */
export function getScanStatus(scan: UnifiedScan) {
  const { report } = scan;

  if (report.jobTitle === "Analyzing...") {
    return {
      variant: "analyzing" as const,
      label: "Analyzing",
      color: "blue",
    };
  }

  if (report.isScam) {
    return {
      variant: "scam" as const,
      label: "Likely Scam",
      color: "red",
    };
  }

  if (report.isGhostJob) {
    return {
      variant: "ghost" as const,
      label: "Ghost Job",
      color: "orange",
    };
  }

  return {
    variant: "verified" as const,
    label: "Verified",
    color: "green",
  };
}

/**
 * Gets risk level based on confidence score
 */
export function getRiskLevel(confidenceScore: number) {
  if (confidenceScore >= 75) {
    return {
      level: "low" as const,
      label: "Low Risk",
      color: "green",
    };
  }

  if (confidenceScore >= 50) {
    return {
      level: "medium" as const,
      label: "Medium Risk",
      color: "yellow",
    };
  }

  return {
    level: "high" as const,
    label: "High Risk",
    color: "red",
  };
}
