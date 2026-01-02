"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Trash2, XCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ScanHistoryItem {
  _id: Id<"scans">;
  timestamp: number;
  jobInput: string;
  jobUrl?: string;
  report: {
    jobTitle: string;
    company: string;
    location?: string;
    confidenceScore: number;
    isScam?: boolean;
    isGhostJob?: boolean;
    isSpam?: boolean;
    spamReasoning?: string;
    redFlags?: Array<{
      type: string;
      description: string;
      severity: "low" | "medium" | "high";
    }>;
  };
}

interface ScanHistoryProps {
  scans: ScanHistoryItem[];
  onViewDetails: (scanId: Id<"scans">) => void;
  onDelete?: (scanId: Id<"scans">) => Promise<void>;
}

export function ScanHistory({ scans, onViewDetails, onDelete }: ScanHistoryProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 75) return { variant: "default" as const, label: "High", color: "text-green-600" };
    if (score >= 50) return { variant: "outline" as const, label: "Medium", color: "text-yellow-600" };
    return { variant: "destructive" as const, label: "Low", color: "text-red-600" };
  };

  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="size-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Scan History</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Your past job scans will appear here. Start by scanning your first job posting above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan History</CardTitle>
        <CardDescription>
          View and manage your previous job posting scans
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scans.map((scan, index) => {
            const badge = getConfidenceBadge(scan.report.confidenceScore);

            return (
              <div key={scan._id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {scan.report.jobTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {scan.report.company}
                        {scan.report.location && ` • ${scan.report.location}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(scan.timestamp)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={badge.variant} className="shrink-0">
                      {badge.label}
                    </Badge>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Score:</span>
                      <span className={`font-medium ${badge.color}`}>
                        {scan.report.confidenceScore}%
                      </span>
                    </div>
                    {scan.report.isScam && (
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <XCircle className="size-4" />
                        <span className="text-xs font-medium">Potential Scam</span>
                      </div>
                    )}
                    {scan.report.isGhostJob && (
                      <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="size-4" />
                        <span className="text-xs font-medium">Ghost Job</span>
                      </div>
                    )}
                    {!scan.report.isScam && !scan.report.isGhostJob && (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="size-4" />
                        <span className="text-xs font-medium">Looks Good</span>
                      </div>
                    )}
                  </div>

                  {/* Red Flags Preview */}
                  {scan.report.redFlags && scan.report.redFlags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-yellow-600" />
                      <span className="text-sm text-muted-foreground">
                        {scan.report.redFlags.length} red flag{scan.report.redFlags.length !== 1 ? "s" : ""} detected
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(scan._id)}
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    {scan.jobUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={scan.jobUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(scan._id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
