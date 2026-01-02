"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertCircle,
  Search
} from "lucide-react";

interface UnifiedScanResultsProps {
  scanId: Id<"jobScans"> | Id<"scans">;
  onRequestDeeper?: (email: string) => Promise<void>;
}

export function UnifiedScanResults({ scanId, onRequestDeeper }: UnifiedScanResultsProps) {
  // Try both query types to support both scan systems
  const ghostScan = useQuery(api.jobScans.getJobScanById, { jobScanId: scanId as Id<"jobScans"> });
  const manualScan = useQuery(
    api.scans.queries.getScanResultByIdQuery,
    ghostScan ? "skip" : { scanId: scanId as Id<"scans"> }
  );

  const scan = ghostScan || manualScan;

  if (!scan) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading scan results...</p>
        </CardContent>
      </Card>
    );
  }

  const { report } = scan;
  const isAnalyzing =
    report.jobTitle === "Analyzing..." || report.aiAnalysis === "Analysis pending...";

  const getConfidenceColor = (score: number) => {
    if (score >= 75) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getConfidenceGradient = (score: number) => {
    if (score >= 75) return "from-green-500 to-emerald-500";
    if (score >= 50) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-rose-500";
  };

  const getStatusIcon = () => {
    if (isAnalyzing) {
      return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
    }
    if (report.isScam) {
      return (
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
      );
    }
    if (report.isGhostJob) {
      return (
        <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
          <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        </div>
      );
    }
    return (
      <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
    );
  };

  const getStatusBadge = () => {
    if (isAnalyzing) {
      return <Badge variant="secondary" className="text-sm px-3 py-1">Analyzing...</Badge>;
    }
    if (report.isScam) {
      return <Badge variant="destructive" className="text-sm px-3 py-1">Likely Scam</Badge>;
    }
    if (report.isGhostJob) {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-sm px-3 py-1">Ghost Job</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600 text-sm px-3 py-1">Legitimate</Badge>;
  };

  // Removed unused function - will be added back when needed for severity indicators

  return (
    <div className="space-y-6">
      {/* Main Results Card */}
      <Card className="shadow-lg">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start gap-4">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <CardTitle className="text-3xl leading-tight">
                  {report.jobTitle}
                </CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription className="text-base">
                {report.company}
                {report.location && (
                  <>
                    <span className="mx-2">•</span>
                    {report.location}
                  </>
                )}
              </CardDescription>
            </div>
          </div>

          <Separator />

          {/* Legitimacy Score with Visual Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Legitimacy Score</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold ${getConfidenceColor(report.confidenceScore)}`}>
                  {report.confidenceScore}
                </span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getConfidenceGradient(report.confidenceScore)} transition-all duration-1000 ease-out`}
                style={{ width: `${report.confidenceScore}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                High Risk
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Low Risk
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-xl border-2 transition-all duration-300 ${
              report.isScam
                ? "bg-red-500/90 border-red-600 shadow-lg shadow-red-400/40 animate-pulse-subtle"
                : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {report.isScam ? (
                  <XCircle className="h-7 w-7 text-white animate-bounce-gentle" />
                ) : (
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                )}
                <span className={`font-bold text-lg ${
                  report.isScam ? "text-white" : "text-gray-900 dark:text-gray-100"
                }`}>
                  Scam Detection
                </span>
              </div>
              <p className={`text-base font-semibold ${
                report.isScam ? "text-white" : "text-muted-foreground"
              }`}>
                {report.isScam ? "Potential scam detected" : "No scam indicators found"}
              </p>
            </div>

            <div className={`p-5 rounded-xl border-2 transition-all duration-300 ${
              report.isGhostJob
                ? "bg-orange-500/90 border-orange-600 shadow-lg shadow-orange-400/40 animate-pulse-subtle"
                : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {report.isGhostJob ? (
                  <AlertTriangle className="h-7 w-7 text-white animate-bounce-gentle" />
                ) : (
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                )}
                <span className={`font-bold text-lg ${
                  report.isGhostJob ? "text-white" : "text-gray-900 dark:text-gray-100"
                }`}>
                  Ghost Job Check
                </span>
              </div>
              <p className={`text-base font-semibold ${
                report.isGhostJob ? "text-white" : "text-muted-foreground"
              }`}>
                {report.isGhostJob ? "Possible ghost job listing" : "Appears to be active"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Summary</h3>
            <p className="text-muted-foreground leading-relaxed">{report.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Red Flags */}
      {report.redFlags && report.redFlags.length > 0 && (
        <Card className="border-red-300 dark:border-red-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-7 w-7 text-red-600" />
              Top Red Flags Detected
              <Badge variant="destructive" className="ml-2 text-sm">{report.redFlags.length}</Badge>
            </CardTitle>
            <CardDescription>
              Critical issues and concerns identified in this job posting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.redFlags.map((flag, index) => (
                <div
                  key={index}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    flag.severity === "high"
                      ? "bg-red-600 border-red-700 shadow-md animate-flash"
                      : flag.severity === "medium"
                      ? "bg-orange-600 border-orange-700 shadow-md"
                      : "bg-yellow-500 border-yellow-600 shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className={`h-6 w-6 mt-0.5 flex-shrink-0 text-white ${
                      flag.severity === "high" ? "animate-pulse" : ""
                    }`} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-lg text-white">
                          {flag.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <Badge className={`text-xs font-bold ${
                          flag.severity === "high"
                            ? "bg-red-900 text-white border-red-800"
                            : flag.severity === "medium"
                            ? "bg-orange-900 text-white border-orange-800"
                            : "bg-yellow-700 text-white border-yellow-600"
                        }`}>
                          {flag.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-base text-white leading-relaxed">{flag.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Details */}
      {(report.keyQualifications.length > 0 || report.responsibilities.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Job Details</CardTitle>
            <CardDescription>Key requirements and responsibilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {report.keyQualifications.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Key Qualifications
                </h3>
                <ul className="space-y-2">
                  {report.keyQualifications.map((qual, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="text-primary mt-1 flex-shrink-0">•</span>
                      <span className="text-muted-foreground">{qual}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.responsibilities.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Responsibilities
                </h3>
                <ul className="space-y-2">
                  {report.responsibilities.map((resp, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <span className="text-primary mt-1 flex-shrink-0">•</span>
                      <span className="text-muted-foreground">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Web Research Results */}
      {!isAnalyzing && "webResearch" in report && report.webResearch && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="h-6 w-6 text-blue-500" />
              Web Research Verification
            </CardTitle>
            <CardDescription>
              Cross-referenced information from multiple web sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-2 ${
                report.webResearch.companyWebsiteFound
                  ? "bg-green-600 border-green-700"
                  : "bg-red-600 border-red-700"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {report.webResearch.companyWebsiteFound ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <XCircle className="h-5 w-5 text-white" />
                  )}
                  <span className="font-semibold text-white">Company Website</span>
                </div>
                <p className="text-sm text-white">
                  {report.webResearch.companyWebsiteFound
                    ? "Official website found and verified"
                    : "No official website found"}
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                report.webResearch.careersPageFound
                  ? "bg-green-600 border-green-700"
                  : "bg-orange-600 border-orange-700"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {report.webResearch.careersPageFound ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-white" />
                  )}
                  <span className="font-semibold text-white">Careers Page</span>
                </div>
                <p className="text-sm text-white">
                  {report.webResearch.careersPageFound
                    ? "Found on company careers page"
                    : "Not found on official careers page"}
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                report.webResearch.duplicatePostingsCount > 5
                  ? "bg-orange-600 border-orange-700"
                  : report.webResearch.duplicatePostingsCount > 0
                    ? "bg-blue-600 border-blue-700"
                    : "bg-gray-600 border-gray-700"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-white" />
                  <span className="font-semibold text-white">Duplicate Postings</span>
                </div>
                <p className="text-sm text-white">
                  Found {report.webResearch.duplicatePostingsCount} similar posting{report.webResearch.duplicatePostingsCount !== 1 ? 's' : ''} across job boards
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                report.webResearch.verifiedOnOfficialSite
                  ? "bg-green-600 border-green-700"
                  : "bg-yellow-600 border-yellow-700"
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {report.webResearch.verifiedOnOfficialSite ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-white" />
                  )}
                  <span className="font-semibold text-white">Official Verification</span>
                </div>
                <p className="text-sm text-white">
                  {report.webResearch.verifiedOnOfficialSite
                    ? "Verified on company's official site"
                    : "Could not verify on official site"}
                </p>
              </div>
            </div>

            {report.webResearch.reputationSources.length > 0 && (
              <div className="mt-4 p-4 bg-purple-600 border-2 border-purple-700 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                  <Shield className="h-4 w-4 text-white" />
                  Reputation Sources Found
                </h4>
                <ul className="space-y-1 text-sm text-white">
                  {report.webResearch.reputationSources.slice(0, 3).map((source, index) => (
                    <li key={index} className="truncate">• {source}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {!isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">AI Analysis</CardTitle>
            <CardDescription>
              Detailed insights and recommendations from our AI system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {report.aiAnalysis}
              </p>
            </div>
          </CardContent>
          {onRequestDeeper && (
            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
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
                <Mail className="mr-2 h-4 w-4" />
                Request Detailed Report
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
