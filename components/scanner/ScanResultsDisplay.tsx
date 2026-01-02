"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  Eye,
  Sparkles,
  Loader2,
  Globe,
  FileText,
  Search,
  AlertTriangle,
  Zap,
  Mail,
  Ghost,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getRiskLevel } from "@/lib/scanAdapters";

interface ScanResultsDisplayProps {
  scanId: string;
  scanType: "manual" | "ghost";
}

/**
 * Unified scan results display component
 * Handles both manual and ghost job scans gracefully
 * Shows only available data, hides missing fields
 */
export function ScanResultsDisplay({
  scanId,
  scanType,
}: ScanResultsDisplayProps) {
  // Query based on scan type
  const ghostScan = useQuery(
    api.jobScans.getJobScanById,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scanType === "ghost" ? { jobScanId: scanId as any } : "skip"
  );
  const manualScan = useQuery(
    api.scans.queries.getScanResultByIdQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scanType === "manual" ? { scanId: scanId as any } : "skip"
  );

  const scan = scanType === "ghost" ? ghostScan : manualScan;

  // Loading state
  if (!scan) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { report, scanMode } = scan;
  const isAnalyzing =
    report.jobTitle === "Analyzing..." ||
    report.aiAnalysis === "Analysis pending...";
  const risk = getRiskLevel(report.confidenceScore);
  const isDeepAnalysis = scanMode === "deep";

  // Type guard for fields that may not exist
  const hasRedFlags = "redFlags" in report && Array.isArray(report.redFlags);
  const webResearchData = "webResearch" in report ? report.webResearch : null;
  const hasWebResearch = !!webResearchData;
  const isScam = "isScam" in report ? report.isScam : false;
  const isGhostJob = "isGhostJob" in report ? report.isGhostJob : false;
  const isSpam = "isSpam" in report ? report.isSpam : false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _spamReasoning = "spamReasoning" in report ? report.spamReasoning : undefined;

  // Status colors
  const statusColors = isAnalyzing
    ? {
        bg: "from-blue-500/20 via-cyan-500/10 to-transparent",
        border: "border-blue-400/30",
        icon: Clock,
        iconColor: "text-blue-400",
        label: "Analyzing...",
        badgeBg: "bg-blue-500/20 text-blue-300 border-blue-400/30",
      }
    : isScam
    ? {
        bg: "from-red-500/20 via-pink-500/10 to-transparent",
        border: "border-red-400/30",
        icon: XCircle,
        iconColor: "text-red-400",
        label: "Likely Scam",
        badgeBg: "bg-red-500/20 text-red-300 border-red-400/30",
      }
    : isGhostJob
    ? {
        bg: "from-orange-500/20 via-yellow-500/10 to-transparent",
        border: "border-orange-400/30",
        icon: AlertCircle,
        iconColor: "text-orange-400",
        label: "Ghost Job",
        badgeBg: "bg-orange-500/20 text-orange-300 border-orange-400/30",
      }
    : {
        bg: "from-green-500/20 via-emerald-500/10 to-transparent",
        border: "border-green-400/30",
        icon: CheckCircle2,
        iconColor: "text-green-400",
        label: "Verified",
        badgeBg: "bg-green-500/20 text-green-300 border-green-400/30",
      };

  const StatusIcon = statusColors.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Main Job Info Card */}
      <Card
        className={`border-2 ${statusColors.border} bg-white/5 backdrop-blur-xl overflow-hidden`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${statusColors.bg}`} />

        <CardContent className="relative p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <motion.div
              animate={isAnalyzing ? { rotate: 360 } : {}}
              transition={
                isAnalyzing
                  ? { duration: 2, repeat: Infinity, ease: "linear" }
                  : {}
              }
              className={`flex-shrink-0 p-4 rounded-xl bg-white/10 border-2 ${statusColors.border}`}
            >
              <StatusIcon className={`h-8 w-8 ${statusColors.iconColor}`} />
            </motion.div>

            {/* Title and Company */}
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                {report.jobTitle}
              </h1>
              <div className="flex items-center gap-2 text-white/70">
                <Globe className="h-4 w-4" />
                <span className="text-lg">{report.company}</span>
                {report.location && (
                  <>
                    <span>•</span>
                    <span>{report.location}</span>
                  </>
                )}
              </div>
            </div>

            {/* Status & Scan Type Badges */}
            <div className="flex flex-col gap-2">
              <Badge className={`${statusColors.badgeBg} px-4 py-2 text-sm font-bold border-2`}>
                {statusColors.label}
              </Badge>
              {scanMode && (
                <Badge className={`${
                  isDeepAnalysis
                    ? "bg-purple-500/20 text-purple-300 border-purple-400/30"
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-400/30"
                } px-4 py-2 text-sm font-bold border-2`}>
                  {isDeepAnalysis ? (
                    <>
                      <Sparkles className="h-3 w-3 mr-1.5 inline" />
                      Deep Analysis
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1.5 inline" />
                      Quick Scan
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>

          {/* AI Analysis Progress Indicator */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 p-6 bg-white/5 rounded-xl border-2 border-indigo-500/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
                <span className="text-lg font-semibold text-white">
                  AI Analysis in Progress
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-white/70">
                  <span>Analyzing job posting...</span>
                  <span className="text-indigo-400 font-medium">Processing</span>
                </div>

                <Progress value={65} className="h-2.5" />

                <div className="flex items-center justify-between text-xs text-white/50">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                    <span>Detecting scams, ghost jobs, and red flags</span>
                  </div>
                  <span>~30 seconds</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Legitimacy Score */}
          {!isAnalyzing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-indigo-400" />
                  <span className="text-lg font-semibold text-white">
                    Legitimacy Score
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-5xl font-bold ${
                      risk.level === "low"
                        ? "text-green-400"
                        : risk.level === "medium"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {report.confidenceScore}
                  </span>
                  <span className="text-2xl text-white/50">/100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-4 bg-white/10 rounded-full overflow-hidden border border-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${report.confidenceScore}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full ${
                    risk.level === "low"
                      ? "bg-gradient-to-r from-green-400 to-emerald-400"
                      : risk.level === "medium"
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                      : "bg-gradient-to-r from-red-400 to-pink-400"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/60">
                <span>High Risk</span>
                <span className="font-medium text-white/80">{risk.label}</span>
                <span>Low Risk</span>
              </div>
            </div>
          )}

          {/* Detection Status (only if fields exist) */}
          {!isAnalyzing && (isScam !== undefined || isSpam !== undefined || isGhostJob !== undefined) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className={`border-2 ${
                  isScam
                    ? "bg-red-500/20 border-red-400/50"
                    : "bg-green-500/10 border-green-400/30"
                }`}
              >
                <CardContent className="p-5 flex items-center gap-3">
                  {isScam ? (
                    <XCircle className="h-6 w-6 text-white" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  )}
                  <div>
                    <div className="font-bold text-white">Scam Detection</div>
                    <div className="text-sm text-white/80">
                      {isScam ? "Warning signs detected" : "No red flags"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`border-2 ${
                  isSpam
                    ? "bg-amber-500/20 border-amber-400/50"
                    : "bg-green-500/10 border-green-400/30"
                }`}
              >
                <CardContent className="p-5 flex items-center gap-3">
                  {isSpam ? (
                    <Mail className="h-6 w-6 text-white" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  )}
                  <div>
                    <div className="font-bold text-white">Spam Check</div>
                    <div className="text-sm text-white/80">
                      {isSpam ? "Spam detected" : "Not spam"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`border-2 ${
                  isGhostJob
                    ? "bg-violet-500/20 border-violet-400/50"
                    : "bg-green-500/10 border-green-400/30"
                }`}
              >
                <CardContent className="p-5 flex items-center gap-3">
                  {isGhostJob ? (
                    <Ghost className="h-6 w-6 text-white" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  )}
                  <div>
                    <div className="font-bold text-white">Ghost Buster</div>
                    <div className="text-sm text-white/80">
                      {isGhostJob ? "May not be active" : "Appears legitimate"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-5 flex items-start gap-3">
              <Eye className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Summary</h3>
                <p className="text-white/70 leading-relaxed">{report.summary}</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Red Flags Section (only if available) */}
      {!isAnalyzing && hasRedFlags && report.redFlags && report.redFlags.length > 0 && (
        <Card className="border-2 border-red-400/30 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-pink-500/10 to-transparent" />

          <CardContent className="relative p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 border border-red-400/30">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-300 to-pink-300 bg-clip-text text-transparent">
                  Red Flags Detected
                </h2>
              </div>
              <Badge className="bg-red-500/20 text-red-300 border-red-400/30 px-3 py-1">
                {report.redFlags.length}{" "}
                {report.redFlags.length === 1 ? "flag" : "flags"}
              </Badge>
            </div>

            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {report.redFlags.map((flag: any, index: number) => (
                <Card
                  key={index}
                  className={`border-2 ${
                    flag.severity === "high"
                      ? "bg-red-500/20 border-red-400/50"
                      : flag.severity === "medium"
                      ? "bg-orange-500/20 border-orange-400/50"
                      : "bg-yellow-500/20 border-yellow-400/50"
                  }`}
                >
                  <CardContent className="p-5 flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-lg text-white">
                          {flag.type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                        <Badge
                          className={`text-xs font-bold ${
                            flag.severity === "high"
                              ? "bg-red-600/50 text-white border-red-500"
                              : flag.severity === "medium"
                              ? "bg-orange-600/50 text-white border-orange-500"
                              : "bg-yellow-600/50 text-white border-yellow-500"
                          }`}
                        >
                          {flag.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-white/90 leading-relaxed">
                        {flag.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Web Research Section (only if available) */}
      {!isAnalyzing && hasWebResearch && (
        <Card className="border-2 border-blue-400/30 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent" />

          <CardContent className="relative p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30">
                <Search className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Web Research Validation
                </h2>
                <p className="text-white/60 text-sm">
                  Cross-referenced from multiple sources
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {webResearchData && [
                {
                  icon: Globe,
                  label: "Company Website",
                  found: webResearchData.companyWebsiteFound,
                  foundText: "Official website verified",
                  notFoundText: "No official website found",
                },
                {
                  icon: FileText,
                  label: "Careers Page",
                  found: webResearchData.careersPageFound,
                  foundText: "Listed on careers page",
                  notFoundText: "Not on official careers page",
                },
                {
                  icon: Search,
                  label: "Duplicate Postings",
                  found: webResearchData.duplicatePostingsCount <= 5,
                  foundText: `${webResearchData.duplicatePostingsCount} similar postings`,
                  notFoundText: `${webResearchData.duplicatePostingsCount} duplicates found`,
                  warning: webResearchData.duplicatePostingsCount > 5,
                },
                {
                  icon: Shield,
                  label: "Official Verification",
                  found: webResearchData.verifiedOnOfficialSite,
                  foundText: "Verified on company site",
                  notFoundText: "Could not verify officially",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={index}
                    className={`border-2 ${
                      item.found && !item.warning
                        ? "bg-green-500/20 border-green-400/30"
                        : item.warning
                        ? "bg-orange-500/20 border-orange-400/30"
                        : "bg-red-500/20 border-red-400/30"
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-5 w-5 text-white" />
                        <span className="font-semibold text-white">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-sm text-white/80">
                        {item.found ? item.foundText : item.notFoundText}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {!isAnalyzing && (
        <Card className="border-2 border-purple-400/30 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent" />

          <CardContent className="relative p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/30">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  AI Analysis
                </h2>
                <p className="text-white/60 text-sm">
                  Detailed insights and recommendations
                </p>
              </div>
            </div>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <p className="text-white/80 leading-relaxed whitespace-pre-line">
                  {report.aiAnalysis}
                </p>
              </CardContent>
            </Card>

            {/* Key Qualifications */}
            {report.keyQualifications &&
              report.keyQualifications.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">
                    Key Qualifications
                  </h3>
                  <ul className="space-y-2">
                    {report.keyQualifications.map((qual: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-white/70"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{qual}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Responsibilities */}
            {report.responsibilities && report.responsibilities.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">
                  Responsibilities
                </h3>
                <ul className="space-y-2">
                  {report.responsibilities.map((resp: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-white/70"
                    >
                      <FileText className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
