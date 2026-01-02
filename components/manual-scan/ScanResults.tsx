"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, XCircle, Mail, FileText } from "lucide-react";

interface RedFlag {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface ScanReport {
  jobTitle: string;
  company: string;
  location?: string;
  summary: string;
  keyQualifications: string[];
  responsibilities: string[];
  redFlags?: RedFlag[];
  confidenceScore: number;
  isScam?: boolean;
  isGhostJob?: boolean;
  isSpam?: boolean;
  spamReasoning?: string;
  aiAnalysis: string;
}

interface ScanResultsProps {
  report: ScanReport;
  scanId?: string; // Used for future features like sharing or direct linking
  onRequestDeeper?: (email: string) => Promise<void>;
}

export function ScanResults({ report, onRequestDeeper }: ScanResultsProps) {
  const getConfidenceColor = (score: number) => {
    if (score >= 75) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 75) return { variant: "default" as const, label: "High Confidence" };
    if (score >= 50) return { variant: "outline" as const, label: "Medium Confidence" };
    return { variant: "destructive" as const, label: "Low Confidence" };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const confidenceBadge = getConfidenceBadge(report.confidenceScore);

  return (
    <div className="space-y-6">
      {/* Overall Assessment Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{report.jobTitle}</CardTitle>
              <CardDescription className="text-base">
                {report.company}
                {report.location && ` • ${report.location}`}
              </CardDescription>
            </div>
            <Badge variant={confidenceBadge.variant} className="text-sm">
              {confidenceBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Legitimacy Score</span>
              <span className={`text-2xl font-bold ${getConfidenceColor(report.confidenceScore)}`}>
                {report.confidenceScore}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  report.confidenceScore >= 75
                    ? "bg-green-500"
                    : report.confidenceScore >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${report.confidenceScore}%` }}
              />
            </div>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              {report.isScam ? (
                <XCircle className="size-5 text-red-500" />
              ) : (
                <CheckCircle2 className="size-5 text-green-500" />
              )}
              <div>
                <div className="text-sm font-medium">Scam Detection</div>
                <div className="text-xs text-muted-foreground">
                  {report.isScam ? "Potential Scam" : "No Scam Detected"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              {report.isGhostJob ? (
                <AlertTriangle className="size-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="size-5 text-green-500" />
              )}
              <div>
                <div className="text-sm font-medium">Ghost Job Check</div>
                <div className="text-xs text-muted-foreground">
                  {report.isGhostJob ? "Possible Ghost Job" : "Appears Active"}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold">Summary</h3>
            <p className="text-sm text-muted-foreground">{report.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Red Flags Card */}
      {report.redFlags && report.redFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" />
              Red Flags Detected ({report.redFlags.length})
            </CardTitle>
            <CardDescription>
              Issues and concerns identified in this job posting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.redFlags.map((flag, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{flag.type.replace(/_/g, " ").toUpperCase()}</span>
                    <Badge className={getSeverityColor(flag.severity)}>
                      {flag.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Qualifications */}
          {report.keyQualifications.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Key Qualifications</h3>
              <ul className="space-y-1">
                {report.keyQualifications.map((qual, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{qual}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {report.responsibilities.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Responsibilities</h3>
              <ul className="space-y-1">
                {report.responsibilities.map((resp, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>
            Detailed insights and recommendations from our AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {report.aiAnalysis}
          </p>
        </CardContent>
        {onRequestDeeper && (
          <CardFooter className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <FileText className="size-4" />
              Export Report
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={() => {
                const email = prompt("Enter your email to receive a detailed report:");
                if (email) {
                  onRequestDeeper(email);
                }
              }}
            >
              <Mail className="size-4" />
              Request Detailed Report
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
