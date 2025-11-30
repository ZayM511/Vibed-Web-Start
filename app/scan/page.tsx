"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ManualScanForm } from "@/components/manual-scan/ManualScanForm";
import { ScanResults } from "@/components/manual-scan/ScanResults";
import { ScanHistory } from "@/components/manual-scan/ScanHistory";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ElegantBackground } from "@/components/ElegantBackground";
import { useScanUsage } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import Link from "next/link";

interface ScanReport {
  jobTitle: string;
  company: string;
  location?: string;
  summary: string;
  keyQualifications: string[];
  responsibilities: string[];
  redFlags: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  confidenceScore: number;
  isScam: boolean;
  isGhostJob: boolean;
  aiAnalysis: string;
}

export default function ScanPage() {
  const [currentScanId, setCurrentScanId] = useState<Id<"jobScans"> | null>(null);
  const [currentReport, setCurrentReport] = useState<ScanReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedHistoryScanId, setSelectedHistoryScanId] = useState<Id<"jobScans"> | null>(null);

  // Convex hooks
  const scrapeAndAnalyze = useAction(api.scans.actions.scrapeAndAnalyzeAction);
  const requestDeeperReport = useAction(api.scans.actions.requestDeeperReportAction);
  const deleteScan = useMutation(api.scans.mutations.deleteScanResultMutation);
  const scanHistory = useQuery(api.scans.queries.getScanHistoryQuery);
  const scanById = useQuery(
    api.scans.queries.getScanResultByIdQuery,
    selectedHistoryScanId ? { scanId: selectedHistoryScanId } : "skip"
  );

  // Scan usage tracking
  const { isLimitReached, scansRemaining, isPro, isUnlimited } = useScanUsage();

  const handleScan = async (data: { jobInput: string; context?: string }) => {
    // Check scan limit for free users
    if (isLimitReached && !isPro) {
      toast.error("You've reached your free scan limit. Upgrade to Pro for unlimited scans!");
      return;
    }

    setIsScanning(true);
    setCurrentReport(null);
    setCurrentScanId(null);
    setSelectedHistoryScanId(null);

    try {
      const result = await scrapeAndAnalyze({
        jobInput: data.jobInput,
        context: data.context,
      });

      setCurrentScanId(result.scanId);
      setCurrentReport(result.report);

      // Show remaining scans for free users
      if (!isPro && scansRemaining > 0) {
        toast.success(`Job analyzed! You have ${scansRemaining - 1} scan${scansRemaining - 1 !== 1 ? 's' : ''} remaining.`);
      } else if (!isPro && scansRemaining === 1) {
        toast.success("Job analyzed! This was your last free scan. Upgrade to Pro for unlimited scans!");
      } else {
        toast.success("Job posting analyzed successfully!");
      }

      // Scroll to results
      setTimeout(() => {
        document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Scan failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze job posting");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRequestDeeper = async (email: string) => {
    if (!currentScanId) return;

    try {
      const result = await requestDeeperReport({
        scanId: currentScanId,
        userEmail: email,
      });
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to request deeper report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to request report");
    }
  };

  const handleViewHistoryDetails = (scanId: Id<"jobScans">) => {
    setSelectedHistoryScanId(scanId);
    setCurrentReport(null);
    setCurrentScanId(null);

    // Scroll to results
    setTimeout(() => {
      document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDeleteScan = async (scanId: Id<"jobScans">) => {
    try {
      await deleteScan({ scanId });
      toast.success("Scan deleted successfully");

      // Clear current view if we're deleting the currently viewed scan
      if (scanId === selectedHistoryScanId) {
        setSelectedHistoryScanId(null);
      }
      if (scanId === currentScanId) {
        setCurrentScanId(null);
        setCurrentReport(null);
      }
    } catch (error) {
      console.error("Failed to delete scan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete scan");
    }
  };

  // When viewing a historical scan, use its data
  const displayReport = scanById ? scanById.report : currentReport;
  const displayScanId = selectedHistoryScanId || currentScanId;

  return (
    <ElegantBackground>
      <div className="container max-w-5xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Manual Job Scan</h1>
        <p className="text-muted-foreground">
          Analyze job postings for red flags, scams, and ghost jobs using AI-powered analysis
        </p>
      </div>

      {/* Scan Limit Banner for Free Users */}
      {!isPro && (
        <div className={`p-4 rounded-lg border ${
          isLimitReached
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : scansRemaining === 1
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              {isLimitReached ? (
                <p className="font-semibold">Free scan limit reached (3/3 scans used)</p>
              ) : isUnlimited ? (
                <p className="font-semibold">Unlimited scans available</p>
              ) : (
                <p className="font-semibold">
                  {scansRemaining} free scan{scansRemaining !== 1 ? 's' : ''} remaining ({3 - scansRemaining}/3 used)
                </p>
              )}
            </div>
            <Link href="/pricing">
              <Button size="sm" className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Separator />

      {/* Scan Form - Disabled if limit reached */}
      {isLimitReached && !isPro ? (
        <div className="p-8 rounded-lg border border-red-500/30 bg-red-500/5 text-center space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-red-400">Free Scan Limit Reached</h3>
            <p className="text-muted-foreground">
              You've used all 3 free scans. Upgrade to Pro for unlimited scans and access to all features.
            </p>
          </div>
          <Link href="/pricing">
            <Button size="lg" className="gap-2">
              <Crown className="h-5 w-5" />
              Upgrade to Pro - $3.99/month
            </Button>
          </Link>
        </div>
      ) : (
        <ManualScanForm onScan={handleScan} isScanning={isScanning} />
      )}

      {/* Results Section */}
      {displayReport && (
        <div id="scan-results" className="scroll-mt-8">
          <ScanResults
            report={displayReport}
            scanId={displayScanId || undefined}
            onRequestDeeper={handleRequestDeeper}
          />
        </div>
      )}

      {/* History Section */}
      {scanHistory && scanHistory.length > 0 && (
        <>
          <Separator />
          <ScanHistory
            scans={scanHistory}
            onViewDetails={handleViewHistoryDetails}
            onDelete={handleDeleteScan}
          />
        </>
      )}
      </div>
    </ElegantBackground>
  );
}
