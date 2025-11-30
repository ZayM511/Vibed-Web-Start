"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  FileText,
  Loader2,
  Shield,
  AlertCircle,
  Search,
  Sparkles,
  TrendingUp,
  Globe,
  Eye,
  Download,
  Share2,
} from "lucide-react";
import { useState } from "react";

interface EnhancedUnifiedScanResultsProps {
  scanId: Id<"jobScans">;
  scanType: "manual" | "ghost";
  onRequestDeeper?: (email: string) => Promise<void>;
}

export function EnhancedUnifiedScanResults({
  scanId,
  scanType,
  onRequestDeeper,
}: EnhancedUnifiedScanResultsProps) {
  const [expandedFlag, setExpandedFlag] = useState<number | null>(null);

  // Query based on scan type
  const ghostScan = useQuery(
    api.jobScans.getJobScanById,
    scanType === "ghost" ? { jobScanId: scanId } : "skip"
  );
  const manualScan = useQuery(
    api.scans.queries.getScanResultByIdQuery,
    scanType === "manual" ? { scanId } : "skip"
  );

  const scan = scanType === "ghost" ? ghostScan : manualScan;

  if (!scan) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-16"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />
        <div className="relative flex flex-col items-center justify-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-16 w-16 text-indigo-400" />
          </motion.div>
          <p className="text-white/70 text-lg">Loading scan results...</p>
        </div>
      </motion.div>
    );
  }

  const { report } = scan;
  const isAnalyzing =
    report.jobTitle === "Analyzing..." || report.aiAnalysis === "Analysis pending...";

  const getConfidenceData = (score: number) => {
    if (score >= 75) {
      return {
        color: "text-green-400",
        gradient: "from-green-400 to-emerald-400",
        bgGradient: "from-green-500/20 to-emerald-500/10",
        label: "Low Risk",
      };
    }
    if (score >= 50) {
      return {
        color: "text-yellow-400",
        gradient: "from-yellow-400 to-orange-400",
        bgGradient: "from-yellow-500/20 to-orange-500/10",
        label: "Medium Risk",
      };
    }
    return {
      color: "text-red-400",
      gradient: "from-red-400 to-pink-400",
      bgGradient: "from-red-500/20 to-pink-500/10",
      label: "High Risk",
    };
  };

  const confidenceData = getConfidenceData(report.confidenceScore);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Job Posting Header */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${
          report.isScam
            ? "from-red-500/20 via-pink-500/10 to-transparent"
            : report.isGhostJob
            ? "from-orange-500/20 via-yellow-500/10 to-transparent"
            : report.isSpam
            ? "from-purple-500/20 via-fuchsia-500/10 to-transparent"
            : "from-green-500/20 via-emerald-500/10 to-transparent"
        }`} />

        <div className="relative p-8 space-y-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              {/* Status Icon */}
              <motion.div
                animate={
                  isAnalyzing ? { rotate: 360 } : {}
                }
                transition={
                  isAnalyzing
                    ? { duration: 2, repeat: Infinity, ease: "linear" }
                    : {}
                }
                className={`flex-shrink-0 p-3 rounded-xl ${
                  report.isScam
                    ? "bg-red-500/20 border border-red-400/30"
                    : report.isGhostJob
                    ? "bg-orange-500/20 border border-orange-400/30"
                    : report.isSpam
                    ? "bg-purple-500/20 border border-purple-400/30"
                    : "bg-green-500/20 border border-green-400/30"
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-8 w-8 text-blue-400" />
                ) : report.isScam ? (
                  <XCircle className="h-8 w-8 text-red-400" />
                ) : report.isGhostJob ? (
                  <AlertTriangle className="h-8 w-8 text-orange-400" />
                ) : report.isSpam ? (
                  <AlertCircle className="h-8 w-8 text-purple-400" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                )}
              </motion.div>

              {/* Title and Company */}
              <div className="flex-1 space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent leading-tight">
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
            </div>

            {/* Status Badge */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0"
            >
              <Badge
                className={`px-4 py-2 text-sm font-bold ${
                  isAnalyzing
                    ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                    : report.isScam
                    ? "bg-red-500/20 text-red-300 border-red-400/30"
                    : report.isGhostJob
                    ? "bg-orange-500/20 text-orange-300 border-orange-400/30"
                    : report.isSpam
                    ? "bg-purple-500/20 text-purple-300 border-purple-400/30"
                    : "bg-green-500/20 text-green-300 border-green-400/30"
                }`}
              >
                {isAnalyzing
                  ? "Analyzing..."
                  : report.isScam
                  ? "Likely Scam"
                  : report.isGhostJob
                  ? "Ghost Job"
                  : report.isSpam
                  ? "Spam Likely"
                  : "Verified"}
              </Badge>
            </motion.div>
          </div>

          {/* Legitimacy Score */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Shield className="h-5 w-5 text-indigo-400" />
                </motion.div>
                <span className="text-lg font-semibold text-white">Legitimacy Score</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${confidenceData.color}`}>
                  {report.confidenceScore}
                </span>
                <span className="text-2xl text-white/50">/100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${report.confidenceScore}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${confidenceData.gradient} relative`}
              >
                {/* Shine effect */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                />
              </motion.div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                High Risk
              </span>
              <span className="font-medium text-white/80">{confidenceData.label}</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Low Risk
              </span>
            </div>
          </div>

          {/* Detection Grid */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`relative overflow-hidden p-5 rounded-xl backdrop-blur-sm border-2 ${
                report.isScam
                  ? "bg-red-500/30 border-red-400/50"
                  : "bg-green-500/10 border-green-400/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {report.isScam ? (
                  <XCircle className="h-6 w-6 text-white" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                )}
                <div>
                  <div className="font-bold text-white">Scam Detection</div>
                  <div className="text-sm text-white/80">
                    {report.isScam ? "Warning signs detected" : "No red flags"}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`relative overflow-hidden p-5 rounded-xl backdrop-blur-sm border-2 ${
                report.isGhostJob
                  ? "bg-orange-500/30 border-orange-400/50"
                  : "bg-green-500/10 border-green-400/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {report.isGhostJob ? (
                  <AlertTriangle className="h-6 w-6 text-white" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                )}
                <div>
                  <div className="font-bold text-white">Ghost Job Check</div>
                  <div className="text-sm text-white/80">
                    {report.isGhostJob ? "May not be active" : "Appears legitimate"}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className={`relative overflow-hidden p-5 rounded-xl backdrop-blur-sm border-2 ${
                report.isSpam
                  ? "bg-purple-500/30 border-purple-400/50"
                  : "bg-green-500/10 border-green-400/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {report.isSpam ? (
                  <AlertCircle className="h-6 w-6 text-white" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                )}
                <div>
                  <div className="font-bold text-white">Spam Check</div>
                  <div className="text-sm text-white/80">
                    {report.isSpam ? "Spam indicators found" : "Not spam"}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Spam Reasoning Alert (if spam detected) */}
          {report.isSpam && report.spamReasoning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-purple-500/10 backdrop-blur-sm border-2 border-purple-400/30"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-purple-300">Why This Was Flagged as Spam</h3>
                  <p className="text-white/80 leading-relaxed">{report.spamReasoning}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Summary */}
          <div className="p-5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Summary</h3>
                <p className="text-white/70 leading-relaxed">{report.summary}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Red Flags Section */}
      {report.redFlags.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-red-400/30"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-pink-500/10 to-transparent" />

          <div className="relative p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                  className="p-2 rounded-lg bg-red-500/20 border border-red-400/30"
                >
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </motion.div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-300 to-pink-300 bg-clip-text text-transparent">
                  Top Red Flags Detected
                </h2>
              </div>
              <Badge className="bg-red-500/20 text-red-300 border-red-400/30 px-3 py-1">
                {report.redFlags.length} {report.redFlags.length === 1 ? "flag" : "flags"}
              </Badge>
            </div>

            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {report.redFlags.map((flag, index) => {
                  const isExpanded = expandedFlag === index;
                  return (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setExpandedFlag(isExpanded ? null : index)}
                      className={`relative overflow-hidden cursor-pointer p-5 rounded-xl backdrop-blur-sm border-2 transition-all ${
                        flag.severity === "high"
                          ? "bg-red-500/30 border-red-400/50 hover:border-red-400"
                          : flag.severity === "medium"
                          ? "bg-orange-500/30 border-orange-400/50 hover:border-orange-400"
                          : "bg-yellow-500/30 border-yellow-400/50 hover:border-yellow-400"
                      }`}
                    >
                      {flag.severity === "high" && (
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-red-400/10"
                        />
                      )}

                      <div className="relative flex items-start gap-4">
                        <motion.div
                          animate={
                            flag.severity === "high" ? { scale: [1, 1.1, 1] } : {}
                          }
                          transition={
                            flag.severity === "high"
                              ? { duration: 2, repeat: Infinity }
                              : {}
                          }
                        >
                          <AlertCircle className="h-6 w-6 text-white flex-shrink-0 mt-0.5" />
                        </motion.div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-lg text-white">
                              {flag.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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
                          <p className="text-white/90 leading-relaxed">{flag.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Web Research Validation */}
      {!isAnalyzing && report.webResearch && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-blue-400/30"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent" />

          <div className="relative p-8 space-y-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30"
              >
                <Search className="h-6 w-6 text-blue-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Web Research Validation
                </h2>
                <p className="text-white/60 text-sm">Cross-referenced from multiple sources</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: Globe,
                  label: "Company Website",
                  found: report.webResearch.companyWebsiteFound,
                  foundText: "Official website verified",
                  notFoundText: "No official website found",
                },
                {
                  icon: FileText,
                  label: "Careers Page",
                  found: report.webResearch.careersPageFound,
                  foundText: "Listed on careers page",
                  notFoundText: "Not on official careers page",
                },
                {
                  icon: Search,
                  label: "Duplicate Postings",
                  found: report.webResearch.duplicatePostingsCount <= 5,
                  foundText: `${report.webResearch.duplicatePostingsCount} similar postings`,
                  notFoundText: `${report.webResearch.duplicatePostingsCount} duplicates found`,
                  warning: report.webResearch.duplicatePostingsCount > 5,
                },
                {
                  icon: Shield,
                  label: "Official Verification",
                  found: report.webResearch.verifiedOnOfficialSite,
                  foundText: "Verified on company site",
                  notFoundText: "Could not verify officially",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`p-5 rounded-xl backdrop-blur-sm border-2 ${
                      item.found && !item.warning
                        ? "bg-green-500/20 border-green-400/30"
                        : item.warning
                        ? "bg-orange-500/20 border-orange-400/30"
                        : "bg-red-500/20 border-red-400/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-white" />
                      <span className="font-semibold text-white">{item.label}</span>
                    </div>
                    <p className="text-sm text-white/80">
                      {item.found ? item.foundText : item.notFoundText}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {report.webResearch.reputationSources.length > 0 && (
              <div className="p-5 rounded-xl bg-purple-500/20 border-2 border-purple-400/30 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-2">Reputation Sources Found</h4>
                    <ul className="space-y-1 text-sm text-white/80">
                      {report.webResearch.reputationSources.slice(0, 3).map((source, i) => (
                        <li key={i} className="truncate">• {source}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* AI Analysis */}
      {!isAnalyzing && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 border border-purple-400/30"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent" />

          <div className="relative p-8 space-y-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/30"
              >
                <Sparkles className="h-6 w-6 text-purple-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  AI Analysis
                </h2>
                <p className="text-white/60 text-sm">Detailed insights and recommendations</p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <p className="text-white/80 leading-relaxed whitespace-pre-line">
                {report.aiAnalysis}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-12 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-12 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm text-white"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Analysis
                </Button>
              </motion.div>

              {onRequestDeeper && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                  <Button
                    onClick={() => {
                      const email = prompt("Enter your email for detailed report:");
                      if (email) {
                        onRequestDeeper(email);
                      }
                    }}
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 text-white font-semibold"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Get Detailed Report
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
