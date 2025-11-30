"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

interface JobScanResultsProps {
  scanId: Id<"jobScans">;
}

export default function JobScanResults({ scanId }: JobScanResultsProps) {
  const scan = useQuery(api.jobScans.getJobScanById, { jobScanId: scanId });

  if (!scan) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { report } = scan;
  const isAnalyzing =
    report.jobTitle === "Analyzing..." || report.aiAnalysis === "Analysis pending...";

  const getStatusIcon = () => {
    if (isAnalyzing) {
      return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
    }
    if (report.isScam) {
      return <XCircle className="h-6 w-6 text-destructive" />;
    }
    if (report.isGhostJob) {
      return <AlertTriangle className="h-6 w-6 text-orange-500" />;
    }
    return <CheckCircle2 className="h-6 w-6 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (isAnalyzing) {
      return <Badge variant="secondary">Analyzing...</Badge>;
    }
    if (report.isScam) {
      return <Badge variant="destructive">Likely Scam</Badge>;
    }
    if (report.isGhostJob) {
      return <Badge variant="destructive" className="bg-orange-500">Ghost Job</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Legitimate</Badge>;
  };

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return "text-yellow-500";
      case "medium":
        return "text-orange-500";
      case "high":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon()}
                <CardTitle className="text-2xl">{report.jobTitle}</CardTitle>
              </div>
              <CardDescription className="text-base">
                {report.company}
                {report.location && ` • ${report.location}`}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Confidence Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Confidence Score</span>
                <span className="text-sm font-bold">{report.confidenceScore}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    report.confidenceScore >= 70
                      ? "bg-destructive"
                      : report.confidenceScore >= 40
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${report.confidenceScore}%` }}
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{report.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {!isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.aiAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {/* Red Flags */}
      {report.redFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Red Flags Detected ({report.redFlags.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.redFlags.map((flag, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${getSeverityColor(flag.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{flag.type.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="text-xs">
                          {flag.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Qualifications */}
      {report.keyQualifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Qualifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.keyQualifications.map((qual, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{qual}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Responsibilities */}
      {report.responsibilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.responsibilities.map((resp, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{resp}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
